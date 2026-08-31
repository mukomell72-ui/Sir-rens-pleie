import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "ByIvan_bot";
const TOKEN = Deno.env.get("USERNAME_SCANNER_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/username-scanner-bot`;

const keyboard = {
  keyboard: [
    [{ text: "⚡ Найти 15 доступных" }, { text: "➡️ Следующие 15" }],
    [{ text: "💎 ТОП по цене" }, { text: "🔍 Проверить username" }],
    [{ text: "📊 Статистика" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  return await r.json();
}

async function send(chatId: number, text: string, replyMarkup: unknown = keyboard) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    disable_web_page_preview: true
  });
}

function normalizeUsername(input: string) {
  return input.trim().replace(/^@/, "").toLowerCase();
}

const V = ["a","e","i","o","u","y"];
const C = ["b","c","d","f","g","h","k","l","m","n","p","r","s","t","v","w","x","z"];
const SOFT = ["b","d","f","g","k","l","m","n","p","r","s","t","v"];
const END = ["n","r","s","t","l","m","x","z","k","v"];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function makeName() {
  const len = 5 + Math.floor(Math.random() * 8); // 5..12
  let out = "";
  const mode = Math.floor(Math.random() * 5);

  while (out.length < len) {
    if (mode === 0) out += `${pick(SOFT)}${pick(V)}`;
    else if (mode === 1) out += `${pick(SOFT)}${pick(V)}${pick(END)}`;
    else if (mode === 2) out += `${pick(V)}${pick(SOFT)}`;
    else if (mode === 3) out += `${pick(SOFT)}${pick(V)}${pick(C)}`;
    else out += `${pick(SOFT)}${pick(V)}${pick(SOFT)}${pick(V)}`;
  }

  out = out.slice(0, len);
  if (!/^[a-z]/.test(out)) out = `a${out.slice(1)}`;
  if (/([a-z])\1\1/.test(out)) return makeName();
  return out;
}

function scoreUsername(u: string) {
  let score = 35;
  const len = u.length;
  const vowels = (u.match(/[aeiouy]/g) ?? []).length;
  const unique = new Set(u).size;

  if (len === 5) score += 38;
  else if (len === 6) score += 28;
  else if (len === 7) score += 20;
  else if (len === 8) score += 13;
  else if (len === 9) score += 8;
  else if (len === 10) score += 5;
  else score += 2;

  if (vowels >= 2 && vowels <= Math.ceil(len / 2) + 1) score += 10;
  if (unique >= Math.min(5, len - 1)) score += 8;
  if (!/[qjx]{2,}/.test(u)) score += 5;
  if (/([a-z])\1\1/.test(u)) score -= 18;
  return Math.max(1, Math.min(99, score));
}

function estimate(u: string, score: number) {
  const len = u.length;
  if (len === 5 && score >= 85) return [300, 2500];
  if (len === 5) return [100, 700];
  if (len === 6 && score >= 75) return [80, 600];
  if (len === 6) return [30, 250];
  if (len === 7) return [20, 180];
  if (len === 8) return [10, 120];
  return [5, 80];
}

async function fetchTelegramPage(base: string, username: string) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const r = await fetch(`${base}/${username}`, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; UsernameHunter/3.0)" }
    });
    clearTimeout(timer);
    if (r.status === 429) return { ok: false, rate: true, html: "" };
    const html = await r.text();
    return { ok: r.ok, rate: false, html };
  } catch {
    return { ok: false, rate: false, html: "" };
  }
}

function hasRealProfileMarkers(html: string) {
  const h = html.toLowerCase();
  // Важно: строки "If you have Telegram...", "Send Message" и
  // "View in Telegram" встречаются и на пустых страницах, поэтому их
  // нельзя считать признаком занятого username.
  return (
    h.includes("tgme_page_photo_image") ||
    h.includes("tgme_page_description") ||
    h.includes("tgme_page_extra") ||
    h.includes("tgme_channel_info") ||
    h.includes("tgme_widget_message") ||
    h.includes("preview channel") ||
    h.includes("subscribers") ||
    h.includes("monthly users") ||
    h.includes("start bot")
  );
}

async function preliminaryAvailability(username: string) {
  // Bot API точно отсекает публичные каналы/супергруппы с таким username.
  try {
    const chat = await tg("getChat", { chat_id: `@${username}` });
    if (chat?.ok) return "occupied";
  } catch {}

  const [a, b] = await Promise.all([
    fetchTelegramPage("https://t.me", username),
    fetchTelegramPage("https://telegram.me", username)
  ]);

  if (hasRealProfileMarkers(a.html) || hasRealProfileMarkers(b.html)) return "occupied";
  if ((a.ok || b.ok) && !a.rate && !b.rate) return "likely_free";
  if (a.rate || b.rate) return "unknown";
  return "unknown";
}

async function inspectOne(chatId: number, raw: string) {
  const u = normalizeUsername(raw);
  if (!/^[a-z][a-z0-9_]{4,31}$/.test(u)) {
    await send(chatId, "Нужен Telegram username длиной 5–32 символа: латинские буквы, цифры или _. Например: @nexora");
    return;
  }
  const score = scoreUsername(u);
  const [min, max] = estimate(u, score);
  const status = await preliminaryAvailability(u);
  const label = status === "likely_free" ? "🟢 по веб-проверке свободен" : status === "occupied" ? "🔴 занят" : "🟡 Telegram временно не дал точный статус";
  await send(chatId, `@${u}\n${label}\n⭐ ${score}/100\n💰 примерно $${min}–$${max}\n\n⚠️ Цена ориентировочная. Для 100% подтверждения нужен Telegram user-session (MTProto).`);
}

