from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
type VonAllMember = {
  user_id: number;
  first_name?: string | null;
  username?: string | null;
  is_bot?: boolean | null;
  active?: boolean | null;
  last_seen_at?: string | null;
};

async function rememberAllMember(chatId: number, user: any, active = true) {
  if (!SUPABASE_URL || !SERVICE_KEY || !chatId || !user?.id) return;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_chat_members`);
    q.searchParams.set("on_conflict", "chat_id,user_id");
    await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        chat_id: chatId,
        user_id: Number(user.id),
        first_name: String(user?.first_name ?? user?.last_name ?? "").slice(0,128) || null,
        username: String(user?.username ?? "").slice(0,64) || null,
        is_bot: !!user?.is_bot,
        active,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1400),
    });
  } catch {}
}

async function syncAllMembersFromUpdate(msg: any) {
  const chatId = Number(msg?.chat?.id);
  if (!chatId || !["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) return;
  if (msg?.from?.id) void rememberAllMember(chatId, msg.from, true);
  if (Array.isArray(msg?.new_chat_members)) {
    for (const user of msg.new_chat_members) if (user?.id) void rememberAllMember(chatId, user, true);
  }
  if (msg?.left_chat_member?.id) void rememberAllMember(chatId, msg.left_chat_member, false);
}

async function rememberAllAdmins(chatId: number) {
  try {
    const r = await tg("getChatAdministrators", { chat_id: chatId });
    if (!r?.ok || !Array.isArray(r?.result)) return;
    await Promise.all(r.result.map((x: any) => rememberAllMember(chatId, x?.user, true)));
  } catch {}
}

async function knownAllMembers(chatId: number): Promise<VonAllMember[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) return [];
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_chat_members`);
    q.searchParams.set("select", "user_id,first_name,username,is_bot,active,last_seen_at");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("active", "eq.true");
    q.searchParams.set("order", "last_seen_at.desc");
    q.searchParams.set("limit", "500");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1800) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

function allMentionHtml(row: VonAllMember) {
  const id = Number(row?.user_id);
  const label = row?.username ? `@${row.username}` : String(row?.first_name || `ID ${id}`);
  return `<a href="tg://user?id=${id}">${htmlEsc(label)}</a>`;
}

async function sendAllMentionBatches(msg: any, announcement: string, members: VonAllMember[]) {
  const prefix = `📢 <b>Внимание всем!</b>\n\n${htmlEsc(announcement)}\n\n`;
  const mentions = members.map(allMentionHtml);
  const batches: string[] = [];
  let current = prefix;
  for (const mention of mentions) {
    const next = current + (current === prefix ? "" : " • ") + mention;
    if (next.length > 3500) {
      batches.push(current);
      current = `🔔 ${mention}`;
    } else {
      current = next;
    }
  }
  if (current.trim()) batches.push(current);

  for (let i = 0; i < batches.length; i++) {
    await tg("sendMessage", {
      chat_id: msg.chat.id,
      text: batches[i],
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
    });
    if (i + 1 < batches.length) await new Promise(resolve => setTimeout(resolve, 120));
  }
}

async function handleAllMention(msg: any, text: string) {
  if (!/^@all(?:\\s|$)/i.test(text)) return false;
  const group = ["group", "supergroup"].includes(String(msg?.chat?.type ?? ""));
  if (!group) {
    await reply(msg, "@all работает только в группе.");
    return true;
  }
  const chatId = Number(msg.chat.id);
  const userId = Number(msg?.from?.id);
  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "@all доступен только администратору группы или модератору 5 уровня.");
    return true;
  }

  const announcement = text.replace(/^@all(?:\\s+|$)/i, "").trim();
  if (!announcement) {
    await reply(msg, "Формат: @all ваше сообщение");
    return true;
  }

  await rememberAllAdmins(chatId);
  const rows = await knownAllMembers(chatId);
  const unique = new Map<number, VonAllMember>();
  for (const row of rows) {
    const id = Number(row?.user_id);
    if (!id || row?.is_bot || id === userId) continue;
    unique.set(id, row);
  }
  const members = [...unique.values()];
  if (!members.length) {
    await reply(msg, "Пока не знаю участников этой группы. Бот начнёт запоминать их по сообщениям и входам в группу.");
    return true;
  }

  await sendAllMentionBatches(msg, announcement, members);
  return true;
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handleAllMention" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

# Keep a live registry of members the bot actually sees in this group.
text_anchor = '  const text = String(msg?.text ?? msg?.caption ?? "").trim();'
member_sync = '  void syncAllMembersFromUpdate(msg);\n\n' + text_anchor
if "void syncAllMembersFromUpdate(msg);" not in s:
    if text_anchor not in s:
        raise SystemExit("member sync anchor not found")
    s = s.replace(text_anchor, member_sync, 1)

# @all must be handled before normal AI/premium processing.
route_anchor = '  if (await handleStatsCommand(msg, text)) return new Response("ok");'
route_new = '  if (await handleAllMention(msg, text)) return new Response("ok");\n' + route_anchor
if "await handleAllMention(msg, text)" not in s:
    if route_anchor not in s:
        raise SystemExit("@all routing anchor not found")
    s = s.replace(route_anchor, route_new, 1)

path.write_text(s, encoding="utf-8")
print("Vonuchkaa @all patch applied")
