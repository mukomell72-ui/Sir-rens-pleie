from pathlib import Path

p = Path('.github/scripts/patch-vonuchkaa-premium-v2.py')
s = p.read_text(encoding='utf-8')
old = '''old_guard = ''' + "'''" + '''  if (await handleModeration(msg, resolvedText)) return new Response(\"ok\");

  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);''' + "'''" + '''
new_guard = ''' + "'''" + '''  if (await handleModeration(msg, resolvedText)) return new Response(\"ok\");
  if (await handlePremiumPlusMessage(msg, text)) return new Response(\"ok\");

  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);''' + "'''"
new = '''old_guard = ''' + "'''" + '''  if (await handleModeration(msg, resolvedText)) return new Response(\"ok\");

  if (!text.startsWith(\"/\")) void maybeAutoPromo(msg);
  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);''' + "'''" + '''
new_guard = ''' + "'''" + '''  if (await handleModeration(msg, resolvedText)) return new Response(\"ok\");
  if (await handlePremiumPlusMessage(msg, text)) return new Response(\"ok\");

  if (!text.startsWith(\"/\")) void maybeAutoPromo(msg);
  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);''' + "'''"
if old not in s:
    raise SystemExit('Premium v2 old guard definition not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Premium v2 anchor fixed')
