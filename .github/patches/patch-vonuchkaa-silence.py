from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
async function silenceModeEnabled(chatId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY || !chatId) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_silence_chats`);
    q.searchParams.set("select", "enabled");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1200) });
    if (!r.ok) return false;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length > 0 && rows[0]?.enabled === true;
  } catch {
    return false;
  }
}

async function setSilenceMode(chatId: number, enabled: boolean, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY || !chatId) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_silence_chats`);
    q.searchParams.set("on_conflict", "chat_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        chat_id: chatId,
        enabled,
        enabled_by: userId || null,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1400),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function handleSilenceCommand(msg: any, text: string) {
  const m = text.match(/^\/тишина(?:@\w+)?(?:\s+(on|off|вкл|выкл|включить|выключить|статус|status|1|0))?\s*$/iu);
  if (!m) return false;

  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) {
    await reply(msg, "/тишина работает только в группе.");
    return true;
  }

  const chatId = Number(msg.chat.id);
  const userId = Number(msg?.from?.id);
  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "/тишина доступна только администратору группы или модератору 5 уровня.");
    return true;
  }

  const arg = String(m[1] ?? "on").toLocaleLowerCase("ru-RU");
  if (arg === "статус" || arg === "status") {
    const enabled = await silenceModeEnabled(chatId);
    await reply(msg, enabled ? "🔇 Режим тишины сейчас включён." : "🔊 Режим тишины сейчас выключен.");
    return true;
  }

  const enabled = !["off", "выкл", "выключить", "0"].includes(arg);
  const ok = await setSilenceMode(chatId, enabled, userId);
  if (!ok) {
    await reply(msg, "Не удалось изменить режим тишины. Попробуй ещё раз.");
    return true;
  }

  if (enabled) {
    await reply(msg, "🔇 Тишина включена. Сообщения обычных участников будут автоматически удаляться. Писать смогут только администраторы и модераторы 5 уровня. Выключить: /тишина off");
  } else {
    await reply(msg, "🔊 Тишина выключена. Участники снова могут писать.");
  }
  return true;
}

async function enforceSilenceMode(msg: any) {
  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) return false;
  const chatId = Number(msg?.chat?.id);
  const userId = Number(msg?.from?.id);
  const messageId = Number(msg?.message_id);
  if (!chatId || !userId || !messageId || msg?.from?.is_bot) return false;

  // Do not treat Telegram service events as user chat messages.
  if (msg?.new_chat_members || msg?.left_chat_member || msg?.pinned_message ||
      msg?.group_chat_created || msg?.supergroup_chat_created || msg?.channel_chat_created ||
      msg?.migrate_to_chat_id || msg?.migrate_from_chat_id || msg?.video_chat_started ||
      msg?.video_chat_ended || msg?.video_chat_participants_invited) return false;

  if (!(await silenceModeEnabled(chatId))) return false;

  // Admins and Vonuchkaa level-5 moderators can still speak and can turn the mode off.
  const level = await effectiveLevel(chatId, userId);
  if (level >= 5) return false;

  try {
    await tg("deleteMessage", { chat_id: chatId, message_id: messageId });
  } catch {}
  // Suppress all further bot processing even if Telegram could not delete the message.
  return true;
}
'''

serve_anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handleSilenceCommand" not in s:
    if serve_anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(serve_anchor, "\n" + helper + serve_anchor, 1)

route_anchor = '  if (await handleZovCommand(msg, text)) return new Response("ok");'
route_new = (
    '  if (await handleSilenceCommand(msg, text)) return new Response("ok");\n'
    '  if (await enforceSilenceMode(msg)) return new Response("ok");\n'
    + route_anchor
)
if "await enforceSilenceMode(msg)" not in s:
    if route_anchor not in s:
        raise SystemExit("silence routing anchor not found")
    s = s.replace(route_anchor, route_new, 1)

path.write_text(s, encoding="utf-8")
print("Vonuchkaa silence mode patch applied")
