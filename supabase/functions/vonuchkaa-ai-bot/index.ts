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

const BASE_COMMANDS = ["ban", "unban", "kick", "mute", "unmute", "warn", "del", "pin", "unpin", "modhelp"] as const;
const BASE_SET = new Set<string>(BASE_COMMANDS);
const REQUIRED_LEVEL: Record<string, number> = {
  warn: 1,
  del: 1,
  modhelp: 1,
  mute: 2,
  unmute: 2,
  kick: 3,
  ban: 4,
  unban: 4,
  pin: 5,
  unpin: 5,
};

type MemoryRow = { role: "user" | "model"; content: string; created_at?: string };

const SYSTEM = `Ты полноценный универсальный AI-собеседник внутри Telegram. Общайся как живой знакомый: на «ты», уверенно, дерзко и немного грубовато.

Характер и тон:
- Всегда обращайся к собеседнику на «ты». Не переходи на «вы», если только пользователь прямо не попросит.
- Не будь приторно добрым, услужливым или слишком вежливым. Без сюсюканья, пафоса и лишних извинений.
- Можешь материться по-русски и использовать грубые разговорные выражения, когда это естественно подходит к ситуации. Не надо вставлять мат в каждую фразу специально.
- Если пользователь пишет с матом, подкалывает, шутит или грубит — можешь отвечать в том же стиле, огрызнуться или подколоть в ответ.
- Будь скорее дерзким приятелем, чем вежливым консультантом: коротко, живо, с характером.
- При этом оставайся полезным: если человек задаёт нормальный вопрос, дай нормальный ответ, а не только шутку или оскорбление.
- Не угрожай реальным насилием, не унижай людей по защищённым признакам и не превращай обычный разговор в травлю.

Главные правила ответа:
- Никогда не выбирай ответ из заготовленного набора фраз. Каждый ответ создавай заново под конкретное сообщение и контекст.
- Понимай разговорную речь, ошибки, сленг, голосовой ввод, обрывки фраз и странные формулировки.
- Отвечай именно по смыслу сообщения, а не пересказывай и не повторяй слова пользователя.
- Если написали одно обычное слово, отреагируй осмысленно с учётом контекста. Не превращай это автоматически в одну и ту же шутку.
- Если написали бессмыслицу или набор букв, отреагируй естественно: можешь подколоть, предположить опечатку, подхватить настроение или коротко ответить как живой собеседник.
- На вопрос отвечай прямо и полезно. На просьбу выполни просьбу. На обычную реплику поддержи разговор.
- Учитывай последние сообщения беседы. Если человек продолжает предыдущую мысль, продолжай её вместе с ним.
- Для простого сообщения ответ обычно короткий. Для сложного вопроса можешь дать подробный ответ.
- Не пиши «интересная тема», «расскажи подробнее», «что именно ты имеешь в виду» без реальной необходимости.
- Если спрашивают, кто создал этого бота или кто его автор, создатель — Lukas Illusion.
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

async function reply(message: any, text: string, extra: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = {
    chat_id: message.chat.id,
    text: text.slice(0, 3900),
    reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
    disable_web_page_preview: true,
    ...extra,
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

function dbHeaders(extra: Record<string, string> = {}) {
  return {
    apikey: SERVICE_KEY,
    authorization: `Bearer ${SERVICE_KEY}`,
    "content-type": "application/json",
    ...extra,
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
      headers: dbHeaders({ Prefer: "return=minimal" }),
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
  return { text: "AI сейчас не успел сформировать ответ. Попробуй отправить сообщение ещё раз.", model: null as string | null };
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

function commandName(text: string) {
  const token = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return token.replace(new RegExp(`@${EXPECTED_BOT}$`, "i"), "");
}

function commandArgs(text: string) {
  return text.trim().split(/\s+/).slice(1);
}

function userLabel(user: any) {
  if (!user) return "пользователя";
  if (user.username) return `@${user.username}`;
  return String(user.first_name ?? user.last_name ?? `ID ${user.id}`);
}

function parseDuration(raw?: string): { seconds: number | null; label: string; consumed: boolean } {
  if (!raw) return { seconds: 600, label: "10 минут", consumed: false };
  const v = raw.toLowerCase();
  if (["perm", "permanent", "forever", "навсегда", "вечный", "∞"].includes(v)) return { seconds: null, label: "навсегда", consumed: true };
  const m = v.match(/^(\d+)(s|m|h|d|w|с|м|ч|д|н)$/i);
  if (!m) return { seconds: 600, label: "10 минут", consumed: false };
  const n = Math.max(1, Number(m[1]));
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = { s: 1, "с": 1, m: 60, "м": 60, h: 3600, "ч": 3600, d: 86400, "д": 86400, w: 604800, "н": 604800 };
  const seconds = Math.min(n * (mult[unit] ?? 60), 31536000);
  const labels: Record<string, string> = { s: `${n} сек.`, "с": `${n} сек.`, m: `${n} мин.`, "м": `${n} мин.`, h: `${n} ч.`, "ч": `${n} ч.`, d: `${n} дн.`, "д": `${n} дн.`, w: `${n} нед.`, "н": `${n} нед.` };
  return { seconds, label: labels[unit], consumed: true };
}

async function isAdmin(chatId: number, userId: number) {
  const r = await tg("getChatMember", { chat_id: chatId, user_id: userId });
  const status = r?.result?.status;
  return r?.ok && (status === "creator" || status === "administrator");
}

async function targetIsAdmin(chatId: number, userId: number) {
  return isAdmin(chatId, userId);
}

function tgError(r: any) {
  return String(r?.description ?? "Telegram отклонил команду").replace(/^Bad Request:\s*/i, "");
}

async function storedModeratorLevel(chatId: number, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return 0;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_moderators`);
    q.searchParams.set("select", "level");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return 0;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0]?.level ? Number(rows[0].level) : 0;
  } catch {
    return 0;
  }
}

