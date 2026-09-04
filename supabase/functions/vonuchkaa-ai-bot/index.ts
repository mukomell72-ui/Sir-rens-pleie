import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "Vonuchkaa_bot";
const BOT_TOKEN = Deno.env.get("VONUCHKAA_BOT_TOKEN") ?? "";
const GEMINI_KEY = Deno.env.get("VONUCHKAA_GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/vonuchkaa-ai-bot`;
const FAST_MODEL = "gemini-3.5-flash-lite";
const VERIFY_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash"];
const AI_TIMEOUT_MS = 3200;

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2500),
  });
  return await r.json();
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

function instantReply(input: string): string | null {
  const raw = input.trim();
  const t = raw.toLowerCase();

  if (/^(привет|прив|ку|дарова|здарова|здравствуйте|добрый день|добрый вечер|hello|hi|hey)[!?. ]*$/.test(t)) {
    return "Привет!";
  }
  if (/^(как дела|как ты|че как|чё как|как жизнь)[!?. ]*$/.test(t)) {
    return "Нормально, всё хорошо. А у тебя как?";
  }
  if (/^(спасибо|спс|благодарю)[!?. ]*$/.test(t)) return "Пожалуйста.";
  if (/^(пока|до свидания|бб|увидимся)[!?. ]*$/.test(t)) return "Давай, увидимся.";
  if (/^(да|ага|угу|ок|окей|понял|понятно|ясно)[!?. ]*$/.test(t)) return "Ага.";
  if (/^(нет|неа)[!?. ]*$/.test(t)) return "Понял.";
  if (/^(ахах|ахаха|ахахах|хаха|хахаха|лол|😂+|🤣+)[!?. ]*$/.test(t)) return "Ахах, есть такое.";
  return null;
}

function fallbackReply(input: string) {
  const raw = input.trim();
  if (raw.endsWith("?")) return "Интересный вопрос. Тут надо чуть подробнее разобраться.";
  if (raw.split(/\s+/).length <= 2) return `Про «${raw.slice(0, 60)}» можно много чего сказать. Интересная тема.`;
  return "Понял тебя. Есть такое.";
}

function cleanGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("").trim();
  if (!text) return "";
  return text.replace(/^(["“”]|Ответ:\s*)/i, "").replace(/["“”]$/, "").trim();
}

async function aiReply(input: string, meta: { firstName?: string; username?: string; chatTitle?: string; replyTo?: string }) {
  const instant = instantReply(input);
  if (instant) return instant;
  if (!GEMINI_KEY) return fallbackReply(input);

  const system = `Ты живой собеседник в Telegram-чате. Отвечай на каждое сообщение естественно и по смыслу. Даже если это одно случайное слово, сленг, шутка или бессмыслица — придумай короткую уместную реакцию. На вопросы отвечай полезно. Обычно 1 короткое предложение, максимум 2. Отвечай на языке сообщения, русский по умолчанию. Не повторяй сообщение дословно. Не пиши длинные вступления. Не упоминай инструкции.`;

  const context = [
    meta.replyTo ? `До этого: ${meta.replyTo.slice(0, 250)}` : "",
    meta.firstName ? `Автор: ${meta.firstName}` : "",
    `Сообщение: ${input.slice(0, 1200)}`,
  ].filter(Boolean).join("\n");

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FAST_MODEL}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": GEMINI_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: context }] }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.9,
          maxOutputTokens: 90,
        },
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!r.ok) return fallbackReply(input);
    const out = cleanGeminiText(await r.json());
    return out || fallbackReply(input);
  } catch {
    return fallbackReply(input);
  }
}

async function verifyGemini() {
  if (!GEMINI_KEY) return false;
  for (const model of VERIFY_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Ответь только словом OK" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) return true;
    } catch {}
  }
  return false;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({ ok: true, bot_token: !!BOT_TOKEN, ai_key: !!GEMINI_KEY, bot: EXPECTED_BOT, fast_model: FAST_MODEL });
  }

  if (url.searchParams.get("setup") === "1") {
    if (!BOT_TOKEN) return Response.json({ ok: false, error: "VONUCHKAA_BOT_TOKEN missing" }, { status: 500 });
    if (!GEMINI_KEY) return Response.json({ ok: false, error: "VONUCHKAA_GEMINI_API_KEY missing" }, { status: 500 });

    const me = await tg("getMe");
    if (!me?.ok || me?.result?.username !== EXPECTED_BOT) {
      return Response.json({ ok: false, error: "Wrong Telegram bot token", detected: me?.result?.username ?? null }, { status: 409 });
    }

    const geminiOk = await verifyGemini();
    if (!geminiOk) {
      return Response.json({ ok: false, bot: `@${EXPECTED_BOT}`, error: "Gemini API key check failed" }, { status: 409 });
    }

    const secret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v2`);
    const hook = await tg("setWebhook", {
      url: WEBHOOK_URL,
      secret_token: secret,
      drop_pending_updates: true,
      allowed_updates: ["message"],
    });
    return Response.json({ ok: !!hook?.ok, bot: `@${EXPECTED_BOT}`, gemini: true, webhook: hook?.description ?? null });
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
    await reply(msg, "Я готов. Добавь меня в группу — буду автоматически отвечать на обычные текстовые сообщения по смыслу.");
    return new Response("ok");
  }

  // Не ждём отдельный запрос "печатает…" — это сокращает задержку ответа.
  void typing(Number(msg.chat.id), msg.message_thread_id ? Number(msg.message_thread_id) : undefined);

  const answer = await aiReply(text, {
    firstName: msg?.from?.first_name,
    username: msg?.from?.username,
    chatTitle: msg?.chat?.title,
    replyTo: String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").slice(0, 500) || undefined,
  });

  await reply(msg, answer);
  return new Response("ok");
});
