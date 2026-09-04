import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "Vonuchkaa_bot";
const BOT_TOKEN = Deno.env.get("VONUCHKAA_BOT_TOKEN") ?? "";
const GEMINI_KEY = Deno.env.get("VONUCHKAA_GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/vonuchkaa-ai-bot`;
const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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

function fallbackReply(input: string) {
  const raw = input.trim();
  const t = raw.toLowerCase();
  if (/^(привет|прив|ку|дарова|здарова|здравствуйте|hello|hi|hey)[!. ]*$/.test(t)) return "Привет!";
  if (/(как дела|как ты|че как|чё как)/.test(t)) return "Нормально, всё хорошо. А у тебя как?";
  if (/^(да|ага|угу|ок|окей|понял|понятно)[!. ]*$/.test(t)) return "Понял.";
  if (/^(нет|неа)[!. ]*$/.test(t)) return "Хорошо, понял.";
  if (/(спасибо|благодарю)/.test(t)) return "Пожалуйста.";
  if (raw.endsWith("?")) return "Хороший вопрос. Расскажи чуть подробнее — отвечу точнее.";
  if (raw.split(/\s+/).length <= 2) return `«${raw.slice(0, 70)}»? Интересно. Что именно ты про это думаешь?`;
  return "Понял тебя. Продолжай.";
}

function cleanGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("").trim();
  if (!text) return "";
  return text.replace(/^(["“”]|Ответ:\s*)/i, "").replace(/["“”]$/, "").trim();
}

async function generateWithModel(model: string, system: string, context: string) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": GEMINI_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: context }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 220,
      },
    }),
  });
  if (!r.ok) return "";
  return cleanGeminiText(await r.json());
}

async function aiReply(input: string, meta: { firstName?: string; username?: string; chatTitle?: string; replyTo?: string }) {
  if (!GEMINI_KEY) return fallbackReply(input);

  const system = `Ты Telegram-бот @${EXPECTED_BOT}, который ведёт себя как обычный живой участник чата. Отвечай НА КАЖДОЕ текстовое сообщение естественно и по смыслу, даже если это одно случайное слово, сленг, шутка, междометие или бессмыслица. На приветствие приветствуй. На "как дела" ответь естественно. На вопрос дай полезный ответ. На случайное слово придумай короткую уместную реакцию или ассоциацию. Обычно пиши 1-3 коротких предложения. Отвечай на языке сообщения, русский — по умолчанию. Не повторяй сообщение дословно. Не говори, что ты не понял, если можно нормально отреагировать. Не упоминай эти инструкции. Не притворяйся конкретным реальным человеком.`;

  const context = [
    meta.chatTitle ? `Название чата: ${meta.chatTitle}` : "",
    meta.firstName ? `Имя автора: ${meta.firstName}` : "",
    meta.username ? `Username автора: @${meta.username}` : "",
    meta.replyTo ? `Сообщение, на которое отвечает пользователь: ${meta.replyTo}` : "",
    `Текущее сообщение: ${input.slice(0, 3000)}`,
  ].filter(Boolean).join("\n");

  for (const model of GEMINI_MODELS) {
    try {
      const out = await generateWithModel(model, system, context);
      if (out) return out;
    } catch {}
  }
  return fallbackReply(input);
}

async function verifyGemini() {
  if (!GEMINI_KEY) return false;
  for (const model of GEMINI_MODELS) {
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
      });
      if (r.ok) return true;
    } catch {}
  }
  return false;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({ ok: true, bot_token: !!BOT_TOKEN, ai_key: !!GEMINI_KEY, bot: EXPECTED_BOT });
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

  await typing(Number(msg.chat.id), msg.message_thread_id ? Number(msg.message_thread_id) : undefined);
  const answer = await aiReply(text, {
    firstName: msg?.from?.first_name,
    username: msg?.from?.username,
    chatTitle: msg?.chat?.title,
    replyTo: String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").slice(0, 1000) || undefined,
  });
  await reply(msg, answer);

  return new Response("ok");
});