function buildPool(size: number) {
  const set = new Set<string>();
  for (let i = 0; i < size * 40 && set.size < size; i++) set.add(makeName());
  return [...set].map(username => {
    const score = scoreUsername(username);
    const [min, max] = estimate(username, score);
    return { username, score, min, max };
  }).sort((a, b) => b.score - a.score || a.username.length - b.username.length);
}

async function findAvailable(limit = 15) {
  const found: Array<any> = [];
  const backup: Array<any> = [];
  const seen = new Set<string>();

  for (let round = 0; round < 10 && found.length < limit; round++) {
    const pool = buildPool(70).filter(x => !seen.has(x.username));
    for (const x of pool) seen.add(x.username);

    for (let i = 0; i < pool.length && found.length < limit; i += 8) {
      const part = pool.slice(i, i + 8);
      const checked = await Promise.all(part.map(async x => ({ ...x, availability: await preliminaryAvailability(x.username) })));
      for (const x of checked) {
        if (x.availability === "likely_free") found.push(x);
        else if (x.availability === "unknown") backup.push(x);
        if (found.length >= limit) break;
      }
    }
  }

  found.sort((a, b) => b.score - a.score || a.username.length - b.username.length);
  backup.sort((a, b) => b.score - a.score || a.username.length - b.username.length);
  return { confirmed: found.slice(0, limit), backup: backup.slice(0, limit) };
}

async function send15(chatId: number) {
  await send(chatId, "⚡ Ищу 15 нормальных username. Проверяю длину 5–12 символов…");
  const { confirmed, backup } = await findAvailable(15);

  if (confirmed.length) {
    const list = confirmed.map((x, i) => `${i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
    await send(chatId, `🟢 Найдено ${confirmed.length} свободных по текущей проверке\n\n${list}\n\nНажми «➡️ Следующие 15» — получишь новую подборку.\n\n⚠️ Финальная 100% проверка возможна только через MTProto.`);
    return;
  }

  // Бот больше не отвечает пустым списком. Если Telegram ограничил веб-проверку,
  // показываем 15 лучших не занятых по явным признакам кандидатов и честно отмечаем статус.
  const rows = backup.length ? backup : buildPool(15);
  const list = rows.slice(0, 15).map((x, i) => `${i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
  await send(chatId, `🟡 Telegram ограничил точную веб-проверку. Вот 15 лучших новых кандидатов без подтверждённого совпадения:\n\n${list}\n\nНажми «➡️ Следующие 15» для новой пачки. Я не помечаю их как 100% свободные, пока Telegram это не подтвердит.`);
}

async function top15(chatId: number) {
  await send(chatId, "💎 Ищу самые сильные варианты…");
  const { confirmed, backup } = await findAvailable(30);
  const rows = (confirmed.length ? confirmed : backup).sort((a, b) => b.score - a.score || a.username.length - b.username.length).slice(0, 15);
  if (!rows.length) return send15(chatId);
  const list = rows.map((x, i) => `${i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
  await send(chatId, `💎 ТОП-15\n\n${list}\n\n⚠️ Стоимость ориентировочная.`);
}

Deno.serve(async (req: Request) => {
  if (!TOKEN) return new Response("USERNAME_SCANNER_BOT_TOKEN missing", { status: 500 });

  const url = new URL(req.url);
  if (url.searchParams.get("setup") === "1") {
    const me = await tg("getMe");
    if (!me?.ok || me?.result?.username !== EXPECTED_BOT) {
      return Response.json({ ok: false, error: "Wrong bot token" }, { status: 409 });
    }
    const secret = await sha256hex(`${TOKEN}:username-scanner-webhook`);
    const hook = await tg("setWebhook", { url: WEBHOOK_URL, secret_token: secret, drop_pending_updates: true });
    return Response.json({ ok: !!hook?.ok, bot: `@${EXPECTED_BOT}`, webhook: hook?.description ?? "set" });
  }

  const expectedSecret = await sha256hex(`${TOKEN}:username-scanner-webhook`);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) return new Response("forbidden", { status: 403 });

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || typeof msg?.text !== "string") return new Response("ok");

  const chatId = Number(msg.chat.id);
  const text = String(msg.text).trim();

  if (text === "/start") {
    await send(chatId, "💎 Username Hunter\n\nИщу нормальные Telegram username разной длины и выдаю по 15 за раз.\n\nНажми «⚡ Найти 15 доступных».");
  } else if (["⚡ Найти 15 доступных", "➡️ Следующие 15", "⚡ Автопоиск", "🔥 Дорогие доступные"].includes(text)) {
    await send15(chatId);
  } else if (text === "💎 ТОП по цене") {
    await top15(chatId);
  } else if (text === "🔍 Проверить username") {
    await send(chatId, "Отправь username длиной 5–32 символа, например @nexora", { force_reply: true, input_field_placeholder: "@nexora", selective: true });
  } else if (text === "📊 Статистика") {
    await send(chatId, "📊 За одно нажатие бот перебирает большие пачки username длиной 5–12 символов и старается собрать 15 свободных. Если Telegram ограничивает веб-проверку, бот всё равно показывает 15 новых кандидатов и честно помечает их как непроверенные.");
  } else if (msg?.reply_to_message?.text?.includes("Отправь username")) {
    await inspectOne(chatId, text);
  } else if (/^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(text)) {
    await inspectOne(chatId, text);
  } else {
    await send(chatId, "Нажми «⚡ Найти 15 доступных» или отправь любой Telegram username для проверки.");
  }

  return new Response("ok");
});
