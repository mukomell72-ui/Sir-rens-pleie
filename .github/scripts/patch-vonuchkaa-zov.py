from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
async function handleZovCommand(msg: any, text: string) {
  if (!/^\/зов(?:@\w+)?(?:\s|$)/iu.test(text)) return false;

  const group = ["group", "supergroup"].includes(String(msg?.chat?.type ?? ""));
  if (!group) {
    await reply(msg, "/зов работает только в группе.");
    return true;
  }

  const chatId = Number(msg.chat.id);
  const userId = Number(msg?.from?.id);
  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "/зов доступен только администратору группы или модератору 5 уровня.");
    return true;
  }

  const announcement = "🚨 БЛЯТЬ, ВЫ ГДЕ ВСЕ?! Почему никто не заходит в игру? Онлайн лежит мёртвый. Даю вам ровно 5 минут, чтобы зайти в игру и поднять актив. Если через 5 минут активность не поднимется — ВСЕ получите коллективный выговор. Без отмазок. ЗАШЛИ В ИГРУ. СЕЙЧАС.";

  await rememberAllAdmins(chatId);
  const rows = await knownAllMembers(chatId);
  const unique = new Map<number, VonAllMember>();
  for (const row of rows) {
    const id = Number(row?.user_id);
    if (!id || row?.is_bot || id === userId) continue;
    unique.set(id, row);
  }
  const members = [...unique.values()];

  if (members.length) {
    await sendAllMentionBatches(msg, announcement, members);
  } else {
    await tg("sendMessage", {
      chat_id: chatId,
      text: announcement,
      ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
    });
  }
  return true;
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handleZovCommand" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

route_anchor = '  if (await handleAllMention(msg, text)) return new Response("ok");'
route_new = '  if (await handleZovCommand(msg, text)) return new Response("ok");\n' + route_anchor
if "await handleZovCommand(msg, text)" not in s:
    if route_anchor not in s:
        raise SystemExit("/зов routing anchor not found")
    s = s.replace(route_anchor, route_new, 1)

path.write_text(s, encoding="utf-8")
print("Vonuchkaa /зов patch applied")
