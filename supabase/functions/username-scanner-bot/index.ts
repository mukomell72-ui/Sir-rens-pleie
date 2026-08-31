import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "ByIvan_bot";
const TOKEN = Deno.env.get("USERNAME_SCANNER_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = `https://api.telegram.org/bot${TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/username-scanner-bot`;

const keyboard = {
  keyboard: [
    [{ text: "🔥 Дорогие доступные" }, { text: "💎 ТОП по цене" }],
    [{ text: "🔍 Проверить username" }, { text: "⚡ Автопоиск" }],
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

function scoreUsername(u: string) {
  let score = 50;
  const vowels = new Set(["a", "e", "i", "o", "u", "y"]);
  const rare = new Set(["q", "x", "z", "j"]);
  const chars = [...u];
  const vc = chars.filter(c => vowels.has(c)).length;
  const rc = chars.filter(c => rare.has(c)).length;
  const unique = new Set(chars).size;

  if (/^[a-z]{5}$/.test(u)) score += 10;
  if (vc >= 1 && vc <= 3) score += 9;
  if (unique >= 4) score += 7;
  if (/^[^aeiouy][aeiouy][^aeiouy][aeiouy][^aeiouy]$/.test(u)) score += 12;
  if (/^[^aeiouy][aeiouy][^aeiouy][^aeiouy][aeiouy]$/.test(u)) score += 8;
  if (/([a-z])\1\1/.test(u)) score -= 14;
  if (/^[qxzj]{2}/.test(u) || rc >= 3) score -= 12;
  if (/^(.)\1{4}$/.test(u)) score -= 20;
  if ([...u].reverse().join("") === u) score += 5;
  if (!/[qjx]{2,}/.test(u)) score += 4;
  return Math.max(1, Math.min(99, score));
}

function estimate(score: number) {
  if (score >= 95) return [2500, 8000];
  if (score >= 90) return [1000, 4000];
  if (score >= 85) return [400, 1500];
  if (score >= 80) return [150, 600];
  if (score >= 70) return [50, 250];
  return [10, 100];
}

function reasonFor(u: string, score: number) {
  const parts = ["5 букв"];
  const v = (u.match(/[aeiouy]/g) ?? []).length;
  if (v >= 1 && v <= 3) parts.push("произносимый");
  if (new Set(u).size >= 4) parts.push("мало повторов");
  if (/^[^aeiouy][aeiouy][^aeiouy][aeiouy][^aeiouy]$/.test(u)) parts.push("CVCVC");
  if (score >= 90) parts.push("брендовый");
  return parts.join(", ");
}

const onset = ["b","c","d","f","g","h","k","l","m","n","p","r","s","t","v","w"];
const vowels = ["a","e","i","o","u","y"];
const coda = ["b","c","d","f","g","k","l","m","n","p","r","s","t","v","x","z"];

function generateCandidates(limit = 60) {
  const out = new Set<string>();
  const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < limit * 30 && out.size < limit; i++) {
    const p = Math.floor(Math.random() * 4);
    let u = "";
    if (p === 0) u = `${pick(onset)}${pick(vowels)}${pick(coda)}${pick(vowels)}${pick(coda)}`;
    else if (p === 1) u = `${pick(onset)}${pick(vowels)}${pick(coda)}${pick(coda)}${pick(vowels)}`;
    else if (p === 2) u = `${pick(onset)}${pick(vowels)}${pick(onset)}${pick(vowels)}${pick(onset)}`;
    else u = `${pick(onset)}${pick(vowels)}${pick(coda)}${pick(onset)}${pick(vowels)}`;
    out.add(u);
  }
  return [...out].map(username => {
    const score = scoreUsername(username);
    const [min, max] = estimate(score);
    return { username, score, min, max, reason: reasonFor(username, score) };
  }).sort((a, b) => b.score - a.score);
}

async function preliminaryAvailability(username: string) {
  try {
    const r = await fetch(`https://t.me/${username}`, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; UsernameHunter/1.0)" }
    });
    if (r.status === 404) return "likely_free";
    if (r.status === 429) return "unknown";
    const html = await r.text();

    // Старый код считал любой tgme_page_title признаком занятости,
    // из-за чего почти вся выборка отбрасывалась. Теперь исключаем только
    // страницы с сильными признаками существующего профиля/канала/бота.
    const strongOccupied =
      html.includes("tgme_page_photo_image") ||
      html.includes("tgme_page_description") ||
      html.includes("tgme_page_extra") ||
      html.includes("tgme_channel_info") ||
      html.includes("tgme_widget_message") ||
      html.includes("Preview channel") ||
      html.includes("View in Telegram");

    return strongOccupied ? "occupied" : "likely_free";
  } catch {
    return "unknown";
  }
}

function labelAvailability(a: string) {
  if (a === "likely_free") return "🟢 предварительно свободен";
  if (a === "occupied") return "🔴 занят";
  return "🟡 нужна точная проверка";
}

