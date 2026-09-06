from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
type VonStatsRow = {
  first_name?: string | null;
  username?: string | null;
  message_count?: number;
  warn_count?: number;
  ban_count?: number;
  last_message_at?: string | null;
};

function htmlEsc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

async function trackUserMessage(msg: any) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) return;
  const chatId = Number(msg?.chat?.id);
  const userId = Number(msg?.from?.id);
  if (!chatId || !userId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/vonuchkaa_track_message`, {
      method: "POST",
      headers: dbHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        p_chat_id: chatId,
        p_user_id: userId,
        p_first_name: String(msg?.from?.first_name ?? msg?.from?.last_name ?? "").slice(0, 128) || null,
        p_username: String(msg?.from?.username ?? "").slice(0, 64) || null,
      }),
      signal: AbortSignal.timeout(1400),
    });
  } catch {}
}

async function trackModerationEvent(chatId: number, userId: number, action: string, actorUserId: number, reason?: string) {
  if (!SUPABASE_URL || !SERVICE_KEY || !chatId || !userId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/vonuchkaa_track_moderation`, {
      method: "POST",
      headers: dbHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        p_chat_id: chatId,
        p_user_id: userId,
        p_action: action.slice(0, 32),
        p_actor_user_id: actorUserId || null,
        p_reason: reason ? reason.slice(0, 800) : null,
      }),
      signal: AbortSignal.timeout(1400),
    });
  } catch {}
}

async function getVonStats(chatId: number, userId: number): Promise<VonStatsRow> {
  if (!SUPABASE_URL || !SERVICE_KEY) return {};
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_user_stats`);
    q.searchParams.set("select", "first_name,username,message_count,warn_count,ban_count,last_message_at");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return {};
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] as VonStatsRow : {};
  } catch { return {}; }
}

async function getVonWarnings(chatId: number, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return [] as Array<{reason?: string | null; actor_user_id?: number | null; created_at?: string}>;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_moderation_events`);
    q.searchParams.set("select", "reason,actor_user_id,created_at");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("action", "eq.warn");
    q.searchParams.set("order", "created_at.desc");
    q.searchParams.set("limit", "20");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

function formatMsk(value?: string | null) {
  if (!value) return "Нет данных";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Нет данных";
  const text = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).format(d).replace(",", "");
  return `${text} МСК (UTC+3)`;
}

async function statsMember(chatId: number, userId: number) {
  try {
    const r = await tg("getChatMember", { chat_id: chatId, user_id: userId });
    return r?.ok ? r?.result ?? null : null;
  } catch { return null; }
}

async function statsRole(chatId: number, userId: number, member?: any) {
  const status = String(member?.status ?? "");
  if (status === "creator") return "Создатель";
  if (status === "administrator") return "Администратор";
  const level = await storedModeratorLevel(chatId, userId);
  if (level > 0) return `Модератор (ур. ${level})`;
  return "Участник";
}

async function statsCard(chatId: number, userId: number, fallbackUser?: any) {
  const [row, member, nickname] = await Promise.all([
    getVonStats(chatId, userId),
    statsMember(chatId, userId),
    getNickname(chatId, userId),
  ]);
  const user = member?.user ?? fallbackUser ?? { id: userId, first_name: row.first_name, username: row.username };
  const role = await statsRole(chatId, userId, member);
  const status = String(member?.status ?? "");
  const blocked = status === "kicked" || (status === "restricted" && member?.can_send_messages === false);
  const label = nickname || (user?.username ? `@${user.username}` : String(user?.first_name ?? row.first_name ?? `ID ${userId}`));
  const warnings = Number(row.warn_count ?? 0);
  const bans = Number(row.ban_count ?? 0);
  const messages = Number(row.message_count ?? 0);

  const text = `<b>Информация о <a href="tg://user?id=${userId}">пользователе</a></b>\n` +
    `Роль: <b>${htmlEsc(role)}</b>\n` +
    `Блокировок: <b>${bans}</b>\n` +
    `Общая блокировка в чатах: <b>Нет</b>\n` +
    `Общая блокировка в беседах: <b>Нет</b>\n` +
    `Активные предупреждения: <b>${warnings}</b>\n` +
    `Блокировка чата: <b>${blocked ? "Да" : "Нет"}</b>\n` +
    `Ник: <b>${htmlEsc(label)}</b>\n` +
    `Всего сообщений: <b>${messages}</b>\n` +
    `Последнее сообщение:\n<b>${htmlEsc(formatMsk(row.last_message_at))}</b>`;

  const keyboard = {
    inline_keyboard: [[
      { text: "Все предупреждения", callback_data: `vstats_warns:${userId}` },
      { text: "Информация", callback_data: `vstats_info:${userId}` },
    ]],
  };
  return { text, keyboard, row, member, user, role, nickname };
}

