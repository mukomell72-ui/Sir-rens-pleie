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
  const len = 5 + Math.floor(Math.random() * 6); // 5..10
  let out = "";
  const mode = Math.floor(Math.random() * 4);

  while (out.length < len) {
    if (mode === 0) out += `${pick(SOFT)}${pick(V)}`;
    else if (mode === 1) out += `${pick(SOFT)}${pick(V)}${pick(END)}`;
    else if (mode === 2) out += `${pick(V)}${pick(SOFT)}`;
    else out += `${pick(SOFT)}${pick(V)}${pick(C)}`;
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
  else score += 4;

  if (vowels >= 2 && vowels <= Math.ceil(len / 2)) score += 10;
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

async function preliminaryAvailability(username: string) {
  try {
    const r = await fetch(`https://t.me/${username}`, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; UsernameHunter/2.0)" }
    });
    if (r.status === 404) return "likely_free";
    if (r.status === 429) return "unknown";
    const html = await r.text();

    const occupied =
      html.includes("If you have Telegram, you can contact") ||
      html.includes("Send Message") ||
      html.includes("tgme_page_photo_image") ||
      html.includes("tgme_page_description") ||
      html.includes("tgme_page_extra") ||
      html.includes("tgme_channel_info") ||
      html.includes("tgme_widget_message") ||
      html.includes("Preview channel");

    return occupied ? "occupied" : "likely_free";
  } catch {
    return "unknown";
  }
}

async function inspectOne(chatId: number, raw: string) {
  const u = normalizeUsername(raw);
  if (!/^[a-z]{5,10}$/.test(u)) {
    await send(chatId, "Отправь username из 5–10 латинских букв. Например: @nexora");
    return;
  }
  const score = scoreUsername(u);
  const [min, max] = estimate(u, score);
  const status = await preliminaryAvailability(u);
  const label = status === "likely_free" ? "🟢 по веб-проверке свободен" : status === "occupied" ? "🔴 занят" : "🟡 точный статус не получен";
  await send(chatId, `@${u}\n${label}\n⭐ ${score}/100\n💰 примерно $${min}–$${max}\n\n⚠️ Цена ориентировочная. Для 100% подтверждения свободности нужен Telegram user-session (MTProto).`);
}

function buildPool(size: number) {
  const set = new Set<string>();
  for (let i = 0; i < size * 30 && set.size < size; i++) set.add(makeName());
  return [...set].map(username => {
    const score = scoreUsername(username);
    const [min, max] = estimate(username, score);
    return { username, score, min, max };
  });
}

async function findAvailable(limit = 15) {
  const found: Array<any> = [];
  const seen = new Set<string>();

  for (let round = 0; round < 8 && found.length < limit; round++) {
    const pool = buildPool(50).filter(x => !seen.has(x.username));
    for (const x of pool) seen.add(x.username);

    for (let i = 0; i < pool.length && found.length < limit; i += 10) {
      const part = pool.slice(i, i + 10);
      const checked = await Promise.all(part.map(async x => ({ ...x, availability: await preliminaryAvailability(x.username) })));
      for (const x of checked) {
        if (x.availability === "likely_free") found.push(x);
        if (found.length >= limit) break;
      }
    }
  }

  found.sort((a, b) => b.score - a.score || a.username.length - b.username.length);
  return found.slice(0, limit);
}

async function send15(chatId: number) {
  await send(chatId, "⚡ Ищу 15 нормальных свободных username длиной 5–10 букв…");
  const rows = await findAvailable(15);

  if (!rows.length) {
    await send(chatId, "Telegram Web сейчас не подтвердил ни одного варианта. Нажми «➡️ Следующие 15» — проверю новую большую пачку.");
    return;
  }

  const list = rows.map((x, i) => `${i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
  await send(chatId, `🟢 Найдено ${rows.length} вариантов\n\n${list}\n\nНажми «➡️ Следующие 15» — получишь следующую новую подборку.\n\n⚠️ Это свободные по текущей веб-проверке; 100% подтверждение возможно только через MTProto.`);
}

async function top15(chatId: number) {
  await send(chatId, "💎 Ищу самые ценные из доступных…");
  const rows = await findAvailable(30);
  rows.sort((a, b) => b.score - a.score || a.username.length - b.username.length);
  const top = rows.slice(0, 15);
  if (!top.length) return send(chatId, "Сейчас не удалось подтвердить доступные варианты. Попробуй ещё раз.");
  const list = top.map((x, i) => `${i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
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
    await send(chatId, "💎 Username Hunter\n\nТеперь ищу не только 5-буквенные. Проверяю нормальные username длиной 5–10 букв и выдаю по 15 за раз.\n\nНажми «⚡ Найти 15 доступных».");
  } else if (["⚡ Найти 15 доступных", "➡️ Следующие 15", "⚡ Автопоиск", "🔥 Дорогие доступные"].includes(text)) {
    await send15(chatId);
  } else if (text === "💎 ТОП по цене") {
    await top15(chatId);
  } else if (text === "🔍 Проверить username") {
    await send(chatId, "Отправь username из 5–10 латинских букв, например @nexora", { force_reply: true, input_field_placeholder: "@nexora", selective: true });
  } else if (text === "📊 Статистика") {
    await send(chatId, "📊 По одному нажатию бот перебирает большие пачки вариантов длиной 5–10 букв, пока не соберёт до 15 свободных по веб-проверке. «Следующие 15» запускает новую подборку.");
  } else if (msg?.reply_to_message?.text?.includes("Отправь username")) {
    await inspectOne(chatId, text);
  } else if (/^@?[a-zA-Z]{5,10}$/.test(text)) {
    await inspectOne(chatId, text);
  } else {
    await send(chatId, "Нажми «⚡ Найти 15 доступных» или отправь username из 5–10 латинских букв.");
  }

  return new Response("ok");
});
