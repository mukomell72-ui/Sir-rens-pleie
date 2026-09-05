from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
const PROMO_PHOTO = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=85";

const PROMO_CAPTION = `<b>🔥 VONUCHKAA — БОТ, КОТОРЫЙ НЕ МОЛЧИТ</b>\n\n@Vonuchkaa_bot — AI-бот для Telegram-групп, который реально участвует в разговоре, а не отвечает одними заготовками.\n\n⚡ Отвечает практически на любые сообщения\n🧠 Понимает контекст разговора\n😈 Общается на «ты», может шутить, подкалывать и отвечать с характером\n🛡 Есть бан, мут, кик, предупреждения и уровни модераторов\n🏷 Можно выдавать участникам собственные ники\n⚙️ Модераторы могут переименовывать команды под себя через /cmd\n\n<b>Создатель: Lukas Illusion</b>\n<b>Бот: @Vonuchkaa_bot</b>\n\nДобавляй в группу и проверь сам — просто напиши ему что угодно.`;

async function handlePromoPost(msg: any, text: string) {
  const trigger = text.trim().toLowerCase();
  if (trigger !== "пост" && trigger !== "/post" && trigger !== `/post@${EXPECTED_BOT.toLowerCase()}`) return false;

  const chatId = Number(msg.chat?.id);
  const userId = Number(msg.from?.id);
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) {
    await reply(msg, "Пост можно публиковать только в группе.");
    return true;
  }

  const level = await effectiveLevel(chatId, userId);
  if (level < 5) return false;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo: PROMO_PHOTO,
    caption: PROMO_CAPTION,
    parse_mode: "HTML",
  };
  if (msg.message_thread_id) body.message_thread_id = msg.message_thread_id;

  const sent = await tg("sendPhoto", body);
  if (!sent?.ok) {
    await tg("sendMessage", {
      chat_id: chatId,
      text: PROMO_CAPTION,
      parse_mode: "HTML",
      disable_web_page_preview: false,
      ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
    });
  }

  try {
    await tg("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
  } catch {}
  return true;
}
'''

anchor = "\nasync function handleCmd(msg: any, text: string) {"
if "async function handlePromoPost" not in s:
    if anchor not in s:
        raise SystemExit("handleCmd anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

old = '''  if (await handleSetModer(msg, text)) return new Response("ok");
  if (await handleCmd(msg, text)) return new Response("ok");'''
new = '''  if (await handlePromoPost(msg, text)) return new Response("ok");
  if (await handleSetModer(msg, text)) return new Response("ok");
  if (await handleCmd(msg, text)) return new Response("ok");'''
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("handler anchor not found")

s = s.replace('command_aliases: true, nicknames: true });', 'command_aliases: true, nicknames: true, promo_post: true });')
s = s.replace('      nicknames: true,\n      api:', '      nicknames: true,\n      promo_post: true,\n      api:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa promo post patch applied")
