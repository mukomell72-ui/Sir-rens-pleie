from pathlib import Path
import re

p = Path('supabase/functions/vonuchkaa-ai-bot/index.ts')
s = p.read_text(encoding='utf-8')

new_gate = r'''  // VONUCHKAA_MODERATION_ONLY_GATE
  const blockedConversational = /^\/(?:aimode|summary|aipost|ideas|rewrite|translate|answer|poll|persona|voice|voices)(?:@\w+)?(?:\s|$)/i.test(text);
  if (blockedConversational) return new Response("ok");
  const vonModerationCommand = text.startsWith("/")
    || /^@all(?:\s|$)/i.test(text)
    || /^(?:ban|unban|kick|mute|unmute|warn|del|pin|unpin|modhelp)(?:@\w+)?(?:\s|$)/i.test(text);
  if (!vonModerationCommand) return new Response("ok");
'''

pattern = re.compile(
    r'  // VONUCHKAA_MODERATION_ONLY_GATE\n.*?  if \(!vonModerationCommand\) return new Response\("ok"\);\n(?:  if \(/\^\\/start.*?\n  \}\n)?',
    re.S,
)

if pattern.search(s):
    s = pattern.sub(new_gate, s, count=1)
else:
    anchor = '  if (!text) return new Response("ok");'
    if anchor not in s:
        raise SystemExit('command gate anchor not found')
    s = s.replace(anchor, anchor + '\n' + new_gate.rstrip(), 1)

p.write_text(s, encoding='utf-8')
print('Vonuchkaa command-only gate fixed')
