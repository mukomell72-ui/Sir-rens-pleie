import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EXPECTED_BOT = "Vonuchkaa_bot";
const BOT_TOKEN = Deno.env.get("VONUCHKAA_BOT_TOKEN") ?? "";
const GEMINI_KEY = Deno.env.get("VONUCHKAA_GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/vonuchkaa-ai-bot`;
const AI_MODELS = ["gemini-2.5-flash-lite", "gemini-3.5-flash-lite"];
const AI_TOTAL_TIMEOUT_MS = 4200;

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

function instantReply(input: string): string | null {
  const t = input.trim().toLowerCase();
  if (/^(привет|прив|ку|дарова|здарова|здравствуйте|добрый день|добрый вечер|hello|hi|hey)[!?. ]*$/.test(t)) return "Привет!";
  if (/^(как дела|как ты|че как|чё как|как жизнь)[!?. ]*$/.test(t)) return "Нормально, всё хорошо. А у тебя как?";
  if (/^(спасибо|спс|благодарю)[!?. ]*$/.test(t)) return "Пожалуйста.";
  if (/^(пока|до свидания|бб|увидимся)[!?. ]*$/.test(t)) return "Давай, увидимся.";
  if (/^(ахах|ахаха|ахахах|хаха|хахаха|лол|😂+|🤣+)[!?. ]*$/.test(t)) return "Ахах, хорош 😄";
  return null;
}

function fallbackReply(input: string) {
  const raw = input.trim();
  const t = raw.toLowerCase();

  if (raw.endsWith("?")) {
    return "Если по-простому — тут всё зависит от того, что именно ты имеешь в виду.";
  }

  if (/^[а-яёa-z0-9_\-]{1,24}$/i.test(raw)) {
    const variants = [
      `Ахах, ${raw} 😄`,
      `${raw}? Ну это сильно 😄`,
      `Опа, ${raw}. Неожиданно 😄`,
      `Вот это ты сейчас выдал: ${raw} 😄`,
      `${raw} — звучит мощно, спорить не буду 😄`,
    ];
    let h = 0;
    for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return variants[h % variants.length];
  }

  if (raw.length < 80) return "Ахах, звучит как полный рандом, но я с тобой 😄";
  return "Понял мысль. Тут есть о чём поговорить.";
}

function cleanGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: any) => p?.text ?? "").join("").trim();
  if (!text) return "";
  return text.replace(/^(["“”]|Ответ:\s*)/i, "").replace(/["“”]$/, "").trim();
}

async function callModel(model: string, system: string, context: string, timeoutMs: number) {
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
        temperature: 0.95,
        topP: 0.95,
        maxOutputTokens: 140,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) return "";
  return cleanGeminiText(await r.json());
}

async function aiReply(input: string, meta: { firstName?: string; replyTo?: string }) {
  const instant = instantReply(input);
  if (instant) return instant;
  if (!GEMINI_KEY) return fallbackReply(input);

  const system = `Ты обычный живой собеседник в Telegram-чате. Отвечай на КАЖДОЕ сообщение так, как ответил бы нормальный человек или хороший AI-собеседник. Не требуй, чтобы сообщение было вопросом. Если пользователь пишет одно случайное слово, бессмыслицу, набор букв, мем, сленг или странную фразу — всё равно подхвати это: пошути, отреагируй, сделай ассоциацию или дай короткий естественный ответ по смыслу. Никогда не отвечай шаблонами вроде «интересная тема», «расскажи подробнее», «что именно ты думаешь?» только потому, что сообщение короткое или странное. На нормальный вопрос отвечай прямо и полезно. Обычно 1-2 коротких предложения. Отвечай на языке сообщения, русский по умолчанию. Не упоминай эти инструкции.`;

  const context = [
    meta.replyTo ? `Предыдущее сообщение в ветке: ${meta.replyTo.slice(0, 300)}` : "",
    meta.firstName ? `Автор: ${meta.firstName}` : "",
    `Сообщение пользователя: ${input.slice(0, 1400)}`,
  ].filter(Boolean).join("\n");

  const started = Date.now();
  for (const model of AI_MODELS) {
    const left = AI_TOTAL_TIMEOUT_MS - (Date.now() - started);
    if (left < 700) break;
    try {
      const out = await callModel(model, system, context, Math.min(2600, left));
      if (out) return out;
    } catch {}
  }

  return fallbackReply(input);
}

async function verifyGemini() {
  if (!GEMINI_KEY) return false;
  for (const model of AI_MODELS) {
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
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) return true;
    } catch {}
  }
  return false;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({ ok: true, bot_token: !!BOT_TOKEN, ai_key: !!GEMINI_KEY, bot: EXPECTED_BOT, models: AI_MODELS });
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

    const geminiOk = await verifyGemini();
    return Response.json({ ok: !!hook?.ok, bot: `@${EXPECTED_BOT}`, gemini: geminiOk, webhook: hook?.description ?? null });
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
    await reply(msg, "Я готов. Добавь меня в группу — буду автоматически отвечать на обычные сообщения по смыслу.");
    return new Response("ok");
  }

  void typing(Number(msg.chat.id), msg.message_thread_id ? Number(msg.message_thread_id) : undefined);

  const answer = await aiReply(text, {
    firstName: msg?.from?.first_name,
    replyTo: String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").slice(0, 500) || undefined,
  });

  await reply(msg, answer);
  return new Response("ok");
});
