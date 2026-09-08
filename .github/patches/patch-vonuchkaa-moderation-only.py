from pathlib import Path
import re

p = Path('supabase/functions/vonuchkaa-ai-bot/index.ts')
s = p.read_text(encoding='utf-8')

helper = r'''
type ModOnlyTarget = { user_id: number; username?: string | null; first_name?: string | null };

async function findModOnlyTarget(chatId: number, raw: string): Promise<ModOnlyTarget | null> {
  const token = String(raw ?? "").trim().replace(/^@/, "");
  if (/^\d{5,20}$/.test(token)) return { user_id: Number(token) };
  if (!/^[A-Za-z0-9_]{3,64}$/.test(token) || !SUPABASE_URL || !SERVICE_KEY) return null;
  for (const table of ["vonuchkaa_chat_members", "vonuchkaa_user_stats"]) {
    try {
      const q = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
      q.searchParams.set("select", "user_id,username,first_name");
      q.searchParams.set("chat_id", `eq.${chatId}`);
      q.searchParams.set("username", `ilike.${token}`);
      q.searchParams.set("limit", "1");
      const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1500) });
      if (!r.ok) continue;
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]?.user_id) return rows[0] as ModOnlyTarget;
    } catch {}
  }
  return null;
}

async function rememberModerationMemberUpdate(update: any) {
  const cm = update?.chat_member;
  const chatId = Number(cm?.chat?.id);
  const user = cm?.new_chat_member?.user;
  if (!chatId || !user?.id || typeof rememberAllMember !== "function") return false;
  const status = String(cm?.new_chat_member?.status ?? "");
  await rememberAllMember(chatId, user, !["left", "kicked"].includes(status));
  return true;
}

async function handleDirectModOnly(msg: any, text: string) {
  if (msg?.reply_to_message) return false;
  const m = String(text ?? "").trim().match(/^\/?(ban|unban|kick|mute|unmute|warn)(?:@\w+)?\s+(@?[A-Za-z0-9_]{3,64}|\d{5,20})(?:\s+(.*))?$/i);
  if (!m) return false;
  const clean = m[1].toLowerCase();
  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) {
    await reply(msg, "Команды модерации работают только в группе.");
    return true;
  }
  const chatId = Number(msg.chat.id);
  const issuerId = Number(msg?.from?.id);
  const level = await effectiveLevel(chatId, issuerId);
  const need = REQUIRED_LEVEL[clean] ?? 5;
  if (level < need) {
    await reply(msg, `Недостаточно прав. Для /${clean} нужен уровень ${need}, у тебя ${level}.`);
    return true;
  }

  const found = await findModOnlyTarget(chatId, m[2]);
  if (!found?.user_id) {
    await reply(msg, `Не нашёл ${m[2]} в сохранённом списке участников. Для старого пользователя можно указать Telegram ID.`);
    return true;
  }
  const targetId = Number(found.user_id);
  const label = found.username ? `@${found.username}` : (found.first_name || `ID ${targetId}`);
  const tail = String(m[3] ?? "").trim();

  if (targetId === issuerId && ["ban", "kick", "mute"].includes(clean)) {
    await reply(msg, "Нельзя применить эту команду к себе.");
    return true;
  }
  if (["ban", "kick", "mute"].includes(clean) && await targetIsAdmin(chatId, targetId)) {
    await reply(msg, "Нельзя применить эту команду к администратору или владельцу группы.");
    return true;
  }

  if (clean === "ban") {
    const r = await tg("banChatMember", { chat_id: chatId, user_id: targetId, revoke_messages: false });
    await reply(msg, r?.ok ? `Забанил ${label}.${tail ? ` Причина: ${tail}` : ""}` : `Не смог забанить ${label}: ${tgError(r)}.`);
    return true;
  }
  if (clean === "unban") {
    const r = await tg("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    await reply(msg, r?.ok ? `Разбанил ${label}.` : `Не смог разбанить ${label}: ${tgError(r)}.`);
    return true;
  }
  if (clean === "kick") {
    const ban = await tg("banChatMember", { chat_id: chatId, user_id: targetId, revoke_messages: false });
    if (!ban?.ok) { await reply(msg, `Не смог удалить ${label}: ${tgError(ban)}.`); return true; }
    const unban = await tg("unbanChatMember", { chat_id: chatId, user_id: targetId, only_if_banned: true });
    await reply(msg, unban?.ok ? `Удалил ${label} из группы.${tail ? ` Причина: ${tail}` : ""}` : `Удалил ${label}, но не смог снять бан: ${tgError(unban)}.`);
    return true;
  }
  if (clean === "mute") {
    const parts = tail.split(/\s+/).filter(Boolean);
    const duration = parseDuration(parts[0]);
    const reason = parts.slice(duration.consumed ? 1 : 0).join(" ").trim();
    const body: Record<string, unknown> = {
      chat_id: chatId,
      user_id: targetId,
      permissions: {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_send_other_messages: false,
        can_add_web_page_previews: false,
        can_change_info: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_topics: false,
      },
      use_independent_chat_permissions: true,
    };
    if (duration.seconds !== null) body.until_date = Math.floor(Date.now() / 1000) + duration.seconds;
    const r = await tg("restrictChatMember", body);
    await reply(msg, r?.ok ? `Замутил ${label} на ${duration.label}.${reason ? ` Причина: ${reason}` : ""}` : `Не смог замутить ${label}: ${tgError(r)}.`);
    return true;
  }
  if (clean === "unmute") {
    const chat = await tg("getChat", { chat_id: chatId });
    const permissions = chat?.result?.permissions ?? {
      can_send_messages: true,
      can_send_audios: true,
      can_send_documents: true,
      can_send_photos: true,
      can_send_videos: true,
      can_send_video_notes: true,
      can_send_voice_notes: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
    };
    const r = await tg("restrictChatMember", { chat_id: chatId, user_id: targetId, permissions, use_independent_chat_permissions: true });
    await reply(msg, r?.ok ? `Снял мут с ${label}.` : `Не смог снять мут с ${label}: ${tgError(r)}.`);
    return true;
  }
  if (clean === "warn") {
    await reply(msg, `Предупреждение для ${label}.${tail ? ` Причина: ${tail}` : ""}`);
    return true;
  }
  return false;
}
'''

