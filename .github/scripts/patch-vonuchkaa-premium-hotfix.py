from pathlib import Path
import re

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

# Telegram recurring Star subscriptions cannot be sent directly with sendInvoice.
# They must be created with createInvoiceLink and opened through the exported link.
new_invoice = r'''async function sendPremiumInvoice(msg: any) {
  const chatId = Number(msg.chat.id);
  const created = await tg("createInvoiceLink", {
    title: "Вонючка Premium",
    description: "Premium для этой группы: расширенная AI-память, свой характер, приветствия, сводки и AI-посты.",
    payload: `vprem:${chatId}`,
    currency: "XTR",
    prices: [{ label: "Вонючка Premium — 30 дней", amount: PREMIUM_PRICE_STARS }],
    subscription_period: PREMIUM_PERIOD_SECONDS,
  });
  if (!created?.ok || !created?.result) return created;

  const sent = await tg("sendMessage", {
    chat_id: chatId,
    text: `💎 <b>Вонючка Premium</b>\n\nНажми кнопку ниже для оформления подписки за <b>${PREMIUM_PRICE_STARS} ⭐ / 30 дней</b>.`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: `💎 Купить Premium — ${PREMIUM_PRICE_STARS} ⭐`, url: String(created.result) }]],
    },
    ...(msg.message_thread_id ? { message_thread_id: msg.message_thread_id } : {}),
  });
  return sent;
}

async function handlePremiumPreCheckout'''

pat = re.compile(r'async function sendPremiumInvoice\(msg: any\) \{.*?\n\}\n\nasync function handlePremiumPreCheckout', re.S)
if not pat.search(s):
    raise SystemExit("sendPremiumInvoice anchor not found")
s = pat.sub(new_invoice, s, count=1)

owner_helper = r'''
const OWNER_CLAIM_SHA256 = "6b981d4f2c660fa4267d6df4692ccf674cd75bba2ecc2ba6d20caab6139018f8";

async function getBotOwnerId() {
  if (!SUPABASE_URL || !SERVICE_KEY) return null as number | null;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_bot_owner`);
    q.searchParams.set("select", "owner_user_id");
    q.searchParams.set("id", "eq.1");
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows[0]?.owner_user_id ? Number(rows[0].owner_user_id) : null;
  } catch {
    return null;
  }
}

async function claimBotOwner(userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const existing = await getBotOwnerId();
  if (existing) return existing === userId;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_bot_owner`);
    q.searchParams.set("on_conflict", "id");
    await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({ id: 1, owner_user_id: userId }),
      signal: AbortSignal.timeout(1600),
    });
    return (await getBotOwnerId()) === userId;
  } catch {
    return false;
  }
}

async function grantOwnerPremium(chatId: number, userId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_chats`);
    q.searchParams.set("on_conflict", "chat_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({
        chat_id: chatId,
        active_until: "2099-12-31T23:59:59.000Z",
        payer_user_id: userId,
        telegram_charge_id: null,
        recurring: false,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(1800),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function handleOwnerPremium(msg: any, text: string) {
  const cmd = commandName(text);
  if (cmd !== "/ownerclaim" && cmd !== "/freepremium") return false;
  const userId = Number(msg?.from?.id);
  if (!userId) return true;

  if (cmd === "/ownerclaim") {
    if (String(msg.chat?.type ?? "") !== "private") {
      await reply(msg, "Эту команду используй только в личке с ботом.");
      return true;
    }
    const code = commandArgs(text).join(" ").trim();
    if (!code || await sha256hex(code) !== OWNER_CLAIM_SHA256) {
      await reply(msg, "Неверный код владельца.");
      return true;
    }
    const ok = await claimBotOwner(userId);
    await reply(msg, ok ? "👑 Ты зарегистрирован как владелец Вонючки." : "Владелец уже зарегистрирован другим Telegram-аккаунтом.");
    return true;
  }

  const ownerId = await getBotOwnerId();
  if (ownerId !== userId) {
    await reply(msg, "Эта команда доступна только владельцу Вонючки.");
    return true;
  }
  if (!["group", "supergroup"].includes(String(msg.chat?.type ?? ""))) {
    await reply(msg, "Напиши /freepremium в той группе, где хочешь бесплатный Premium.");
    return true;
  }
  const chatId = Number(msg.chat.id);
  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "Сначала у тебя должны быть права администратора в этой группе.");
    return true;
  }
  const ok = await grantOwnerPremium(chatId, userId);
  await reply(msg, ok ? "💎 <b>Premium для владельца активирован бесплатно до 2099 года.</b>" : "Не смог активировать бесплатный Premium.", { parse_mode: "HTML" });
  return true;
}
'''

anchor = "\nasync function handlePremiumCommands(msg: any, text: string) {"
if "async function handleOwnerPremium" not in s:
    if anchor not in s:
        raise SystemExit("premium commands anchor not found")
    s = s.replace(anchor, "\n" + owner_helper + anchor, 1)

old_route = '  if (await handlePremiumCommands(msg, text)) return new Response("ok");'
new_route = '  if (await handleOwnerPremium(msg, text)) return new Response("ok");\n  if (await handlePremiumCommands(msg, text)) return new Response("ok");'
if new_route not in s:
    if old_route not in s:
        raise SystemExit("premium route anchor not found")
    s = s.replace(old_route, new_route, 1)

s = s.replace('stars_subscription: true });', 'stars_subscription: true, premium_invoice_link: true, owner_free_premium: true });')
s = s.replace('      stars_subscription: true,\n      premium_price_stars:', '      stars_subscription: true,\n      premium_invoice_link: true,\n      owner_free_premium: true,\n      premium_price_stars:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa Premium hotfix applied")
