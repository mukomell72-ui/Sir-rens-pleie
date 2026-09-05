from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
type AutoPromoRow = {
  enabled: boolean;
  interval_hours: number;
  last_post_at?: string | null;
};

async function getAutoPromo(chatId: number): Promise<AutoPromoRow | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_autopromo_chats`);
    q.searchParams.set("select", "enabled,interval_hours,last_post_at");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] as AutoPromoRow : null;
  } catch {
    return null;
  }
}

async function saveAutoPromo(chatId: number, userId: number, enabled: boolean, intervalHours: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_autopromo_chats`);
    q.searchParams.set("on_conflict", "chat_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        chat_id: chatId,
        enabled,
        enabled_by: userId,
        interval_hours: intervalHours,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function markAutoPromoPosted(chatId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_autopromo_chats`);
    q.searchParams.set("chat_id", `eq.${chatId}`);
    const r = await fetch(q, {
      method: "PATCH",
      headers: dbHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({ last_post_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function sendPromoToChat(chatId: number, threadId?: number) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo: PROMO_PHOTO,
    caption: PROMO_CAPTION,
    parse_mode: "HTML",
  };
  if (threadId) body.message_thread_id = threadId;
  const sent = await tg("sendPhoto", body);
  if (sent?.ok) return true;

  const fallback = await tg("sendMessage", {
    chat_id: chatId,
    text: PROMO_CAPTION,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    ...(threadId ? { message_thread_id: threadId } : {}),
  });
  return !!fallback?.ok;
}

async function handleAutoPromo(msg: any, text: string) {
  if (commandName(text) !== "/autopromo") return false;
  const chatId = Number(msg.chat?.id);
  const userId = Number(msg.from?.id);
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) {
    await reply(msg, "/autopromo работает только в группе.");
    return true;
  }

  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "Автопиар может включить только админ группы или модератор 5 уровня.");
    return true;
  }

  const args = commandArgs(text);
  const action = String(args[0] ?? "status").toLowerCase();
  const current = await getAutoPromo(chatId);

  if (["off", "0", "выкл", "выключить"].includes(action)) {
    const ok = await saveAutoPromo(chatId, userId, false, current?.interval_hours ?? 72);
    await reply(msg, ok ? "Автопиар Вонючки выключен в этой группе." : "Не смог сохранить настройку автопиара.");
    return true;
  }

  if (["on", "1", "вкл", "включить"].includes(action)) {
    const rawHours = Number(args[1] ?? 72);
    const hours = Number.isFinite(rawHours) ? Math.max(24, Math.min(168, Math.round(rawHours))) : 72;
    const ok = await saveAutoPromo(chatId, userId, true, hours);
    await reply(msg, ok
      ? `Автопиар включён. Бот сможет публиковать свою рекламу здесь не чаще одного раза в ${hours} ч. Отключить: /autopromo off`
      : "Не смог сохранить настройку автопиара.");
    return true;
  }

  if (!current?.enabled) {
    await reply(msg, "Автопиар выключен. Включить: /autopromo on 72\nМинимальный интервал — 24 часа.");
    return true;
  }

  await reply(msg, `Автопиар включён. Интервал: ${current.interval_hours} ч.\nПоследний пост: ${current.last_post_at ? new Date(current.last_post_at).toLocaleString("ru-RU") : "ещё не публиковался"}.\nОтключить: /autopromo off`);
  return true;
}

async function maybeAutoPromo(msg: any) {
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) return;
  const chatId = Number(msg.chat?.id);
  if (!chatId) return;

  const cfg = await getAutoPromo(chatId);
  if (!cfg?.enabled) return;

  const intervalMs = Math.max(24, Number(cfg.interval_hours || 72)) * 60 * 60 * 1000;
  const last = cfg.last_post_at ? Date.parse(cfg.last_post_at) : 0;
  if (last && Date.now() - last < intervalMs) return;

  // Mark first to reduce the chance of duplicate posts if several messages arrive at once.
  const marked = await markAutoPromoPosted(chatId);
  if (!marked) return;
  await sendPromoToChat(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handleAutoPromo" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

old = '''  if (await handlePromoPost(msg, text)) return new Response("ok");
  if (await handleSetModer(msg, text)) return new Response("ok");'''
new = '''  if (await handlePromoPost(msg, text)) return new Response("ok");
  if (await handleAutoPromo(msg, text)) return new Response("ok");
  if (await handleSetModer(msg, text)) return new Response("ok");'''
if old in s:
    s = s.replace(old, new, 1)
elif "await handleAutoPromo(msg, text)" not in s:
    raise SystemExit("command handler anchor not found")

old = '''  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);'''
new = '''  if (!text.startsWith("/")) void maybeAutoPromo(msg);
  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);'''
if old in s:
    s = s.replace(old, new, 1)
elif "void maybeAutoPromo(msg);" not in s:
    raise SystemExit("typing anchor not found")

old = '''      { command: "dnick", description: "Удалить ник" }
    ] });'''
new = '''      { command: "dnick", description: "Удалить ник" },
      { command: "autopromo", description: "Автопиар в этой группе" }
    ] });'''
if old in s:
    s = s.replace(old, new, 1)

s = s.replace('start_menu: true });', 'start_menu: true, autopromo_optin: true });')
s = s.replace('      start_menu: true,\n      api:', '      start_menu: true,\n      autopromo_optin: true,\n      api:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa opt-in autopromo patch applied")