serve_anchor = '\nDeno.serve(async (req: Request) => {'
if 'async function handleDirectModOnly' not in s:
    if serve_anchor not in s:
        raise SystemExit('serve anchor not found')
    s = s.replace(serve_anchor, '\n' + helper + serve_anchor, 1)

# Neutral wording everywhere the old base may still appear.
s = s.replace('Ну давай, пиши что угодно. Отвечу по смыслу, без лишних церемоний. Для модерации: /modhelp', 'Бот модерации группы. Список команд: /modhelp')
s = s.replace('Самого себя наказывать не дам. Хорошая попытка.', 'Нельзя применить эту команду к себе.')
s = s.replace('Админа или владельца группы так наказать не получится.', 'Нельзя применить эту команду к администратору или владельцу группы.')

# Do not make webhook setup depend on Gemini anymore.
setup_pat = re.compile(r'\s+const ai = await verifyGemini\(\);\n\s+return Response\.json\(\{\n\s+ok: !!hook\?\.ok && ai\.ok,.*?\n\s+\}, \{ status: ai\.ok \? 200 : 409 \}\);', re.S)
setup_repl = '''
    return Response.json({
      ok: !!hook?.ok,
      bot: `@${EXPECTED_BOT}`,
      moderation: true,
      moderator_levels: true,
      command_aliases: true,
      ai: false,
      webhook: hook?.description ?? null,
    }, { status: hook?.ok ? 200 : 409 });'''
if setup_pat.search(s):
    s = setup_pat.sub(setup_repl, s, count=1)

# Track member status changes too.
pat = re.compile(r'allowed_updates:\s*\[([^\]]*)\]')
m = pat.search(s)
if m:
    vals = [x.strip() for x in m.group(1).split(',') if x.strip()]
    existing = {v.strip('"\'') for v in vals}
    for want in ['message', 'callback_query', 'chat_member', 'my_chat_member']:
        if want not in existing:
            vals.append(f'"{want}"')
    s = pat.sub('allowed_updates: [' + ', '.join(vals) + ']', s, count=1)

update_anchor = '  const update = await req.json().catch(() => null);'
member_route = '  if (await rememberModerationMemberUpdate(update)) return new Response("ok");'
if member_route not in s:
    if update_anchor not in s:
        raise SystemExit('update anchor not found')
    s = s.replace(update_anchor, update_anchor + '\n' + member_route, 1)

# Only moderation/management commands are allowed. Ordinary chat and old AI/Premium/Voice commands are silent.
text_guard = '  if (!text) return new Response("ok");'
gate = r'''
  // VONUCHKAA_MODERATION_ONLY_GATE
  const vonModerationCommand = /^\/?(?:ban|unban|kick|mute|unmute|warn|del|pin|unpin|modhelp)(?:@\w+)?(?:\s|$)/i.test(text)
    || /^\/(?:start|setmoder|cmd|stats)(?:@\w+)?(?:\s|$)/i.test(text);
  if (!vonModerationCommand) return new Response("ok");
  if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
    await reply(msg, "Бот модерации группы. Команды: /warn, /mute, /unmute, /kick, /ban, /unban, /del, /pin, /unpin. Справка: /modhelp");
    return new Response("ok");
  }'''
if '// VONUCHKAA_MODERATION_ONLY_GATE' not in s:
    if '  void trackUserMessage(msg);' in s:
        s = s.replace('  void trackUserMessage(msg);', '  void trackUserMessage(msg);\n' + gate, 1)
    elif text_guard in s:
        s = s.replace(text_guard, text_guard + '\n' + gate, 1)
    else:
        raise SystemExit('text gate anchor not found')

# Direct moderation by @username / Telegram ID, while reply-based commands remain supported.
route_candidates = [
    '  if (await handleUnbanByUsername(msg, resolvedText)) return new Response("ok");',
    '  if (await handleModeration(msg, resolvedText)) return new Response("ok");',
]
if 'await handleDirectModOnly(msg, resolvedText)' not in s:
    for route in route_candidates:
        if route in s:
            s = s.replace(route, '  if (await handleDirectModOnly(msg, resolvedText)) return new Response("ok");\n' + route, 1)
            break
    else:
        raise SystemExit('moderation route anchor not found')

# Absolute stop before any AI tail.
if '// VONUCHKAA_NO_AI_FALLBACK' not in s:
    for anchor in ['  void typing(chatId,', '  await typing(chatId,', '  const author = String(msg?.from?.first_name', '  const answer = await aiReply(']:
        if anchor in s:
            s = s.replace(anchor, '  // VONUCHKAA_NO_AI_FALLBACK\n  return new Response("ok");\n\n' + anchor, 1)
            break
    else:
        raise SystemExit('AI fallback anchor not found')

p.write_text(s, encoding='utf-8')
print('Vonuchkaa strict moderation-only patch applied')
