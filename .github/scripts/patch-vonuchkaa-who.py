from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
type WhoResult = {
  user_id: number;
  nickname?: string | null;
  first_name?: string | null;
  username?: string | null;
  telegram_label?: string | null;
  score: number;
};

function whoNorm(value: unknown) {
  return String(value ?? "").trim().replace(/^@/, "").toLocaleLowerCase("ru-RU");
}

async function handleWhoCommand(msg: any, text: string) {
  if (!/^\/кто(?:@\w+)?(?:\s|$)/iu.test(text)) return false;

  if (!["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) {
    await reply(msg, "/кто работает только в группе.");
    return true;
  }

  const queryRaw = text.replace(/^\/кто(?:@\w+)?(?:\s+|$)/iu, "").trim();
  if (!queryRaw) {
    await reply(msg, "Формат: /кто Максим");
    return true;
  }

  const query = whoNorm(queryRaw);
  const chatId = Number(msg.chat.id);

  const [nickRows, memberRows] = await Promise.all([
    listNicknames(chatId),
    knownAllMembers(chatId),
  ]);

  const members = new Map<number, VonAllMember>();
  for (const row of memberRows) {
    const id = Number(row?.user_id);
    if (id) members.set(id, row);
  }

  const results = new Map<number, WhoResult>();
  const put = (userId: number, data: Partial<WhoResult>, score: number) => {
    if (!userId) return;
    const prev = results.get(userId);
    const merged: WhoResult = {
      user_id: userId,
      nickname: data.nickname ?? prev?.nickname ?? null,
      first_name: data.first_name ?? prev?.first_name ?? null,
      username: data.username ?? prev?.username ?? null,
      telegram_label: data.telegram_label ?? prev?.telegram_label ?? null,
      score: Math.max(score, prev?.score ?? 0),
    };
    results.set(userId, merged);
  };

  for (const row of nickRows) {
    const id = Number(row?.user_id);
    if (!id) continue;
    const member = members.get(id);
    const nickname = String(row?.nickname ?? "");
    const telegramLabel = String(row?.telegram_label ?? "");
    const username = String(member?.username ?? "");
    const firstName = String(member?.first_name ?? "");

    let score = 0;
    if (whoNorm(nickname) === query) score = 100;
    else if (whoNorm(nickname).includes(query)) score = 80;
    else if (whoNorm(username) === query) score = 70;
    else if (whoNorm(firstName) === query || whoNorm(telegramLabel) === query) score = 65;
    else if (whoNorm(username).includes(query) || whoNorm(firstName).includes(query) || whoNorm(telegramLabel).includes(query)) score = 50;

    if (score) put(id, { nickname, telegram_label: telegramLabel, username, first_name: firstName }, score);
  }

  // If no saved nickname matched, also allow finding a known group member by Telegram name/@username.
  if (!results.size) {
    for (const row of memberRows) {
      const id = Number(row?.user_id);
      if (!id || row?.is_bot) continue;
      const username = String(row?.username ?? "");
      const firstName = String(row?.first_name ?? "");
      let score = 0;
      if (whoNorm(username) === query || whoNorm(firstName) === query) score = 45;
      else if (whoNorm(username).includes(query) || whoNorm(firstName).includes(query)) score = 30;
      if (score) put(id, { username, first_name: firstName }, score);
    }
  }

  const found = [...results.values()]
    .sort((a, b) => b.score - a.score || String(a.nickname ?? a.first_name ?? "").localeCompare(String(b.nickname ?? b.first_name ?? ""), "ru"))
    .slice(0, 20);

  if (!found.length) {
    await reply(msg, `Никого по «${queryRaw}» не нашёл. Я ищу по сохранённым никам, имени и @username участников, которых уже видел в этой группе.`);
    return true;
  }

  const lines = found.map((r, i) => {
    const visibleName = String(r.nickname || r.first_name || r.telegram_label || `ID ${r.user_id}`);
    const userText = r.username ? `@${r.username}` : "без @username";
    return `${i + 1}. <a href="tg://user?id=${r.user_id}">${htmlEsc(visibleName)}</a> — ${htmlEsc(userText)}`;
  });

  const keyboard = found.slice(0, 10).map((r) => {
    const visibleName = String(r.nickname || r.first_name || r.telegram_label || `ID ${r.user_id}`);
    const userText = r.username ? `@${r.username}` : "профиль";
    const label = `${visibleName} — ${userText}`.slice(0, 60);
    return [{ text: label, url: `tg://user?id=${r.user_id}` }];
  });

  await tg("sendMessage", {
    chat_id: chatId,
    text: `🔎 <b>Нашёл по «${htmlEsc(queryRaw)}»:</b>\n\n${lines.join("\n")}\n\nНажми на человека — откроется его профиль.`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: keyboard },
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
  });
  return true;
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handleWhoCommand" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

route_anchor = '  if (await handleZovCommand(msg, text)) return new Response("ok");'
route_new = route_anchor + '\n  if (await handleWhoCommand(msg, text)) return new Response("ok");'
if "await handleWhoCommand(msg, text)" not in s:
    if route_anchor not in s:
        raise SystemExit("/кто routing anchor not found")
    s = s.replace(route_anchor, route_new, 1)

path.write_text(s, encoding="utf-8")
print("Vonuchkaa /кто patch applied")
