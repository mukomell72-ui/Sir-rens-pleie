from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
const START_CAPTION = `<b>🤢 ВОНЮЧКА</b>\n\nЯ — дерзкий AI-бот для Telegram. Могу нормально общаться, отвечать на вопросы, шутить, подкалывать и помогать следить за порядком в группе.\n\n🧠 <b>AI-чат</b> — отвечаю по смыслу и помню недавний контекст\n🛡 <b>Модерация</b> — бан, мут, кик, предупреждения, удаление и закрепление\n🏷 <b>Ники</b> — можно выдавать участникам свои ники через /snick\n⚙️ <b>Свои команды</b> — через /cmd можно переименовать команды только для себя\n👑 <b>Создатель:</b> Lukas Illusion\n\nДобавь меня в группу, выдай права администратора и пользуйся.`;

async function sendStartMenu(msg: any) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "➕ Добавить в чат", url: `https://t.me/${EXPECTED_BOT}?startgroup=true` }],
      [{ text: "🛡 Команды", callback_data: "vonuchkaa_help" }, { text: "🏷 Ники", callback_data: "vonuchkaa_nicks" }],
      [{ text: "👑 Создатель", callback_data: "vonuchkaa_creator" }],
    ],
  };

  let photoId = "";
  try {
    const me = await tg("getMe");
    const botId = Number(me?.result?.id);
    if (botId) {
      const photos = await tg("getUserProfilePhotos", { user_id: botId, limit: 1 });
      const set = photos?.result?.photos?.[0];
      if (Array.isArray(set) && set.length) photoId = String(set[set.length - 1]?.file_id ?? "");
    }
  } catch {}

  const common: Record<string, unknown> = {
    chat_id: msg.chat.id,
    parse_mode: "HTML",
    reply_markup: keyboard,
  };

  if (photoId) {
    const sent = await tg("sendPhoto", { ...common, photo: photoId, caption: START_CAPTION });
    if (sent?.ok) return sent;
  }

  return tg("sendMessage", { ...common, text: START_CAPTION, disable_web_page_preview: true });
}

async function handleMenuCallback(cb: any) {
  const data = String(cb?.data ?? "");
  const chatId = Number(cb?.message?.chat?.id);
  if (!chatId) return;
  try { await tg("answerCallbackQuery", { callback_query_id: cb.id }); } catch {}

  if (data === "vonuchkaa_creator") {
    await tg("sendMessage", { chat_id: chatId, text: "<b>Lukas Illusion</b>", parse_mode: "HTML" });
    return;
  }
  if (data === "vonuchkaa_nicks") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "🏷 <b>Ники</b>\n\n/snick Новый Ник — поставить ник ответом на сообщение\n/dnick — удалить ник\n/ники — показать список ников\n\nЭти команды можно переименовать через /cmd.",
      parse_mode: "HTML",
    });
    return;
  }
  if (data === "vonuchkaa_help") {
    await tg("sendMessage", {
      chat_id: chatId,
      text: "🛡 <b>Основные команды</b>\n\n/ban — бан\n/unban — разбан\n/kick — кик\n/mute 10m — мут\n/unmute — снять мут\n/warn — предупреждение\n/del — удалить сообщение\n/pin — закрепить\n/unpin — открепить\n/cmd — свои названия команд\n/setmoder 1-5 — уровень модератора\n/snick — выдать ник\n/dnick — удалить ник\n/ники — список ников",
      parse_mode: "HTML",
    });
  }
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function sendStartMenu" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

old = '''    const hook = await tg("setWebhook", { url: WEBHOOK_URL, secret_token: secret, drop_pending_updates: true, allowed_updates: ["message"] });
    const ai = await verifyGemini();'''
new = '''    const hook = await tg("setWebhook", { url: WEBHOOK_URL, secret_token: secret, drop_pending_updates: true, allowed_updates: ["message", "callback_query"] });
    await tg("setMyCommands", { commands: [
      { command: "start", description: "Открыть меню Вонючки" },
      { command: "modhelp", description: "Команды модерации" },
      { command: "cmd", description: "Переименовать команду" },
      { command: "setmoder", description: "Выдать уровень модератора" },
      { command: "snick", description: "Выдать ник" },
      { command: "dnick", description: "Удалить ник" }
    ] });
    await tg("setChatMenuButton", { menu_button: { type: "commands" } });
    const ai = await verifyGemini();'''
if old in s:
    s = s.replace(old, new, 1)
elif 'allowed_updates: ["message", "callback_query"]' not in s:
    raise SystemExit("setup webhook anchor not found")

old = '''  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id || msg?.from?.is_bot) return new Response("ok");'''
new = '''  const update = await req.json().catch(() => null);
  const cb = update?.callback_query;
  if (cb) {
    await handleMenuCallback(cb);
    return new Response("ok");
  }
  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id || msg?.from?.is_bot) return new Response("ok");'''
if old in s:
    s = s.replace(old, new, 1)
elif "await handleMenuCallback(cb);" not in s:
    raise SystemExit("update handler anchor not found")

old = '''  if (text === "/start" || text === `/start@${EXPECTED_BOT}`) {
    await reply(msg, "Ну давай, пиши что угодно. Отвечу по смыслу, без лишних церемоний. Для модерации: /modhelp");
    return new Response("ok");
  }'''
new = '''  if (text === "/start" || text === `/start@${EXPECTED_BOT}`) {
    if (String(msg.chat?.type ?? "") === "private") await sendStartMenu(msg);
    else await reply(msg, "Я на месте. Для команд: /modhelp");
    return new Response("ok");
  }'''
if old in s:
    s = s.replace(old, new, 1)
elif "await sendStartMenu(msg);" not in s:
    raise SystemExit("start handler anchor not found")

s = s.replace('promo_post: true });', 'promo_post: true, start_menu: true });')
s = s.replace('      promo_post: true,\n      api:', '      promo_post: true,\n      start_menu: true,\n      api:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa start menu patch applied")
