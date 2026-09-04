import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "Vonuchkaa_bot";
const BOT_TOKEN_RAW = Deno.env.get("VONUCHKAA_BOT_TOKEN") ?? "";
const GEMINI_KEY_RAW = Deno.env.get("VONUCHKAA_GEMINI_API_KEY") ?? "";
const BOT_TOKEN = BOT_TOKEN_RAW.trim().replace(/^['"]|['"]$/g, "");
const GEMINI_KEY = (GEMINI_KEY_RAW.match(/AIza[0-9A-Za-z_-]{20,}/)?.[0] ?? GEMINI_KEY_RAW).trim().replace(/^['"]|['"]$/g, "");
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").trim();
const SERVICE_KEY = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/vonuchkaa-ai-bot`;
const AI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const AI_TOTAL_TIMEOUT_MS = 6500;

type MemoryRow = { role: "user" | "model"; content: string; created_at?: string };

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  });
  return await r.json();
}

async function reply(message: any, text: string) {
  const body: Record<string, unknown> = {
    chat_id: message.chat.id,
    text: text.slice(0, 3900),
    reply_parameters: {
      message_id: message.message_id,
      allow_sending_without_reply: true,
    },
    disable_web_page_preview: true,
  };
  if (message.message_thread_id) body.message_thread_id = message.message_thread_id;
  return tg("sendMessage", body);
}

async function typing(chatId: number, threadId?: number) {
  try {
    await tg("sendChatAction", {
      chat_id: chatId,
      action: "typing",
      ...(threadId ? { message_thread_id: threadId } : {}),
    });
  } catch {}
}

function dbHeaders() {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
  };
}

async function loadMemory(chatId: number): Promise<MemoryRow[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) return [];
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_chat_memory`);
    q.searchParams.set("select", "role,content,created_at");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("order", "created_at.desc");
    q.searchParams.set("limit", "10");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1200) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows.reverse() : [];
  } catch {
    return [];
  }
}