async function inspectOne(chatId: number, raw: string) {
  const u = normalizeUsername(raw);
  if (!/^[a-z]{5}$/.test(u)) {
    await send(chatId, "Нужен username ровно из 5 латинских букв. Например: @nexor");
    return;
  }
  const score = scoreUsername(u);
  const [min, max] = estimate(score);
  const availability = await preliminaryAvailability(u);
  await send(chatId,
    `@${u}\n${labelAvailability(availability)}\n⭐ ${score}/100\n💰 ~$${min.toLocaleString("en-US")}–$${max.toLocaleString("en-US")}\n${reasonFor(u, score)}\n\n⚠️ Цена ориентировочная. Точная свободность возможна только через Telegram user-session (MTProto).`
  );
}

async function checkBatch<T extends {username:string}>(items: T[], concurrency = 10) {
  const result: Array<T & {availability:string}> = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const part = items.slice(i, i + concurrency);
    const checked = await Promise.all(part.map(async c => ({ ...c, availability: await preliminaryAvailability(c.username) })));
    result.push(...checked);
  }
  return result;
}

async function sendRows(chatId: number, title: string, rows: Array<any>, exactNote = true) {
  if (!rows.length) {
    await send(chatId, "В этой проверке подходящих вариантов не найдено. Нажми «⚡ Автопоиск» ещё раз — будет новая пачка.");
    return;
  }

  const chunks: Array<any[]> = [];
  for (let i = 0; i < rows.length; i += 10) chunks.push(rows.slice(i, i + 10));
  for (let c = 0; c < chunks.length; c++) {
    const list = chunks[c].map((x, i) => `${c * 10 + i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
    const note = exactNote ? "\n\n⚠️ Это предварительно свободные варианты. Точную проверку Telegram даёт только через user-session (MTProto)." : "";
    await send(chatId, `${c === 0 ? title + "\n\n" : ""}${list}${note}`);
  }
}

async function scan(chatId: number, mode: "free" | "top" | "auto") {
  await send(chatId, "⚡ Ищу 5-буквенные варианты…");

  const poolSize = mode === "auto" ? 60 : 40;
  const candidates = generateCandidates(poolSize).filter(x => x.score >= 78);
  const checked = await checkBatch(candidates, 10);
  checked.sort((a, b) => b.score - a.score);

  if (mode === "top") {
    await sendRows(chatId, "💎 ТОП по потенциальной цене", checked.slice(0, 20), false);
    return;
  }

  let free = checked.filter(x => x.availability === "likely_free");

  // Автопоиск не должен молчать: если Telegram Web не дал уверенного ответа,
  // показываем лучшие непроверенные отдельно, а не пустой результат.
  if (!free.length) {
    const unknown = checked.filter(x => x.availability === "unknown").slice(0, 15);
    if (unknown.length) {
      await sendRows(chatId, "🟡 Telegram Web не подтвердил свободность. Вот лучшие варианты для точной проверки:", unknown, true);
      return;
    }
  }

  free = free.slice(0, mode === "auto" ? 30 : 20);
  await sendRows(
    chatId,
    mode === "auto" ? `⚡ Автопоиск: найдено ${free.length} предварительно свободных` : `🔥 Найдено ${free.length} предварительно свободных`,
    free,
    true
  );
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
    const hook = await tg("setWebhook", {
      url: WEBHOOK_URL,
      secret_token: secret,
      drop_pending_updates: true
    });
    return Response.json({ ok: !!hook?.ok, bot: `@${EXPECTED_BOT}`, webhook: hook?.description ?? "set" });
  }

  const expectedSecret = await sha256hex(`${TOKEN}:username-scanner-webhook`);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || typeof msg?.text !== "string") return new Response("ok");

  const chatId = Number(msg.chat.id);
  const text = String(msg.text).trim();

  if (text === "/start") {
    await send(chatId, "💎 Username Hunter\n\nИщу перспективные 5-буквенные Telegram username и показываю примерную стоимость.\n\nНажми «⚡ Автопоиск» — бот сразу выдаст все найденные в текущей пачке варианты.");
  } else if (text === "🔥 Дорогие доступные") {
    await scan(chatId, "free");
  } else if (text === "💎 ТОП по цене") {
    await scan(chatId, "top");
  } else if (text === "⚡ Автопоиск") {
    await scan(chatId, "auto");
  } else if (text === "🔍 Проверить username") {
    await send(chatId, "Отправь username ровно из 5 латинских букв, например @nexor", {
      force_reply: true,
      input_field_placeholder: "@nexor",
      selective: true
    });
  } else if (text === "📊 Статистика") {
    await send(chatId, "📊 Автопоиск проверяет до 60 сильных 5-буквенных кандидатов за одно нажатие и выводит до 30 найденных вариантов. Каждое новое нажатие создаёт новую пачку.");
  } else if (msg?.reply_to_message?.text?.includes("Отправь username")) {
    await inspectOne(chatId, text);
  } else if (/^@?[a-zA-Z]{5}$/.test(text)) {
    await inspectOne(chatId, text);
  } else {
    await send(chatId, "Используй кнопки меню или отправь 5-буквенный username для проверки.");
  }

  return new Response("ok");
});
