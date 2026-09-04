import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "Vonuchkaa_bot";
const BOT_TOKEN = Deno.env.get("VONUCHKAA_BOT_TOKEN") ?? "";
const GROQ_API_KEY = Deno.env.get("VONUCHKAA_GROQ_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : "";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/vonuchkaa-chat-bot`;

async function sha256hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

function cleanText(s: string) {
  return s.replace(/\s+/g, " ").trim().slice(0, 4000);
}

async function aiReply(messageText: string, author: string, replyContext = "") {
  if (!GROQ_API_KEY) {
    return "AI ещё не подключён. Добавь VONUCHKAA_GROQ_API_KEY в Supabase Secrets.";
  }

  const userContent = [
    `Имя участника: ${author || "участник"}`,
    replyContext ? `Контекст ответа: ${replyContext}` : "",
    `Сообщение: ${messageText}`,
  ].filter(Boolean).join("\n");

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${GROQ_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content: "Ты дружелюбный Telegram-бот в обычной групповой переписке. Отвечай естественно и по смыслу на ЛЮБОЕ текстовое сообщение: приветствие, вопрос, случайное слово, шутку, короткую фразу. Пиши на языке пользователя. Обычно 1–2 коротких предложения. Не используй канцелярит и не начинай с фраз вроде 'как ИИ'. Если сообщение бессмысленное или состоит из одного случайного слова, всё равно дай уместную короткую реакцию по этому слову. Не повторяй сообщение пользователя дословно.",
        },
        { role: "user", content: userContent },
      ],
      temperature: 0.9,
      max_completion_tokens: 140,
      top_p: 0.95,
      stream: false,
    }),
  });

  if (!r.ok) {
    const body = await r.text().catch(() => "");
    console.error("Groq error", r.status, body.slice(0, 500));
    if (r.status === 429) return "Я немного перегружен, напиши ещё раз через пару секунд.";
    return "Не получилось ответить, попробуй ещё раз.";
  }

  const data = await r.json();
  const out = data?.choices?.[0]?.message?.content;
  return cleanText(typeof out === "string" && out.trim() ? out : "Окей.");
}

async function sendReply(chatId: number, messageId: number, text: string) {
  return tg("sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096),
    reply_parameters: {
      message_id: messageId,
      allow_sending_without_reply: true,
    },
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("setup") === "1") {
    if (!BOT_TOKEN) {
      return Response.json({ ok: false, missing: "VONUCHKAA_BOT_TOKEN" }, { status: 503 });
    }

    const me = await tg("getMe");
    if (!me?.ok || String(me?.result?.username || "").toLowerCase() !== EXPECTED_BOT.toLowerCase()) {
      return Response.json({ ok: false, error: "Wrong Telegram bot token" }, { status: 409 });
    }

    const secret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook`);
    const hook = await tg("setWebhook", {
      url: WEBHOOK_URL,
      secret_token: secret,
      drop_pending_updates: true,
      allowed_updates: ["message"],
    });

    return Response.json({
      ok: !!hook?.ok,
      bot: `@${me.result.username}`,
      webhook: hook?.description ?? "set",
      ai_connected: !!GROQ_API_KEY,
    });
  }

  if (!BOT_TOKEN) return new Response("VONUCHKAA_BOT_TOKEN missing", { status: 500 });

  const expectedSecret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook`);
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expectedSecret) {
    return new Response("forbidden", { status: 403 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id) return new Response("ok");
  if (msg?.from?.is_bot) return new Response("ok");

  const text = cleanText(String(msg?.text ?? msg?.caption ?? ""));
  if (!text) return new Response("ok");

  const chatId = Number(msg.chat.id);
  const messageId = Number(msg.message_id);
  const author = cleanText(String(msg?.from?.first_name ?? msg?.from?.username ?? "участник"));

  if (/^\/start(?:@\w+)?$/i.test(text)) {
    await sendReply(
      chatId,
      messageId,
      "Я готов отвечать на обычные сообщения автоматически. В группе отключи Privacy Mode через BotFather, иначе Telegram не будет присылать мне все сообщения."
    );
    return new Response("ok");
  }

  const replyContext = cleanText(String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? ""));
  const answer = await aiReply(text, author, replyContext);
  await sendReply(chatId, messageId, answer);

  return new Response("ok");
});