async function handleStatsCommand(msg: any, text: string) {
  if (commandName(text) !== "/stats") return false;
  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) {
    await reply(msg, "/stats работает только в группе.");
    return true;
  }
  const target = msg?.reply_to_message?.from ?? msg?.from;
  const userId = Number(target?.id);
  if (!userId) {
    await reply(msg, "Ответь /stats на сообщение пользователя или отправь /stats без ответа для своей статистики.");
    return true;
  }
  const card = await statsCard(Number(msg.chat.id), userId, target);
  await tg("sendMessage", {
    chat_id: msg.chat.id,
    text: card.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: card.keyboard,
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
  });
  return true;
}

async function handleStatsCallback(cb: any) {
  const data = String(cb?.data ?? "");
  if (!data.startsWith("vstats_")) return false;
  const chatId = Number(cb?.message?.chat?.id);
  if (!chatId || !["group", "supergroup"].includes(String(cb?.message?.chat?.type ?? ""))) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Статистика доступна в группе." }); } catch {}
    return true;
  }
  const m = data.match(/^vstats_(warns|info):(\d+)$/);
  if (!m) {
    try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch {}
    return true;
  }
  const userId = Number(m[2]);
  try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch {}

  if (m[1] === "warns") {
    const rows = await getVonWarnings(chatId, userId);
    if (!rows.length) {
      await tg("sendMessage", { chat_id: chatId, text: "У этого пользователя пока нет сохранённых предупреждений." });
      return true;
    }
    const lines = rows.map((x, i) => {
      const reason = htmlEsc(x.reason || "без причины");
      const when = htmlEsc(formatMsk(x.created_at));
      return `${i + 1}. <b>${when}</b>\nПричина: ${reason}${x.actor_user_id ? `\nВыдал: <code>${x.actor_user_id}</code>` : ""}`;
    });
    await tg("sendMessage", { chat_id: chatId, text: `<b>Предупреждения пользователя</b>\n\n${lines.join("\n\n")}`.slice(0, 3900), parse_mode: "HTML" });
    return true;
  }

  const card = await statsCard(chatId, userId);
  const username = card.user?.username ? `@${htmlEsc(card.user.username)}` : "нет";
  const info = `<b>Дополнительная информация</b>\n\n` +
    `ID: <code>${userId}</code>\n` +
    `Username: <b>${username}</b>\n` +
    `Роль: <b>${htmlEsc(card.role)}</b>\n` +
    `Внутренний ник: <b>${htmlEsc(card.nickname || "не установлен")}</b>\n` +
    `Сообщений: <b>${Number(card.row.message_count ?? 0)}</b>\n` +
    `Предупреждений: <b>${Number(card.row.warn_count ?? 0)}</b>\n` +
    `Блокировок: <b>${Number(card.row.ban_count ?? 0)}</b>`;
  await tg("sendMessage", { chat_id: chatId, text: info, parse_mode: "HTML" });
  return true;
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handleStatsCommand" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

