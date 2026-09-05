from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

old = 'const BASE_COMMANDS = ["ban", "unban", "kick", "mute", "unmute", "warn", "del", "pin", "unpin", "modhelp"] as const;'
new = 'const BASE_COMMANDS = ["ban", "unban", "kick", "mute", "unmute", "warn", "del", "pin", "unpin", "modhelp", "snick", "dnick", "ники"] as const;'
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("BASE_COMMANDS anchor not found")

old = '''  pin: 5,\n  unpin: 5,\n};'''
new = '''  pin: 5,\n  unpin: 5,\n  snick: 1,\n  dnick: 1,\n  "ники": 1,\n};'''
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("REQUIRED_LEVEL anchor not found")

helpers = r'''
async function getNickname(chatId: number, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null as string | null;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_nicknames`);
    q.searchParams.set("select", "nickname");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0]?.nickname ? String(rows[0].nickname) : null;
  } catch {
    return null;
  }
}

async function saveNickname(chatId: number, userId: number, nickname: string, telegramLabel: string, setBy: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_nicknames`);
    q.searchParams.set("on_conflict", "chat_id,user_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        nickname: nickname.slice(0, 64),
        telegram_label: telegramLabel.slice(0, 128),
        set_by: setBy,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function deleteNickname(chatId: number, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_nicknames`);
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("user_id", `eq.${userId}`);
    const r = await fetch(q, {
      method: "DELETE",
      headers: dbHeaders({ Prefer: "return=minimal" }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function listNicknames(chatId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return [] as Array<{ user_id: number; nickname: string; telegram_label?: string }>;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_nicknames`);
    q.searchParams.set("select", "user_id,nickname,telegram_label");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("order", "updated_at.asc");
    q.searchParams.set("limit", "100");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1600) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

async function handleNicknameCommands(msg: any, text: string) {
  const clean = commandName(text).replace(/^\//, "");
  if (!["snick", "dnick", "ники"].includes(clean)) return false;

  const chatId = Number(msg.chat.id);
  const issuerId = Number(msg.from?.id);
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) {
    await reply(msg, "Команды ников работают только в группе.");
    return true;
  }

  const level = await effectiveLevel(chatId, issuerId);
  if (level < 1) {
    await reply(msg, "Для команд ников нужен хотя бы 1 уровень модератора.");
    return true;
  }

  if (clean === "ники") {
    const rows = await listNicknames(chatId);
    if (!rows.length) {
      await reply(msg, "В этой группе ещё никому не выдавали ник через /snick.");
      return true;
    }
    const lines = rows.map((r, i) => `${i + 1}. ${r.nickname}${r.telegram_label ? ` — ${r.telegram_label}` : ` — ID ${r.user_id}`}`);
    await reply(msg, `Ники группы:\n${lines.join("\n")}`);
    return true;
  }

  const target = msg.reply_to_message?.from;
  if (!target?.id) {
    await reply(msg, clean === "snick"
      ? "Ответь на сообщение человека: /snick Новый Ник"
      : "Ответь /dnick на сообщение человека, чтобы удалить его ник.");
    return true;
  }

  const targetId = Number(target.id);
  if (clean === "dnick") {
    const old = await getNickname(chatId, targetId);
    const ok = await deleteNickname(chatId, targetId);
    await reply(msg, ok
      ? old ? `Удалил ник «${old}» у ${userLabel(target)}.` : `У ${userLabel(target)} и так не было сохранённого ника.`
      : "Не смог удалить ник.");
    return true;
  }

  const nickname = commandArgs(text).join(" ").trim();
  if (!nickname) {
    await reply(msg, "После /snick напиши ник. Например: /snick Lukas Illusion");
    return true;
  }
  if (nickname.length > 64) {
    await reply(msg, "Ник слишком длинный. Максимум 64 символа.");
    return true;
  }

  const ok = await saveNickname(chatId, targetId, nickname, userLabel(target), issuerId);
  await reply(msg, ok
    ? `Поставил ${userLabel(target)} ник: ${nickname}`
    : "Не смог сохранить ник.");
  return true;
}
'''
anchor = "\nasync function handleModeration(msg: any, text: string) {"
if "async function handleNicknameCommands" not in s:
    if anchor not in s:
        raise SystemExit("handleModeration anchor not found")
    s = s.replace(anchor, "\n" + helpers + anchor, 1)

old = '  const name = userLabel(target);'
new = '  const name = (await getNickname(chatId, targetId)) ?? userLabel(target);'
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("moderation name anchor not found")

old = '''      "5 уровень: + /pin, /unpin, /setmoder\\n\\n" +
      "/cmd ban выгнать — личное имя команды только для тебя.\\n" +'''
new = '''      "5 уровень: + /pin, /unpin, /setmoder\\n" +
      "Ники: /snick Новый Ник, /dnick, /ники\\n\\n" +
      "/cmd ban выгнать — личное имя команды только для тебя. Любую команду ников тоже можно переименовать через /cmd.\\n" +'''
if old in s:
    s = s.replace(old, new, 1)

old = '''  const resolvedText = await resolvePersonalAlias(chatId, userId, text);
  if (await handleModeration(msg, resolvedText)) return new Response("ok");'''
new = '''  const resolvedText = await resolvePersonalAlias(chatId, userId, text);
  if (await handleNicknameCommands(msg, resolvedText)) return new Response("ok");
  if (await handleModeration(msg, resolvedText)) return new Response("ok");'''
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("resolved command anchor not found")

old = '  const author = String(msg?.from?.first_name ?? msg?.from?.username ?? "").trim() || undefined;'
new = '  const author = (await getNickname(chatId, userId)) ?? (String(msg?.from?.first_name ?? msg?.from?.username ?? "").trim() || undefined);'
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit("author anchor not found")

s = s.replace('command_aliases: true });', 'command_aliases: true, nicknames: true });')
s = s.replace('      command_aliases: true,\n      api:', '      command_aliases: true,\n      nicknames: true,\n      api:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa nickname patch applied")
