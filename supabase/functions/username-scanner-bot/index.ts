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
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
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
  const vowelCount = chars.filter(c => vowels.has(c)).length;
  const rareCount = chars.filter(c => rare.has(c)).length;
  const unique = new Set(chars).size;

  if (/^[a-z]{5}$/.test(u)) score += 10;
  if (vowelCount >= 1 && vowelCount <= 3) score += 9;
  if (unique >= 4) score += 7;
  if (/^[^aeiouy][aeiouy][^aeiouy][aeiouy][^aeiouy]$/.test(u)) score += 12;
  if (/^[^aeiouy][aeiouy][^aeiouy][^aeiouy][aeiouy]$/.test(u)) score += 8;
  if (/([a-z])\1\1/.test(u)) score -= 14;
  if (/^[qxzj]{2}/.test(u) || rareCount >= 3) score -= 12;
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
  if (/^[^aeiouy][aeiouy][^aeiouy][aeiouy][^aeiouy]$/.test(u)) parts.push("сильный CVCVC-ритм");
  if (score >= 90) parts.push("высокий брендовый потенциал");
  return parts.join(", ");
}

const onset = ["b","c","d","f","g","h","k","l","m","n","p","r","s","t","v","w"];
const vowels = ["a","e","i","o","u","y"];
const coda = ["b","c","d","f","g","k","l","m","n","p","r","s","t","v","x","z"];

function generateCandidates(limit = 30) {
  const out = new Set<string>();
  const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  for (let i = 0; i < limit * 12 && out.size < limit; i++) {
    const p = Math.floor(Math.random() * 3);
    let u = "";
    if (p === 0) u = `${pick(onset)}${pick(vowels)}${pick(coda)}${pick(vowels)}${pick(coda)}`;
    else if (p === 1) u = `${pick(onset)}${pick(vowels)}${pick(coda)}${pick(coda)}${pick(vowels)}`;
    else u = `${pick(onset)}${pick(vowels)}${pick(onset)}${pick(vowels)}${pick(onset)}`;
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
      headers: { "user-agent": "Mozilla/5.0" }
    });
    const html = await r.text();
    const occupiedMarkers = [
      "tgme_page_title",
      "tgme_page_photo",
      "tgme_page_description",
      "tgme_page_extra",
      "Preview channel",
      "Send Message"
    ];
    if (r.status === 404) return "likely_free";
    if (occupiedMarkers.some(x => html.includes(x))) return "occupied";
    return "likely_free";
  } catch {
    return "unknown";
  }
}

function labelAvailability(a: string) {
  if (a === "likely_free") return "🟢 предварительно свободен";
  if (a === "occupied") return "🔴 занят";
  return "🟡 проверка не удалась";
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
    `@${u}\n${labelAvailability(availability)}\n⭐ ${score}/100\n💰 ~$${min.toLocaleString("en-US")}–$${max.toLocaleString("en-US")}\n${reasonFor(u, score)}\n\n⚠️ Цена ориентировочная. Веб-проверка свободности предварительная.`
  );
}

async function scan(chatId: number, mode: "free" | "top" | "auto") {
  await send(chatId, "⚡ Проверяю новую подборку 5-буквенных вариантов…");
  const candidates = generateCandidates(28).filter(x => x.score >= 78).slice(0, 16);
  const checked: Array<any> = [];

  for (const c of candidates) {
    const availability = await preliminaryAvailability(c.username);
    checked.push({ ...c, availability });
  }

  checked.sort((a, b) => b.score - a.score);
  let rows = checked;
  if (mode === "free" || mode === "auto") rows = checked.filter(x => x.availability === "likely_free");
  rows = rows.slice(0, 8);

  if (!rows.length) {
    await send(chatId, "В этой пачке подходящих вариантов не нашлось. Нажми «⚡ Автопоиск» ещё раз — будет новая выборка.");
    return;
  }

  const title = mode === "top" ? "💎 ТОП текущей проверки" : "🔥 Лучшие предварительно свободные";
  const list = rows.map((x, i) => `${i + 1}. @${x.username} — ⭐ ${x.score}/100 — ~$${x.min}–$${x.max}`).join("\n");
  await send(chatId, `${title}\n\n${list}\n\n⚠️ Свободность пока предварительная. Для 100% результата нужен Telegram user-session (MTProto).`);
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
    await send(chatId, "💎 Username Hunter\n\nИщу перспективные 5-буквенные Telegram username, оцениваю их коммерческий потенциал и примерную стоимость.\n\nВыбери действие:");
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
    await send(chatId, "📊 Сейчас работает живая проверка пачками.\n\nВ одной проверке анализируется до 16 сильных 5-буквенных кандидатов. Постоянную базу и фоновый сканер подключу следующим этапом.");
  } else if (msg?.reply_to_message?.text?.includes("Отправь username")) {
    await inspectOne(chatId, text);
  } else if (/^@?[a-zA-Z]{5}$/.test(text)) {
    await inspectOne(chatId, text);
  } else {
    await send(chatId, "Используй кнопки меню или отправь 5-буквенный username для проверки.");
  }

  return new Response("ok");
});
