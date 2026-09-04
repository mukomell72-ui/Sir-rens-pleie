import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "Vonuchkaa_bot";
const BOT_TOKEN = Deno.env.get("VONUCHKAA_BOT_TOKEN") ?? "";
const GEMINI_KEY = Deno.env.get("VONUCHKAA_GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/vonuchkaa-ai-bot`;
const GEMINI_MODEL = "gemini-3.1-flash-lite";

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

async function typing(chatId: number) {
  try { await tg("sendChatAction", { chat_id: chatId, action: "typing" }); } catch {}
}

async function reply(chatId: number, messageId: number, text: string) {
  return tg("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 3800),
    reply_parameters: { message_id: messageId, allow_sending_without_reply: true },
    disable_web_page_preview: true
  });
}

function fallbackReply(input: string) {
  const t = input.trim().toLowerCase();
  if (/^(привет|прив|ку|дарова|здарова|здравствуйте|hello|hi|hey)[!. ]*$/.test(t)) return "Привет!";
  if (/(как дела|как ты|че как|чё как)/.test(t)) return "Нормально, всё спокойно. А у тебя как?";
  if (/^(да|ага|угу|ок|окей|понял|понятно)[!. ]*$/.test(t)) return "Понял.";
  if (/^(нет|неа)[!. ]*$/.test(t)) return "Хорошо, понял.";
  if (/(спасибо|благодарю)/.test(t)) return "Пожалуйста.";
  if (t.endsWith("?")) return "Интересный вопрос. Тут надо смотреть по ситуации.";
  const variants = ["Понял.", "Нормально звучит.", "Интересно.", "Есть такое.", "Да, понял тебя.", "Хм, интересно."];
  let n = 0;
  for (const ch of t) n = (n + ch.charCodeAt(0)) % variants.length;
  return variants[n];
}

function cleanGeminiText(data: any) {
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("").trim();
  if (!text) return "";
  return text.replace(/^(["“”]|Ответ:\s*)/i, "").replace(/["“”]$/, "").trim();
}

async function aiReply(input: string, meta: {firstName?: string; username?: string; chatTitle?: string; replyTo?: string}) {
  if (!GEMINI_KEY) return fallbackReply(input);

  const system = `Ты обычный участник Telegram-чата. Отвечай естественно и по смыслу на КАЖДОЕ сообщение, даже если это одно случайное слово, сленг, шутка или бессмыслица. По умолчанию отвечай коротко: 1-2 предложения. Не будь официальным. Не пиши, что ты ИИ, если тебя прямо об этом не спросили. Отвечай на языке собеседника, чаще всего на русском. Не начинай каждый ответ одинаково. На приветствие отвечай приветствием. На "как дела" отвечай живо и естественно. На случайное слово придумай уместную короткую реакцию или ассоциацию. Не повторяй сообщение пользователя дословно. Не добавляй дисклеймеры без необходимости.`;

  const context = [
    meta.chatTitle ? `Название чата: ${meta.chatTitle}` : "",
    meta.firstName ? `Имя автора: ${meta.firstName}` : "",
    meta.username ? `Username автора: @${meta.username}` : "",
    meta.replyTo ? `Сообщение, на которое отвечает пользователь: ${meta.replyTo}` : "",
    `Текущее сообщение: ${input}`
  ].filter(Boolean).join("\n");

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: context }] }],
        generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 180 }
      })
    });
    if (!r.ok) return fallbackReply(input);
    const data = await r.json();
    const out = cleanGeminiText(data);
    return out || fallbackReply(input);
  } catch {
    return fallbackReply(input);
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({ ok: true, bot_token: !!BOT_TOKEN, ai_key: !!GEMINI_KEY, bot: EXPECTED_BOT });
  }

  if (url.searchParams.get("setup") === "1") {
    if (!BOT_TOKEN) return Response.json({ ok: false, error: "VONUCHKAA_BOT_TOKEN missing" }, { status: 500 });
    const me = await tg("getMe");
    if (!me?.ok || me?.result?.username !== EXPECTED_BOT) {
      return Response.json({ ok: false, error: "Wrong bot token", detected: me?.result?.username ?? null }, { status: 409 });
    }
    const secret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v1`);
    const hook = await tg("setWebhook", {
      url: WEBHOOK_URL,
      secret_token: secret,
      drop_pending_updates: true,
      allowed_updates: ["message"]
    });
    return Response.json({ ok: !!hook?.ok, bot: `@${EXPECTED_BOT}`, webhook: hook?.description ?? null, ai: GEMINI_KEY ? "ready" : "fallback_only" });
  }

  if (!BOT_TOKEN) return new Response("bot token missing", { status: 500 });

  const expectedSecret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v1`);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) return new Response("forbidden", { status: 403 });

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id) return new Response("ok");
  if (msg?.from?.is_bot) return new Response("ok");

  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");

  const chatId = Number(msg.chat.id);
  const messageId = Number(msg.message_id);

  if (text === "/start") {
    await reply(chatId, messageId, "Я в сети. Добавь меня в группу, отключи Privacy Mode в BotFather — и я буду автоматически отвечать на обычные сообщения.");
    return new Response("ok");
  }

  await typing(chatId);
  const answer = await aiReply(text, {
    firstName: msg?.from?.first_name,
    username: msg?.from?.username,
    chatTitle: msg?.chat?.title,
    replyTo: String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").slice(0, 500) || undefined
  });
  await reply(chatId, messageId, answer);

  return new Response("ok");
});