async function effectiveLevel(chatId: number, userId: number) {
  if (await isAdmin(chatId, userId)) return 5;
  return storedModeratorLevel(chatId, userId);
}

async function saveModeratorLevel(chatId: number, userId: number, level: number, setBy: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    if (level === 0) {
      const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_moderators`);
      q.searchParams.set("chat_id", `eq.${chatId}`);
      q.searchParams.set("user_id", `eq.${userId}`);
      const r = await fetch(q, { method: "DELETE", headers: dbHeaders({ Prefer: "return=minimal" }), signal: AbortSignal.timeout(1600) });
      return r.ok;
    }
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_moderators`);
    q.searchParams.set("on_conflict", "chat_id,user_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ chat_id: chatId, user_id: userId, level, set_by: setBy, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function cleanAlias(raw: string) {
  return raw.trim().replace(/^\//, "").toLowerCase();
}

async function getAliases(chatId: number, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return [] as Array<{ base_command: string; alias: string }>;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_command_aliases`);
    q.searchParams.set("select", "base_command,alias");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("order", "base_command.asc");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function aliasToBase(chatId: number, userId: number, alias: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null as string | null;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_command_aliases`);
    q.searchParams.set("select", "base_command");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("alias", `eq.${alias}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0]?.base_command ? String(rows[0].base_command) : null;
  } catch {
    return null;
  }
}

async function saveAlias(chatId: number, userId: number, base: string, alias: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_command_aliases`);
    q.searchParams.set("on_conflict", "chat_id,user_id,base_command");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ chat_id: chatId, user_id: userId, base_command: base, alias, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function deleteAlias(chatId: number, userId: number, base: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_command_aliases`);
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("base_command", `eq.${base}`);
    const r = await fetch(q, { method: "DELETE", headers: dbHeaders({ Prefer: "return=minimal" }), signal: AbortSignal.timeout(1600) });
    return r.ok;
  } catch {
    return false;
  }
}

async function resolvePersonalAlias(chatId: number, userId: number, text: string) {
  const first = commandName(text);
  if (!first.startsWith("/")) return text;
  const alias = cleanAlias(first);
  if (!alias || BASE_SET.has(alias) || ["cmd", "setmoder", "start"].includes(alias)) return text;
  const base = await aliasToBase(chatId, userId, alias);
  if (!base) return text;
  const args = commandArgs(text);
  return `/${base}${args.length ? ` ${args.join(" ")}` : ""}`;
}

function creatorQuestion(text: string) {
  const t = text.toLowerCase().replace(/ё/g, "е");
  return /(кто\s+(создал|сделал|создатель|автор).*(бот|вонюч)|((создатель|автор).*(бот|вонюч))|кто\s+твой\s+(создатель|автор))/.test(t);
}

async function handleCmd(msg: any, text: string) {
  if (commandName(text) !== "/cmd") return false;
  const chatId = Number(msg.chat.id);
  const userId = Number(msg.from?.id);
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) {
    await reply(msg, "/cmd работает только в группе.");
    return true;
  }
  const level = await effectiveLevel(chatId, userId);
  if (level < 1) {
    await reply(msg, "Сначала тебе должны выдать уровень модератора через /setmoder.");
    return true;
  }
  const args = commandArgs(text);
  if (!args.length) {
    const aliases = await getAliases(chatId, userId);
    const lines = aliases.length ? aliases.map(x => `/${x.base_command} → /${x.alias}`).join("\n") : "Пока ничего не заменено.";
    await reply(msg, `Твои личные команды:\n${lines}\n\nПример: /cmd ban выгнать\nСброс: /cmd ban reset`);
    return true;
  }
  const base = cleanAlias(args[0]);
  if (!BASE_SET.has(base)) {
    await reply(msg, `Не знаю такую базовую команду. Можно: ${BASE_COMMANDS.map(x => `/${x}`).join(", ")}`);
    return true;
  }
  const need = REQUIRED_LEVEL[base] ?? 5;
  if (level < need) {
    await reply(msg, `Для /${base} нужен уровень ${need}, а у тебя ${level}.`);
    return true;
  }
  const rawAlias = args[1] ?? "";
  if (!rawAlias) {
    await reply(msg, `Напиши новое имя. Например: /cmd ${base} выгнать`);
    return true;
  }
  if (["reset", "default", "сброс"].includes(rawAlias.toLowerCase())) {
    const ok = await deleteAlias(chatId, userId, base);
    await reply(msg, ok ? `Вернул /${base} без личной замены.` : "Не смог сохранить изменение.");
    return true;
  }
  const alias = cleanAlias(rawAlias);
  if (!/^[a-zа-яё0-9_]{1,32}$/i.test(alias)) {
    await reply(msg, "Имя команды: только буквы, цифры и _; максимум 32 символа.");
    return true;
  }
  if (BASE_SET.has(alias) || ["cmd", "setmoder", "start"].includes(alias)) {
    await reply(msg, "Такое имя уже занято системной командой.");
    return true;
  }
  const ok = await saveAlias(chatId, userId, base, alias);
  await reply(msg, ok ? `Готово. Только у тебя /${alias} теперь работает как /${base}.` : "Не смог сохранить личную команду.");
  return true;
}

async function handleSetModer(msg: any, text: string) {
  if (commandName(text) !== "/setmoder") return false;
  const chatId = Number(msg.chat.id);
  const issuerId = Number(msg.from?.id);
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) {
    await reply(msg, "/setmoder работает только в группе.");
    return true;
  }
  const issuerLevel = await effectiveLevel(chatId, issuerId);
  if (issuerLevel < 5) {
    await reply(msg, "Выдавать уровни модератора может только админ группы или модератор 5 уровня.");
    return true;
  }
  const target = msg.reply_to_message?.from;
  if (!target?.id) {
    await reply(msg, "Ответь командой /setmoder 1-5 на сообщение человека. /setmoder 0 снимает уровень.");
    return true;
  }
  const level = Number(commandArgs(text)[0]);
  if (!Number.isInteger(level) || level < 0 || level > 5) {
    await reply(msg, "Укажи уровень от 1 до 5. Для снятия: /setmoder 0.");
    return true;
  }
  const targetId = Number(target.id);
  if (targetId === issuerId) {
    await reply(msg, "Сам себе уровень через эту команду не выдавай.");
    return true;
  }
  const ok = await saveModeratorLevel(chatId, targetId, level, issuerId);
  await reply(msg, ok
    ? level === 0 ? `Снял уровень модератора с ${userLabel(target)}.` : `Выдал ${userLabel(target)} уровень модератора ${level}.`
    : "Не смог сохранить уровень модератора.");
  return true;
}

async function handleModeration(msg: any, text: string) {
  const cmd = commandName(text);
  const clean = cmd.replace(/^\//, "");
  if (!BASE_SET.has(clean)) return false;

  const chatId = Number(msg.chat.id);
  const issuerId = Number(msg.from?.id);
  const chatType = String(msg.chat?.type ?? "");
  if (!["group", "supergroup"].includes(chatType)) {
    await reply(msg, "Эти команды работают только в группе.");
    return true;
  }

  const level = await effectiveLevel(chatId, issuerId);
  const need = REQUIRED_LEVEL[clean] ?? 5;
  if (level < need) {
    await reply(msg, `Недостаточно прав. Для /${clean} нужен уровень ${need}, у тебя ${level}.`);
    return true;
  }

  if (clean === "modhelp") {
    await reply(msg,
      `Твой уровень: ${level}\n\n` +
      "1 уровень: /warn, /del\n" +
      "2 уровень: + /mute, /unmute\n" +
      "3 уровень: + /kick\n" +
      "4 уровень: + /ban, /unban\n" +
      "5 уровень: + /pin, /unpin, /setmoder\n\n" +
      "/cmd ban выгнать — личное имя команды только для тебя.\n" +
      "Наказания используй ответом на сообщение человека."
    );
    return true;
  }

  const targetMsg = msg.reply_to_message;
  if (!targetMsg) {
    await reply(msg, `Ответь этой командой на сообщение человека. Например: ${cmd}${clean === "mute" ? " 10m" : ""}`);
    return true;
  }

  if (clean === "del") {
    const r = await tg("deleteMessage", { chat_id: chatId, message_id: targetMsg.message_id });
    if (!r?.ok) await reply(msg, `Не смог удалить: ${tgError(r)}.`);
    return true;
  }
  if (clean === "pin") {
    const r = await tg("pinChatMessage", { chat_id: chatId, message_id: targetMsg.message_id, disable_notification: true });
    await reply(msg, r?.ok ? "Закрепил." : `Не смог закрепить: ${tgError(r)}.`);
    return true;
  }
  if (clean === "unpin") {
    const r = await tg("unpinChatMessage", { chat_id: chatId, message_id: targetMsg.message_id });
    await reply(msg, r?.ok ? "Открепил." : `Не смог открепить: ${tgError(r)}.`);
    return true;
  }

  const target = targetMsg.from;
  const targetId = Number(target?.id);
  if (!targetId) {
    await reply(msg, "Не вижу пользователя у этого сообщения. Выбери обычное сообщение участника.");
    return true;
  }
  const name = userLabel(target);
  if (targetId === issuerId && ["ban", "kick", "mute"].includes(clean)) {
    await reply(msg, "Самого себя наказывать не дам. Хорошая попытка.");
    return true;
  }
  if (["ban", "kick", "mute"].includes(clean) && await targetIsAdmin(chatId, targetId)) {
    await reply(msg, "Админа или владельца группы так наказать не получится.");
    return true;
  }

  const args = commandArgs(text);
  if (clean === "ban") {
    const reason = args.join(" ").trim();
    const r = await tg("banChatMember", { chat_id: chatId, user_id: targetId, revoke_messages: false });
    await reply(msg, r?.ok ? `Забанил ${name}.${reason ? ` Причина: ${reason}` : ""}` : `Не смог забанить ${name}: ${tgError(r)}. Проверь права бота.`);
    return true;
  }
  if (clean === "unban") {
    const r = await tg("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    await reply(msg, r?.ok ? `Разбанил ${name}.` : `Не смог разбанить ${name}: ${tgError(r)}.`);
    return true;
  }
  if (clean === "kick") {
    const reason = args.join(" ").trim();
    const ban = await tg("banChatMember", { chat_id: chatId, user_id: targetId, revoke_messages: false });
    if (!ban?.ok) {
      await reply(msg, `Не смог кикнуть ${name}: ${tgError(ban)}. Проверь права бота.`);
      return true;
    }
    const unban = await tg("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    await reply(msg, unban?.ok ? `Кикнул ${name}.${reason ? ` Причина: ${reason}` : ""}` : `Удалил ${name}, но не смог сразу снять бан: ${tgError(unban)}.`);
    return true;
  }
  if (clean === "mute") {
    const duration = parseDuration(args[0]);
    const reason = args.slice(duration.consumed ? 1 : 0).join(" ").trim();
    const body: Record<string, unknown> = {
      chat_id: chatId,
      user_id: targetId,
      permissions: {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_topics: false,
      },
      use_independent_chat_permissions: true,
    };
    if (duration.seconds !== null) body.until_date = Math.floor(Date.now() / 1000) + duration.seconds;
    const r = await tg("restrictChatMember", body);
    await reply(msg, r?.ok ? `Замутил ${name} на ${duration.label}.${reason ? ` Причина: ${reason}` : ""}` : `Не смог замутить ${name}: ${tgError(r)}. Проверь права бота.`);
    return true;
  }
  if (clean === "unmute") {
    const chat = await tg("getChat", { chat_id: chatId });
    const permissions = chat?.result?.permissions ?? {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    };
    const r = await tg("restrictChatMember", { chat_id: chatId, user_id: targetId, permissions, use_independent_chat_permissions: true });
    await reply(msg, r?.ok ? `Снял мут с ${name}.` : `Не смог снять мут с ${name}: ${tgError(r)}.`);
    return true;
  }
  if (clean === "warn") {
    const reason = args.join(" ").trim();
    await reply(msg, `Предупреждение для ${name}.${reason ? ` Причина: ${reason}` : " Следующее нарушение может закончиться мутом или баном."}`);
    return true;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.searchParams.get("health") === "1") {
    return Response.json({ ok: true, bot_token: !!BOT_TOKEN, ai_key: !!GEMINI_KEY, memory: !!SERVICE_KEY, bot: EXPECTED_BOT, models: AI_MODELS, api: "interactions", moderation: true, moderator_levels: true, command_aliases: true });
  }

  if (url.searchParams.get("setup") === "1") {
    if (!BOT_TOKEN) return Response.json({ ok: false, error: "VONUCHKAA_BOT_TOKEN missing" }, { status: 500 });
    const me = await tg("getMe");
    if (!me?.ok || me?.result?.username !== EXPECTED_BOT) return Response.json({ ok: false, error: "Wrong Telegram bot token", detected: me?.result?.username ?? null }, { status: 409 });
    const secret = await sha256hex(`${BOT_TOKEN}:vonuchkaa-webhook-v2`);
    const hook = await tg("setWebhook", { url: WEBHOOK_URL, secret_token: secret, drop_pending_updates: true, allowed_updates: ["message"] });
    const ai = await verifyGemini();
    return Response.json({
      ok: !!hook?.ok && ai.ok,
      bot: `@${EXPECTED_BOT}`,
      gemini: ai.ok,
      model: ai.model,
      diagnostics: ai.diagnostics,
      memory: !!SERVICE_KEY,
      moderation: true,
      moderator_levels: true,
      command_aliases: true,
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

  if (text === "/start" || text === `/start@${EXPECTED_BOT}`) {
    await reply(msg, "Ну давай, пиши что угодно. Отвечу по смыслу, без лишних церемоний. Для модерации: /modhelp");
    return new Response("ok");
  }

  if (creatorQuestion(text)) {
    await reply(msg, "<b>Lukas Illusion</b>", { parse_mode: "HTML" });
    return new Response("ok");
  }

  if (await handleSetModer(msg, text)) return new Response("ok");
  if (await handleCmd(msg, text)) return new Response("ok");

  const chatId = Number(msg.chat.id);
  const userId = Number(msg.from.id);
  const resolvedText = await resolvePersonalAlias(chatId, userId, text);
  if (await handleModeration(msg, resolvedText)) return new Response("ok");

  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);
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
