from pathlib import Path
import re

p = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = p.read_text(encoding="utf-8")

helper = r'''
function offadmEsc(v: unknown) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function offadmActorLabel(user: any) {
  if (user?.username) return `@${user.username}`;
  return String(user?.first_name ?? user?.last_name ?? `ID ${user?.id ?? "?"}`);
}

async function handleOffadmCommand(msg: any, text: string) {
  const raw = String(text ?? "").trim();
  const isOffadm = /^\/?offadm(?:@\w+)?(?:\s|$)/i.test(raw);
  if (!isOffadm) return false;

  const m = raw.match(/^\/?offadm(?:@\w+)?\s+([^\s]+)\s+by\s+(.+)$/i);
  if (!m) {
    await reply(msg, "Формат: /offadm Nick_Name by N.Nickname");
    return true;
  }

  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) {
    await reply(msg, "/offadm работает только в группе.");
    return true;
  }

  const chatId = Number(msg.chat.id);
  const issuerId = Number(msg?.from?.id);
  const level = await effectiveLevel(chatId, issuerId);
  if (level < 5) {
    await reply(msg, "/offadm доступна только администратору группы или модератору 5 уровня.");
    return true;
  }

  const target = m[1].trim().slice(0, 64);
  const byName = m[2].trim().slice(0, 80);
  const card = `<b>BLESS MANAGER</b>\n\n<code>/offadm ${offadmEsc(target)}</code>\n<b>By ${offadmEsc(byName)}</b>`;
  const keyboard = {
    inline_keyboard: [[
      { text: "Принять", callback_data: `offadm:a:${issuerId}`, style: "success" },
      { text: "Отклонить", callback_data: `offadm:r:${issuerId}`, style: "danger" },
    ]],
  };

  let sent = await tg("sendMessage", {
    chat_id: chatId,
    text: card,
    parse_mode: "HTML",
    reply_markup: keyboard,
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
  });

  // Fallback for older Telegram clients/API behavior: send the same card without button styles.
  if (!sent?.ok) {
    sent = await tg("sendMessage", {
      chat_id: chatId,
      text: card,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Принять", callback_data: `offadm:a:${issuerId}` },
          { text: "❌ Отклонить", callback_data: `offadm:r:${issuerId}` },
        ]],
      },
      ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
    });
  }

  if (!sent?.ok) {
    await reply(msg, `Не смог создать карточку /offadm: ${tgError(sent)}.`);
  }
  return true;
}

async function handleOffadmCallback(cb: any) {
  const data = String(cb?.data ?? "");
  const m = data.match(/^offadm:(a|r):(\d+)$/);
  if (!m) return false;
  const chatId = Number(cb?.message?.chat?.id);
  const userId = Number(cb?.from?.id);
  if (!chatId || !userId) return true;

  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Недостаточно прав.", show_alert: true });
    return true;
  }

  const accepted = m[1] === "a";
  const original = String(cb?.message?.text ?? "").trim();
  const actor = offadmActorLabel(cb?.from);
  const result = accepted ? "✅ ПРИНЯТО" : "❌ ОТКЛОНЕНО";

  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: accepted ? "Принято" : "Отклонено" });
  await tg("editMessageText", {
    chat_id: chatId,
    message_id: cb.message.message_id,
    text: `${original}\n\n${result}\nРешение: ${actor}`,
    reply_markup: { inline_keyboard: [] },
  });
  return true;
}
'''

serve_anchor = "\nDeno.serve(async (req: Request) => {"

# Add helpers if absent, otherwise replace the previously deployed helper block.
if "async function handleOffadmCommand" not in s:
    if serve_anchor not in s:
        raise SystemExit("serve anchor not found")
    s = s.replace(serve_anchor, "\n" + helper + serve_anchor, 1)
else:
    start = s.find("function offadmEsc")
    if start < 0:
        start = s.find("async function handleOffadmCommand")
    end = s.find(serve_anchor, start)
    if start < 0 or end < 0:
        raise SystemExit("existing offadm helper block not found")
    s = s[:start] + helper.strip("\n") + "\n" + s[end:]

# Handle button callbacks before the ordinary-message guard.
if "await handleOffadmCallback(cb)" not in s:
    if '  if (cb) {\n' in s:
        s = s.replace('  if (cb) {\n', '  if (cb) {\n    if (await handleOffadmCallback(cb)) return new Response("ok");\n', 1)
    elif '  const cb = update?.callback_query;\n' in s:
        s = s.replace('  const cb = update?.callback_query;\n', '  const cb = update?.callback_query;\n  if (cb && await handleOffadmCallback(cb)) return new Response("ok");\n', 1)
    else:
        update_anchor = '  const update = await req.json().catch(() => null);'
        if update_anchor not in s:
            raise SystemExit("update anchor not found")
        s = s.replace(update_anchor, update_anchor + '\n  const cb = update?.callback_query;\n  if (cb && await handleOffadmCallback(cb)) return new Response("ok");', 1)

# Guarantee /offadm is routed immediately after text extraction and before all other gates.
s = s.replace('  if (await handleOffadmCommand(msg, text)) return new Response("ok");\n', '')
text_anchor = '  if (!text) return new Response("ok");'
if text_anchor not in s:
    raise SystemExit("text anchor not found")
s = s.replace(text_anchor, text_anchor + '\n\n  if (await handleOffadmCommand(msg, text)) return new Response("ok");', 1)

# Ensure Telegram delivers button callbacks to the webhook.
pat = re.compile(r'allowed_updates:\s*\[([^\]]*)\]')
mm = pat.search(s)
if mm:
    vals = [x.strip() for x in mm.group(1).split(',') if x.strip()]
    existing = {v.strip('"\'') for v in vals}
    if 'callback_query' not in existing:
        vals.append('"callback_query"')
        s = pat.sub('allowed_updates: [' + ', '.join(vals) + ']', s, count=1)

p.write_text(s, encoding="utf-8")
print("/offadm card routing fixed")