# Track every non-empty human text/caption message in group chats.
old_text = '''  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");'''
new_text = '''  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");
  void trackUserMessage(msg);'''
if old_text in s:
    s = s.replace(old_text, new_text, 1)
elif "void trackUserMessage(msg);" not in s:
    raise SystemExit("message tracking anchor not found")

# Route /stats before regular promo/moderation handlers.
old_route = '  if (await handlePromoPost(msg, text)) return new Response("ok");'
new_route = '  if (await handleStatsCommand(msg, text)) return new Response("ok");\n  if (await handlePromoPost(msg, text)) return new Response("ok");'
if new_route not in s:
    if old_route not in s:
        raise SystemExit("stats command routing anchor not found")
    s = s.replace(old_route, new_route, 1)

# Route stats inline buttons before the normal /start-menu callback handler.
old_cb = '''  if (cb) {
    await handleMenuCallback(cb);
    return new Response("ok");
  }'''
new_cb = '''  if (cb) {
    if (await handleStatsCallback(cb)) return new Response("ok");
    await handleMenuCallback(cb);
    return new Response("ok");
  }'''
if old_cb in s:
    s = s.replace(old_cb, new_cb, 1)
elif "await handleStatsCallback(cb)" not in s:
    raise SystemExit("stats callback routing anchor not found")

# Persist successful bans and warnings so /stats can show real counters/history.
old_ban = '''    const r = await tg("banChatMember", { chat_id: chatId, user_id: targetId, revoke_messages: false });
    await reply(msg, r?.ok ? `Забанил ${name}.${reason ? ` Причина: ${reason}` : ""}` : `Не смог забанить ${name}: ${tgError(r)}. Проверь права бота.`);'''
new_ban = '''    const r = await tg("banChatMember", { chat_id: chatId, user_id: targetId, revoke_messages: false });
    if (r?.ok) void trackModerationEvent(chatId, targetId, "ban", issuerId, reason);
    await reply(msg, r?.ok ? `Забанил ${name}.${reason ? ` Причина: ${reason}` : ""}` : `Не смог забанить ${name}: ${tgError(r)}. Проверь права бота.`);'''
if old_ban in s:
    s = s.replace(old_ban, new_ban, 1)
elif 'trackModerationEvent(chatId, targetId, "ban"' not in s:
    raise SystemExit("ban stats anchor not found")

old_warn = '''  if (clean === "warn") {
    const reason = args.join(" ").trim();
    await reply(msg, `Предупреждение для ${name}.${reason ? ` Причина: ${reason}` : " Следующее нарушение может закончиться мутом или баном."}`);'''
new_warn = '''  if (clean === "warn") {
    const reason = args.join(" ").trim();
    void trackModerationEvent(chatId, targetId, "warn", issuerId, reason);
    await reply(msg, `Предупреждение для ${name}.${reason ? ` Причина: ${reason}` : " Следующее нарушение может закончиться мутом или баном."}`);'''
if old_warn in s:
    s = s.replace(old_warn, new_warn, 1)
elif 'trackModerationEvent(chatId, targetId, "warn"' not in s:
    raise SystemExit("warn stats anchor not found")

# Add /stats to Telegram's command picker.
old_menu = '''      { command: "aipost", description: "Premium: создать AI-пост" }
    ] });'''
new_menu = '''      { command: "aipost", description: "Premium: создать AI-пост" },
      { command: "stats", description: "Статистика пользователя" }
    ] });'''
if old_menu in s:
    s = s.replace(old_menu, new_menu, 1)

# Mention /stats in the private help button.
s = s.replace('/ники — список ников",', '/ники — список ников\\n/stats — статистика пользователя",')

s = s.replace('premium_ai_tools: true });', 'premium_ai_tools: true, user_stats: true });')
s = s.replace('      premium_ai_tools: true,\n      premium_price_stars:', '      premium_ai_tools: true,\n      user_stats: true,\n      premium_price_stars:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa stats patch applied")
