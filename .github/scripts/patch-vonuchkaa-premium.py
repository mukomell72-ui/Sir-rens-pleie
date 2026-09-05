from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
const PREMIUM_PRICE_STARS = 199;
const PREMIUM_PERIOD_SECONDS = 2592000;

type PremiumSettings = {
  persona?: string | null;
  welcome_enabled?: boolean;
  welcome_text?: string | null;
};

async function premiumRow(chatId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null as any;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_chats`);
    q.searchParams.set("select", "active_until,payer_user_id,telegram_charge_id,recurring");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

async function premiumActive(chatId: number) {
  const row = await premiumRow(chatId);
  return !!row?.active_until && Date.parse(String(row.active_until)) > Date.now();
}

async function getPremiumSettings(chatId: number): Promise<PremiumSettings | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_settings`);
    q.searchParams.set("select", "persona,welcome_enabled,welcome_text");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] as PremiumSettings : null;
  } catch {
    return null;
  }
}

async function savePremiumSettings(chatId: number, patch: PremiumSettings) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_settings`);
    q.searchParams.set("on_conflict", "chat_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ chat_id: chatId, ...patch, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(1600),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function activatePremium(chatId: number, userId: number, payment: any) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const expSeconds = Number(payment?.subscription_expiration_date ?? 0);
    const activeUntil = expSeconds > 0
      ? new Date(expSeconds * 1000).toISOString()
      : new Date(Date.now() + PREMIUM_PERIOD_SECONDS * 1000).toISOString();
    const charge = String(payment?.telegram_payment_charge_id ?? "");

    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_chats`);
    q.searchParams.set("on_conflict", "chat_id");
    const main = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        chat_id: chatId,
        active_until: activeUntil,
        payer_user_id: userId,
        telegram_charge_id: charge || null,
        recurring: !!payment?.is_recurring,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1800),
    });
    if (!main.ok) return false;

    if (charge) {
      const p = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_payments`);
      p.searchParams.set("on_conflict", "telegram_charge_id");
      await fetch(p, {
        method: "POST",
        headers: dbHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
        body: JSON.stringify({
          chat_id: chatId,
          user_id: userId,
          telegram_charge_id: charge,
          stars: Number(payment?.total_amount ?? PREMIUM_PRICE_STARS),
          expiration_date: activeUntil,
          is_recurring: !!payment?.is_recurring,
          is_first_recurring: !!payment?.is_first_recurring,
        }),
        signal: AbortSignal.timeout(1800),
      }).catch(() => null);
    }
    return true;
  } catch {
    return false;
  }
}

function premiumText(active = false, until?: string) {
  const status = active
    ? `\n\n💎 <b>Premium активен${until ? ` до ${new Date(until).toLocaleDateString("ru-RU")}` : ""}</b>`
    : `\n\nЦена: <b>${PREMIUM_PRICE_STARS} ⭐ в месяц</b>. Подписка продлевается каждые 30 дней.`;
  return `<b>💎 ВОНЮЧКА PREMIUM</b>\n\n` +
    `🧠 Расширенная память диалога — до 30 последних сообщений\n` +
    `🎭 /persona — свой характер и стиль Вонючки для группы\n` +
    `👋 /welcome — своё автоматическое приветствие новых участников\n` +
    `📝 /summary — краткая сводка последних сообщений чата\n` +
    `📣 /aipost — AI сам пишет красивый пост по теме\n` +
    `🚫 Без автоматической рекламы Вонючки в Premium-группе\n` +
    `⚙️ Все обычные функции: AI, бан, мут, кик, ники, /cmd и уровни модераторов` + status;
}

async function sendPremiumInvoice(msg: any) {
  const chatId = Number(msg.chat.id);
  return tg("sendInvoice", {
    chat_id: chatId,
    title: "Вонючка Premium",
    description: "Premium для этой группы: расширенная AI-память, свой характер, приветствия, сводки и AI-посты.",
    payload: `vprem:${chatId}`,
    currency: "XTR",
    prices: [{ label: "Вонючка Premium — 30 дней", amount: PREMIUM_PRICE_STARS }],
    subscription_period: PREMIUM_PERIOD_SECONDS,
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
  });
}

async function handlePremiumPreCheckout(q: any) {
  const payload = String(q?.invoice_payload ?? "");
  const m = payload.match(/^vprem:(-?\d+)$/);
  if (!m || q?.currency !== "XTR" || Number(q?.total_amount) !== PREMIUM_PRICE_STARS) {
    await tg("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: false, error_message: "Некорректный платёж Premium." });
    return;
  }
  const chatId = Number(m[1]);
  const userId = Number(q?.from?.id);
  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await tg("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: false, error_message: "Premium для группы может подключить только её администратор." });
    return;
  }
  if (await premiumActive(chatId)) {
    await tg("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: false, error_message: "В этой группе Premium уже активен." });
    return;
  }
  await tg("answerPreCheckoutQuery", { pre_checkout_query_id: q.id, ok: true });
}

async function handlePremiumPayment(msg: any) {
  const payment = msg?.successful_payment;
  if (!payment) return false;
  const payload = String(payment?.invoice_payload ?? "");
  const m = payload.match(/^vprem:(-?\d+)$/);
  if (!m || payment?.currency !== "XTR") return false;
  const chatId = Number(m[1]);
  const userId = Number(msg?.from?.id);
  const ok = await activatePremium(chatId, userId, payment);
  await tg("sendMessage", {
    chat_id: chatId,
    text: ok
      ? "💎 <b>Вонючка Premium активирован!</b>\n\nТеперь доступны /persona, /welcome, /summary и /aipost. Расширенная память AI включена автоматически."
      : "Платёж прошёл, но не удалось активировать Premium автоматически. Сохрани квитанцию и обратись к владельцу бота.",
    parse_mode: "HTML",
  });
  return true;
}

async function premiumRequired(msg: any) {
  const chatId = Number(msg.chat.id);
  if (await premiumActive(chatId)) return true;
  await reply(msg, `Эта функция доступна в 💎 Premium. Напиши /premium — ${PREMIUM_PRICE_STARS} ⭐/месяц.`);
  return false;
}

async function summarizePremium(chatId: number) {
  const history = await loadMemory(chatId, 30);
  if (!history.length) return "Пока нечего подводить — в памяти чата мало сообщений.";
  const transcript = history.map(r => `${r.role === "model" ? "Бот" : "Чат"}: ${r.content}`).join("\n").slice(0, 12000);
  const prompt = `Сделай полезную и компактную сводку последних сообщений Telegram-чата. Выдели главные темы, решения, вопросы и важные детали. Не выдумывай факты.\n\n${transcript}`;
  for (const model of AI_MODELS) {
    try {
      const out = await callInteraction(model, prompt, model.includes("flash-lite") ? 4500 : 6000);
      if (out.text) return out.text;
    } catch {}
  }
  return "Не смог сейчас собрать сводку. Попробуй ещё раз чуть позже.";
}

async function makePremiumPost(topic: string) {
  const prompt = `Напиши готовый красивый пост для Telegram по теме ниже. Сделай цепляющий заголовок, 2-4 коротких абзаца, уместные эмодзи и сильный финал. Без пояснений от себя — только готовый пост.\n\nТема: ${topic.slice(0, 1800)}`;
  for (const model of AI_MODELS) {
    try {
      const out = await callInteraction(model, prompt, model.includes("flash-lite") ? 4500 : 6000);
      if (out.text) return out.text;
    } catch {}
  }
  return "Не смог сейчас сгенерировать пост. Попробуй ещё раз.";
}

async function handlePremiumCommands(msg: any, text: string) {
  const cmd = commandName(text);
  if (!["/premium", "/premium_status", "/persona", "/welcome", "/summary", "/aipost"].includes(cmd)) return false;
  const chatId = Number(msg.chat?.id);
  const userId = Number(msg.from?.id);
  const group = ["group", "supergroup"].includes(String(msg.chat?.type ?? ""));

  if (!group) {
    if (cmd === "/premium" || cmd === "/premium_status") {
      await reply(msg, premiumText(false) + "\n\nPremium подключается для конкретной группы. Добавь Вонючку в группу и напиши там /premium.", { parse_mode: "HTML" });
    } else {
      await reply(msg, "Premium-функции работают внутри группы.");
    }
    return true;
  }

  const row = await premiumRow(chatId);
  const active = !!row?.active_until && Date.parse(String(row.active_until)) > Date.now();

  if (cmd === "/premium_status") {
    await reply(msg, premiumText(active, row?.active_until), { parse_mode: "HTML" });
    return true;
  }

  if (cmd === "/premium") {
    if (active) {
      await reply(msg, premiumText(true, row?.active_until), { parse_mode: "HTML" });
      return true;
    }
    const level = await effectiveLevel(chatId, userId);
    if (level < 5) {
      await reply(msg, premiumText(false) + "\n\nПодключить Premium может администратор этой группы.", { parse_mode: "HTML" });
      return true;
    }
    await reply(msg, premiumText(false), { parse_mode: "HTML" });
    const invoice = await sendPremiumInvoice(msg);
    if (!invoice?.ok) await reply(msg, `Не смог открыть оплату: ${tgError(invoice)}.`);
    return true;
  }

  if (!await premiumRequired(msg)) return true;

  if (cmd === "/summary") {
    await reply(msg, await summarizePremium(chatId));
    return true;
  }

  if (cmd === "/aipost") {
    const topic = commandArgs(text).join(" ").trim();
    if (!topic) {
      await reply(msg, "Напиши тему после команды. Например: /aipost розыгрыш среди участников группы");
      return true;
    }
    await reply(msg, await makePremiumPost(topic));
    return true;
  }

  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "Менять Premium-настройки может только админ группы или модератор 5 уровня.");
    return true;
  }

  if (cmd === "/persona") {
    const value = commandArgs(text).join(" ").trim();
    if (!value) {
      const current = await getPremiumSettings(chatId);
      await reply(msg, `Текущий характер: ${current?.persona || "стандартный"}.\n\nПример: /persona Очень дерзкий, короткие ответы, много сарказма\nСброс: /persona reset`);
      return true;
    }
    if (["reset", "default", "сброс"].includes(value.toLowerCase())) {
      const ok = await savePremiumSettings(chatId, { persona: null });
      await reply(msg, ok ? "Вернул стандартный характер Вонючки." : "Не смог сохранить настройку.");
      return true;
    }
    const ok = await savePremiumSettings(chatId, { persona: value.slice(0, 600) });
    await reply(msg, ok ? `Готово. Новый характер группы: ${value.slice(0, 600)}` : "Не смог сохранить характер.");
    return true;
  }

  if (cmd === "/welcome") {
    const args = commandArgs(text);
    const action = String(args[0] ?? "status").toLowerCase();
    const current = await getPremiumSettings(chatId);
    if (["off", "0", "выкл", "выключить"].includes(action)) {
      const ok = await savePremiumSettings(chatId, { welcome_enabled: false });
      await reply(msg, ok ? "Автоприветствие выключено." : "Не смог сохранить настройку.");
      return true;
    }
    if (["on", "1", "вкл", "включить"].includes(action)) {
      const custom = args.slice(1).join(" ").trim();
      const welcomeText = (custom || current?.welcome_text || "Привет, {name}! Добро пожаловать в {chat}.").slice(0, 900);
      const ok = await savePremiumSettings(chatId, { welcome_enabled: true, welcome_text: welcomeText });
      await reply(msg, ok ? `Автоприветствие включено:\n${welcomeText}\n\nМожно использовать {name} и {chat}.` : "Не смог сохранить настройку.");
      return true;
    }
    await reply(msg, `Автоприветствие: ${current?.welcome_enabled ? "включено" : "выключено"}.\nТекст: ${current?.welcome_text || "по умолчанию"}\n\nВключить: /welcome on Привет, {name}! Добро пожаловать в {chat}.\nВыключить: /welcome off`);
    return true;
  }

  return true;
}

async function handlePremiumWelcome(msg: any) {
  const members = Array.isArray(msg?.new_chat_members) ? msg.new_chat_members : [];
  if (!members.length) return false;
  const chatId = Number(msg.chat?.id);
  if (!await premiumActive(chatId)) return false;
  const cfg = await getPremiumSettings(chatId);
  if (!cfg?.welcome_enabled) return false;
  const template = String(cfg.welcome_text || "Привет, {name}! Добро пожаловать в {chat}.");
  const chatName = String(msg.chat?.title || "наш чат");
  for (const member of members.slice(0, 10)) {
    if (member?.is_bot && String(member?.username ?? "").toLowerCase() === EXPECTED_BOT.toLowerCase()) continue;
    const name = userLabel(member);
    const text = template.replaceAll("{name}", name).replaceAll("{chat}", chatName);
    await tg("sendMessage", { chat_id: chatId, text: text.slice(0, 3900), ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}) });
  }
  return true;
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handlePremiumCommands" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

# Premium gets a longer conversation window.
s = s.replace(
    'async function loadMemory(chatId: number): Promise<MemoryRow[]> {',
    'async function loadMemory(chatId: number, limit = 12): Promise<MemoryRow[]> {'
)
s = s.replace(
    'q.searchParams.set("limit", "12");',
    'q.searchParams.set("limit", String(Math.max(1, Math.min(40, limit))));',
    1
)
old_ai = '''  const history = await loadMemory(chatId);
  const prompt = buildInput(history, input, meta.firstName, meta.replyTo);'''
new_ai = '''  const premium = await premiumActive(chatId);
  const history = await loadMemory(chatId, premium ? 30 : 12);
  const premiumSettings = premium ? await getPremiumSettings(chatId) : null;
  const prompt = buildInput(history, input, meta.firstName, meta.replyTo) +
    (premiumSettings?.persona ? `\\n\\nДополнительная настройка характера именно для этой группы: ${String(premiumSettings.persona).slice(0, 600)}` : "");'''
if old_ai in s:
    s = s.replace(old_ai, new_ai, 1)
elif "const premium = await premiumActive(chatId);" not in s:
    raise SystemExit("aiReply memory anchor not found")

# Premium groups never receive the optional self-promo loop.
old_auto = '''  const chatId = Number(msg.chat?.id);
  if (!chatId) return;

  const cfg = await getAutoPromo(chatId);'''
new_auto = '''  const chatId = Number(msg.chat?.id);
  if (!chatId) return;
  if (await premiumActive(chatId)) return;

  const cfg = await getAutoPromo(chatId);'''
if old_auto in s:
    s = s.replace(old_auto, new_auto, 1)

# Allow Telegram payment pre-checkout updates.
s = s.replace(
    'allowed_updates: ["message", "callback_query"]',
    'allowed_updates: ["message", "callback_query", "pre_checkout_query"]'
)

# Add Premium commands to the Telegram command menu.
old_menu = '''      { command: "autopromo", description: "Автопиар в этой группе" }
    ] });'''
new_menu = '''      { command: "autopromo", description: "Автопиар в этой группе" },
      { command: "premium", description: "Подключить Вонючка Premium" },
      { command: "premium_status", description: "Статус Premium" },
      { command: "persona", description: "Premium: характер бота" },
      { command: "welcome", description: "Premium: приветствие" },
      { command: "summary", description: "Premium: сводка чата" },
      { command: "aipost", description: "Premium: создать AI-пост" }
    ] });'''
if old_menu in s:
    s = s.replace(old_menu, new_menu, 1)

# Add a Premium button to /start menu.
old_kb = '''      [{ text: "🛡 Команды", callback_data: "vonuchkaa_help" }, { text: "🏷 Ники", callback_data: "vonuchkaa_nicks" }],
      [{ text: "👑 Создатель", callback_data: "vonuchkaa_creator" }],'''
new_kb = '''      [{ text: "🛡 Команды", callback_data: "vonuchkaa_help" }, { text: "🏷 Ники", callback_data: "vonuchkaa_nicks" }],
      [{ text: "💎 Premium", callback_data: "vonuchkaa_premium" }],
      [{ text: "👑 Создатель", callback_data: "vonuchkaa_creator" }],'''
if old_kb in s:
    s = s.replace(old_kb, new_kb, 1)

old_cb = '''  if (data === "vonuchkaa_creator") {'''
new_cb = '''  if (data === "vonuchkaa_premium") {
    await tg("sendMessage", { chat_id: chatId, text: premiumText(false) + "\\n\\nДобавь бота в группу и напиши там /premium, чтобы подключить Premium к этой группе.", parse_mode: "HTML" });
    return;
  }
  if (data === "vonuchkaa_creator") {'''
if old_cb in s:
    s = s.replace(old_cb, new_cb, 1)

# Handle pre-checkout before callback/message routing.
old_update = '''  const update = await req.json().catch(() => null);
  const cb = update?.callback_query;'''
new_update = '''  const update = await req.json().catch(() => null);
  const pre = update?.pre_checkout_query;
  if (pre) {
    await handlePremiumPreCheckout(pre);
    return new Response("ok");
  }
  const cb = update?.callback_query;'''
if old_update in s:
    s = s.replace(old_update, new_update, 1)
elif "await handlePremiumPreCheckout(pre);" not in s:
    raise SystemExit("update routing anchor not found")

# Successful payments and welcome service messages have no normal text.
old_msg = '''  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id || msg?.from?.is_bot) return new Response("ok");

  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");'''
new_msg = '''  const msg = update?.message;
  if (!msg?.chat?.id || !msg?.message_id || msg?.from?.is_bot) return new Response("ok");
  if (msg?.successful_payment) {
    await handlePremiumPayment(msg);
    return new Response("ok");
  }
  if (Array.isArray(msg?.new_chat_members) && msg.new_chat_members.length) {
    await handlePremiumWelcome(msg);
  }

  const text = String(msg?.text ?? msg?.caption ?? "").trim();
  if (!text) return new Response("ok");'''
if old_msg in s:
    s = s.replace(old_msg, new_msg, 1)
elif "msg?.successful_payment" not in s:
    raise SystemExit("message routing anchor not found")

# Premium commands run before other group settings.
old_handlers = '''  if (await handlePromoPost(msg, text)) return new Response("ok");
  if (await handleAutoPromo(msg, text)) return new Response("ok");'''
new_handlers = '''  if (await handlePremiumCommands(msg, text)) return new Response("ok");
  if (await handlePromoPost(msg, text)) return new Response("ok");
  if (await handleAutoPromo(msg, text)) return new Response("ok");'''
if old_handlers in s:
    s = s.replace(old_handlers, new_handlers, 1)
elif "await handlePremiumCommands(msg, text)" not in s:
    raise SystemExit("command routing anchor not found")

# Health/setup feature flags.
s = s.replace('autopromo_optin: true });', 'autopromo_optin: true, premium: true, stars_subscription: true });')
s = s.replace('      autopromo_optin: true,\n      api:', '      autopromo_optin: true,\n      premium: true,\n      stars_subscription: true,\n      premium_price_stars: PREMIUM_PRICE_STARS,\n      api:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa Premium patch applied")