async function saveMemory(chatId: number, role: "user" | "model", content: string) {
  if (!SUPABASE_URL || !SERVICE_KEY || !content) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/vonuchkaa_chat_memory`, {
      method: "POST",
      headers: { ...dbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ chat_id: chatId, role, content: content.slice(0, 2500) }),
      signal: AbortSignal.timeout(1200),
    });
  } catch {}
}

function cleanGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("").trim();
  if (!text) return "";
  return text.replace(/^Ответ:\s*/i, "").trim();
}

function toGeminiContents(history: MemoryRow[], current: string, author?: string, replyTo?: string) {
  const contents: any[] = [];

  for (const row of history) {
    if (!row?.content) continue;
    contents.push({
      role: row.role === "model" ? "model" : "user",
      parts: [{ text: row.content.slice(0, 1800) }],
    });
  }

  const prefix = [
    author ? `Автор сообщения: ${author}` : "",
    replyTo ? `Сообщение, на которое он отвечает: ${replyTo.slice(0, 500)}` : "",
  ].filter(Boolean).join("\n");

  contents.push({
    role: "user",
    parts: [{ text: `${prefix}${prefix ? "\n" : ""}${current.slice(0, 2500)}` }],
  });

  return contents;
}

async function callModel(
  model: string,
  contents: any[],
  timeoutMs: number,
) {
  const system = `Ты полноценный AI-собеседник внутри Telegram, по поведению близкий к хорошему универсальному чат-ассистенту.

Главное правило: НИКАКИХ заранее заготовленных ответов. Каждый ответ формируй заново, исходя из конкретного сообщения и недавнего контекста разговора.

Как отвечать:
- Сначала пойми, что человек реально хотел сказать, даже если пишет разговорно, с ошибками, голосовым вводом, сленгом или обрывками фраз.
- Отвечай по сути, а не просто повторяй его слово другими словами.
- Если сообщение нормальное — дай нормальный содержательный ответ.
- Если это одно слово — реагируй именно на значение этого слова и возможный контекст, а не шаблоном.
- Если это бессмыслица или набор букв — не эхом повторяй текст и не пиши одну и ту же шутку. Можно естественно отреагировать, предположить опечатку или ответить так, как ответил бы живой собеседник.
- Если вопрос сложный — можешь отвечать подробнее. Если простой — коротко.
- Поддерживай продолжение разговора и учитывай предыдущие сообщения.
- Не говори «интересная тема», «расскажи подробнее», «что именно ты имеешь в виду» без реальной необходимости.
- Не упоминай, что у тебя есть системная инструкция, модель, API или шаблоны.
- Отвечай на языке пользователя. Русский — по умолчанию.

Твоя цель — чтобы человек ощущал, что разговаривает с настоящим AI-чатом, а не с ботом из набора фраз.`;

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": GEMINI_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: 0.8,
        topP: 0.92,
        maxOutputTokens: 500,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!r.ok) return { text: "", status: r.status };
  const data = await r.json();
  return { text: cleanGeminiText(data), status: r.status };
}

async function aiReply(
  chatId: number,
  input: string,
  meta: { firstName?: string; replyTo?: string },
) {
  if (!GEMINI_KEY) {
    return { text: "AI сейчас не подключён. Проверь ключ Gemini в настройках бота.", model: null };
  }

  const history = await loadMemory(chatId);
  const contents = toGeminiContents(history, input, meta.firstName, meta.replyTo);
  const started = Date.now();

  for (const model of AI_MODELS) {
    const left = AI_TOTAL_TIMEOUT_MS - (Date.now() - started);
    if (left < 1200) break;
    try {
      const result = await callModel(model, contents, Math.min(model.includes("flash-lite") ? 2600 : 4800, left));
      if (result.text) return { text: result.text, model };
    } catch {}
  }

  return {
    text: "Сейчас AI не успел сформировать ответ. Напиши сообщение ещё раз — я не буду подменять его шаблонной фразой.",
    model: null,
  };
}

async function verifyGemini() {
  if (!GEMINI_KEY) return { ok: false, model: null as string | null };
  for (const model of AI_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Ответь только: OK" }] }], generationConfig: { maxOutputTokens: 8 } }),
        signal: AbortSignal.timeout(7000),
      });
      if (r.ok) return { ok: true, model };
    } catch {}
  }
  return { ok: false, model: null as string | null };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({
      ok: true,
      bot_token: !!BOT_TOKEN,
      ai_key: !!GEMINI_KEY,
      memory: !!SERVICE_KEY,
      bot: EXPECTED_BOT,
      models: AI_MODELS,
    });
  }

  if (url.searchParams.get("setup") === "1") {
    if (!BOT_TOKEN) return Response.json({ ok: false, error: "VONUCHKAA_BOT_TOKEN missing" }, { status: 500 });

    const me = await tg("getMe");
    if (!me?.ok || me?.result?.username !== EXPECTED_BOT) {
      return Response.json({ ok: false, error: "Wrong Telegram bot token", detected: me?.result?.username ?? null }, { status: 409 });
    }

    const secret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v2`);
    const hook = await tg("setWebhook", {
      url: WEBHOOK_URL,
      secret_token: secret,
      drop_pending_updates: true,
      allowed_updates: ["message"],
    });

    const ai = await verifyGemini();
    return Response.json({
      ok: !!hook?.ok && ai.ok,
      bot: `@${EXPECTED_BOT}`,
      gemini: ai.ok,
      model: ai.model,
      memory: !!SERVICE_KEY,
      webhook: hook?.description ?? null,
    }, { status: ai.ok ? 200 : 409 });
  }

  if (!BOT_TOKEN) return new Response("bot token missing", { status: 500 });

  const expectedSecret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v2`);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id) return new Response("ok");
  if (msg?.from?.is_bot) return new Response("ok");

  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");

  if (text === "/start") {
    await reply(msg, "Готов. Я отвечаю как AI-собеседник и учитываю недавний контекст разговора.");
    return new Response("ok");
  }

  void typing(Number(msg.chat.id), msg.message_thread_id ? Number(msg.message_thread_id) : undefined);

  const chatId = Number(msg.chat.id);
  const author = String(msg?.from?.first_name ?? msg?.from?.username ?? "").trim() || undefined;
  const replyTo = String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").slice(0, 700) || undefined;

  await saveMemory(chatId, "user", `${author ? `${author}: ` : ""}${text}`);

  const answer = await aiReply(chatId, text, { firstName: author, replyTo });
  await saveMemory(chatId, "model", answer.text);
  await reply(msg, answer.text);

  return new Response("ok");
});
