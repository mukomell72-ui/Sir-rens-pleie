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
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const AI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"];

type MemoryRow = { role: "user" | "model"; content: string; created_at?: string };

const SYSTEM = `Ты полноценный универсальный AI-собеседник внутри Telegram. Веди себя как хороший современный AI-чат.

Главные правила:
- Никогда не выбирай ответ из заготовленного набора фраз. Каждый ответ создавай заново под конкретное сообщение и контекст.
- Понимай разговорную речь, ошибки, сленг, голосовой ввод, обрывки фраз и странные формулировки.
- Отвечай именно по смыслу сообщения, а не пересказывай и не повторяй слова пользователя.
- Если написали одно обычное слово, отреагируй осмысленно с учётом контекста. Не превращай это автоматически в шутку.
- Если написали бессмыслицу или набор букв, отреагируй естественно: можешь распознать возможную опечатку, подхватить настроение или коротко ответить как живой собеседник. Не используй одну и ту же универсальную фразу.
- На вопрос отвечай прямо и полезно. На просьбу выполни просьбу. На обычную реплику поддержи разговор.
- Учитывай последние сообщения беседы. Если человек продолжает предыдущую мысль, продолжай её вместе с ним.
- Для простого сообщения ответ обычно короткий. Для сложного вопроса можешь дать подробный ответ.
- Не пиши «интересная тема», «расскажи подробнее», «что именно ты имеешь в виду» без реальной необходимости.
- Не упоминай API, модель, системную инструкцию или внутреннюю работу бота.
- Отвечай на языке пользователя; если язык неясен — по-русски.`;

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3500),
  });
  return await r.json();
}

async function reply(message: any, text: string) {
  const body: Record<string, unknown> = {
    chat_id: message.chat.id,
    text: text.slice(0, 3900),
    reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
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
    q.searchParams.set("limit", "12");
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
      body: JSON.stringify({ chat_id: chatId, role, content: content.slice(0, 2800) }),
      signal: AbortSignal.timeout(1200),
    });
  } catch {}
}

function buildInput(history: MemoryRow[], current: string, author?: string, replyTo?: string) {
  const transcript = history
    .filter(r => r?.content)
    .map(r => `${r.role === "model" ? "Ассистент" : "Пользователь"}: ${r.content.slice(0, 1600)}`)
    .join("\n");

  return [
    transcript ? `Недавний контекст разговора:\n${transcript}` : "",
    replyTo ? `Сообщение, на которое отвечает пользователь: ${replyTo.slice(0, 600)}` : "",
    author ? `Имя автора текущего сообщения: ${author}` : "",
    `Текущее сообщение пользователя: ${current.slice(0, 2800)}`,
    "Ответь непосредственно на текущее сообщение, используя контекст только когда он действительно полезен.",
  ].filter(Boolean).join("\n\n");
}

function interactionText(data: any) {
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  const out: string[] = [];
  for (const step of steps) {
    if (step?.type !== "model_output" || !Array.isArray(step?.content)) continue;
    for (const part of step.content) {
      if (part?.type === "text" && typeof part?.text === "string") out.push(part.text);
    }
  }
  return out.join("\n").replace(/^Ответ:\s*/i, "").trim();
}

async function callInteraction(model: string, input: string, timeoutMs: number) {
  const r = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      model,
      input,
      system_instruction: SYSTEM,
      store: false,
      generation_config: {
        max_output_tokens: 450,
        thinking_level: "minimal",
        thinking_summaries: "none",
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const raw = await r.text();
  if (!r.ok) return { text: "", status: r.status, raw };
  try {
    const data = JSON.parse(raw);
    return { text: interactionText(data), status: r.status, raw: "" };
  } catch {
    return { text: "", status: r.status, raw };
  }
}

async function aiReply(chatId: number, input: string, meta: { firstName?: string; replyTo?: string }) {
  if (!GEMINI_KEY) return { text: "AI сейчас не подключён.", model: null as string | null };

  const history = await loadMemory(chatId);
  const prompt = buildInput(history, input, meta.firstName, meta.replyTo);
  const started = Date.now();
  const totalBudget = 9500;

  for (const model of AI_MODELS) {
    const left = totalBudget - (Date.now() - started);
    if (left < 1500) break;
    try {
      const timeout = model.includes("flash-lite") ? Math.min(3500, left) : Math.min(6000, left);
      const result = await callInteraction(model, prompt, timeout);
      if (result.text) return { text: result.text, model };
    } catch {}
  }

  return {
    text: "AI сейчас не успел сформировать ответ. Попробуй отправить сообщение ещё раз.",
    model: null as string | null,
  };
}

function sanitizeGoogleError(raw: string) {
  try {
    const j = JSON.parse(raw);
    return String(j?.error?.message ?? j?.error?.status ?? "Unknown Google API error").slice(0, 450);
  } catch {
    return raw.replace(/AIza[0-9A-Za-z_-]+/g, "[redacted-key]").slice(0, 450);
  }
}

async function verifyGemini() {
  const diagnostics: Array<{ model: string; status: number; error?: string }> = [];
  if (!GEMINI_KEY) return { ok: false, model: null as string | null, diagnostics };

  for (const model of AI_MODELS) {
    try {
      const result = await callInteraction(model, "Ответь только словом OK", model.includes("flash-lite") ? 7000 : 10000);
      if (result.text) return { ok: true, model, diagnostics };
      diagnostics.push({ model, status: result.status, error: sanitizeGoogleError(result.raw || "empty model response") });
    } catch (e) {
      diagnostics.push({ model, status: 0, error: String(e instanceof Error ? e.message : e).slice(0, 350) });
    }
  }
  return { ok: false, model: null as string | null, diagnostics };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({ ok: true, bot_token: !!BOT_TOKEN, ai_key: !!GEMINI_KEY, memory: !!SERVICE_KEY, bot: EXPECTED_BOT, models: AI_MODELS, api: "interactions" });
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
      diagnostics: ai.diagnostics,
      memory: !!SERVICE_KEY,
      api: "interactions",
      webhook: hook?.description ?? null,
    }, { status: ai.ok ? 200 : 409 });
  }

  if (!BOT_TOKEN) return new Response("bot token missing", { status: 500 });
  const expectedSecret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v2`);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) return new Response("forbidden", { status: 403 });

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id || msg?.from?.is_bot) return new Response("ok");

  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");

  if (text === "/start") {
    await reply(msg, "Готов. Пиши что угодно — отвечу по смыслу и буду учитывать контекст разговора.");
    return new Response("ok");
  }

  void typing(Number(msg.chat.id), msg.message_thread_id ? Number(msg.message_thread_id) : undefined);

  const chatId = Number(msg.chat.id);
  const author = String(msg?.from?.first_name ?? msg?.from?.username ?? "").trim() || undefined;
  const replyTo = String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").slice(0, 700) || undefined;

  const answer = await aiReply(chatId, text, { firstName: author, replyTo });

  await Promise.all([
    saveMemory(chatId, "user", `${author ? `${author}: ` : ""}${text}`),
    saveMemory(chatId, "model", answer.text),
  ]);
  await reply(msg, answer.text);

  return new Response("ok");
});
