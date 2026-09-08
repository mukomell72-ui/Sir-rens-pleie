from pathlib import Path

p = Path('supabase/functions/vonuchkaa-ai-bot/index.ts')
s = p.read_text(encoding='utf-8')

# Hard-disable ordinary AI chat replies. All command handlers that run before
# the AI tail remain available, but normal group messages are silently ignored.
marker = '  // MODERATION_ONLY: ordinary messages are intentionally ignored\n  return new Response("ok");\n'
if marker not in s:
    anchors = [
        '  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);',
        '  void typing(chatId',
    ]
    for anchor in anchors:
        if anchor in s:
            s = s.replace(anchor, marker + '\n' + anchor, 1)
            break
    else:
        raise SystemExit('AI reply tail anchor not found')

# /aimode must not re-enable automatic AI replies while moderation-only mode is active.
text_anchor = '  const text = String(msg?.text ?? msg?.caption ?? "").trim();'
intercept = '''  if (/^\\/?aimode(?:@\\w+)?(?:\\s|$)/i.test(text)) {
    await reply(msg, "AI-ответы отключены. Бот работает как групповой бот с командами модерации.");
    return new Response("ok");
  }
'''
if 'AI-ответы отключены. Бот работает как групповой бот' not in s:
    if text_anchor not in s:
        raise SystemExit('text anchor not found')
    # Insert after the empty-text guard when possible so blank messages stay silent.
    guard = text_anchor + '\n  if (!text) return new Response("ok");'
    if guard in s:
        s = s.replace(guard, guard + '\n' + intercept, 1)
    else:
        s = s.replace(text_anchor, text_anchor + '\n' + intercept, 1)

# Make the old base /start wording neutral if it survived the start-menu patch.
s = s.replace(
    'Ну давай, пиши что угодно. Отвечу по смыслу, без лишних церемоний. Для модерации: /modhelp',
    'Бот работает для управления группой. Команды модерации: /modhelp',
)

p.write_text(s, encoding='utf-8')
print('Vonuchkaa moderation-only patch applied')
