from pathlib import Path
import runpy

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

# Stats is kept as a separate patch for maintainability, but is part of every normal deploy.
runpy.run_path(".github/scripts/patch-vonuchkaa-stats.py", run_name="__main__")

# Premium-only tracking of the bot's own outgoing messages.
s = path.read_text(encoding="utf-8")

bot_stats_helper = r'''
const BOT_STATS_MESSAGE_METHODS = new Set([
  "sendMessage", "sendPhoto", "sendVideo", "sendAnimation", "sendAudio", "sendDocument",
  "sendVoice", "sendVideoNote", "sendSticker", "sendPoll", "sendDice", "sendLocation",
  "sendVenue", "sendContact", "sendMediaGroup"
]);

async function trackPremiumBotOutgoing(method: string, body: Record<string, unknown>, result: any) {
  const chatId = Number(body?.chat_id);
  if (!BOT_STATS_MESSAGE_METHODS.has(method) || !result?.ok || !Number.isFinite(chatId) || chatId >= 0) return;
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    if (!await premiumActive(chatId)) return;
    const sentMessages = Array.isArray(result?.result) ? result.result : [result?.result];
    for (const sent of sentMessages) {
      const from = sent?.from;
      const userId = Number(from?.id);
      if (!userId) continue;
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/vonuchkaa_track_message`, {
        method: "POST",
        headers: dbHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({
          p_chat_id: chatId,
          p_user_id: userId,
          p_first_name: String(from?.first_name ?? "Вонючка").slice(0, 128) || "Вонючка",
          p_username: String(from?.username ?? EXPECTED_BOT).slice(0, 64) || EXPECTED_BOT,
        }),
        signal: AbortSignal.timeout(1400),
      });
    }
  } catch {}
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function trackPremiumBotOutgoing" not in s:
    if anchor not in s:
        raise SystemExit("bot stats helper anchor not found")
    s = s.replace(anchor, "\n" + bot_stats_helper + anchor, 1)

old_tg = '''async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3500),
  });
  return await r.json();
}'''
new_tg = '''async function tg(method: string, body: Record<string, unknown> = {}) {
  const r = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3500),
  });
  const data = await r.json();
  void trackPremiumBotOutgoing(method, body, data);
  return data;
}'''
if old_tg in s:
    s = s.replace(old_tg, new_tg, 1)
elif "void trackPremiumBotOutgoing(method, body, data);" not in s:
    raise SystemExit("tg bot stats anchor not found")

# /stats bot is a convenient Premium-only shortcut to the bot's own statistics.
old_stats_target = '''  const target = msg?.reply_to_message?.from ?? msg?.from;
  const userId = Number(target?.id);'''
new_stats_target = '''  const statsArgs = commandArgs(text);
  let target = msg?.reply_to_message?.from ?? msg?.from;
  if (String(statsArgs[0] ?? "").toLowerCase() === "bot") {
    if (!await premiumActive(Number(msg.chat.id))) {
      await reply(msg, "Статистика собственных сообщений Вонючки доступна только в Premium-группах.");
      return true;
    }
    const me = await tg("getMe");
    if (me?.ok && me?.result) target = me.result;
  }
  const userId = Number(target?.id);'''
if old_stats_target in s:
    s = s.replace(old_stats_target, new_stats_target, 1)
elif 'Статистика собственных сообщений Вонючки доступна только в Premium-группах.' not in s:
    raise SystemExit("stats bot target anchor not found")

s = s.replace('stats: true });', 'stats: true, premium_bot_message_stats: true });')
s = s.replace('      stats: true,\n      api:', '      stats: true,\n      premium_bot_message_stats: true,\n      api:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa Premium bot-message stats patch applied")
