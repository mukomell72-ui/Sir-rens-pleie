from pathlib import Path

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

marker = '  // VONUCHKAA_MODERATION_ONLY_GATE'
start = s.find(marker)
if start >= 0:
    stop_line = '  if (!vonModerationCommand) return new Response("ok");'
    stop = s.find(stop_line, start)
    if stop < 0:
        raise SystemExit('moderation gate end not found')
    end = s.find('\n', stop + len(stop_line))
    if end < 0:
        end = stop + len(stop_line)
    else:
        end += 1

    # Older strict mode also had a special /start block directly after the gate.
    rest = s[end:]
    if rest.startswith('  if (/^\\/start'):
        close = rest.find('\n  }')
        if close >= 0:
            close_end = rest.find('\n', close + 4)
            if close_end < 0:
                close_end = close + 4
            else:
                close_end += 1
            end += close_end

    s = s[:start] + new_gate + s[end:]
else:
    anchor = '  if (!text) return new Response("ok");'
    if anchor not in s:
        raise SystemExit('command gate anchor not found')
    s = s.replace(anchor, anchor + '\n' + new_gate.rstrip(), 1)

p.write_text(s, encoding='utf-8')
print('Vonuchkaa command-only gate fixed')
