from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

old_route = '''  if (await handleOwnerPremium(msg, text)) return new Response("ok");
  if (await handlePremiumCommands(msg, text)) return new Response("ok");'''
new_route = '''  const ownerCommandText = /^(ownerclaim|freepremium)(?:\\s|$)/i.test(text) ? `/${text}` : text;
  if (await handleOwnerPremium(msg, ownerCommandText)) return new Response("ok");
  if (await handlePremiumCommands(msg, text)) return new Response("ok");'''
if old_route in s:
    s = s.replace(old_route, new_route, 1)
elif "const ownerCommandText" not in s:
    raise SystemExit("owner route anchor not found")

old_state = '''  const row = await premiumRow(chatId);
  const active = !!row?.active_until && Date.parse(String(row.active_until)) > Date.now();'''
new_state = '''  let row = await premiumRow(chatId);
  let active = !!row?.active_until && Date.parse(String(row.active_until)) > Date.now();
  if (!active && (await getBotOwnerId()) === userId) {
    await grantOwnerPremium(chatId, userId);
    row = await premiumRow(chatId);
    active = !!row?.active_until && Date.parse(String(row.active_until)) > Date.now();
  }'''
if old_state in s:
    s = s.replace(old_state, new_state, 1)
elif "await grantOwnerPremium(chatId, userId);" not in s:
    raise SystemExit("premium state anchor not found")

s = s.replace('owner_free_premium: true });', 'owner_free_premium: true, owner_command_without_slash: true });')
s = s.replace('      owner_free_premium: true,\n      premium_price_stars:', '      owner_free_premium: true,\n      owner_command_without_slash: true,\n      premium_price_stars:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa owner access patch applied")
