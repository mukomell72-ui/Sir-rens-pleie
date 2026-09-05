from pathlib import Path
import re

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
type PremiumPlusSettings = {
  goodbye_enabled?: boolean;
  goodbye_text?: string | null;
  rules_text?: string | null;
  ai_mode?: "all" | "mention" | "reply" | "off";
  links_block?: boolean;
  caps_block?: boolean;
  badwords_enabled?: boolean;
};

async function getPremiumPlusSettings(chatId: number): Promise<PremiumPlusSettings> {
  if (!SUPABASE_URL || !SERVICE_KEY) return {};
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_settings`);
    q.searchParams.set("select", "goodbye_enabled,goodbye_text,rules_text,ai_mode,links_block,caps_block,badwords_enabled");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("limit", "1");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1400) });
    if (!r.ok) return {};
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] as PremiumPlusSettings : {};
  } catch {
    return {};
  }
}

async function savePremiumPlusSettings(chatId: number, patch: PremiumPlusSettings) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  const current = await getPremiumPlusSettings(chatId);
  const merged = {
    goodbye_enabled: current.goodbye_enabled ?? false,
    goodbye_text: current.goodbye_text ?? null,
    rules_text: current.rules_text ?? null,
    ai_mode: current.ai_mode ?? "all",
    links_block: current.links_block ?? false,
    caps_block: current.caps_block ?? false,
    badwords_enabled: current.badwords_enabled ?? false,
    ...patch,
  };
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_settings`);
    q.searchParams.set("on_conflict", "chat_id");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ chat_id: chatId, ...merged, updated_at: new Date().toISOString() }),
      signal: AbortSignal.timeout(1800),
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function premiumBadwords(chatId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return [] as string[];
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_badwords`);
    q.searchParams.set("select", "word");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("order", "word.asc");
    q.searchParams.set("limit", "100");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1200) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows.map((x: any) => String(x.word ?? "")).filter(Boolean) : [];
  } catch { return []; }
}

async function addPremiumBadword(chatId: number, userId: number, word: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_badwords`);
    q.searchParams.set("on_conflict", "chat_id,word");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({ chat_id: chatId, word: word.toLowerCase().slice(0, 64), added_by: userId }),
      signal: AbortSignal.timeout(1400),
    });
    return r.ok;
  } catch { return false; }
}

async function delPremiumBadword(chatId: number, word: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_badwords`);
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("word", `eq.${word.toLowerCase().slice(0,64)}`);
    const r = await fetch(q, { method: "DELETE", headers: dbHeaders({ Prefer: "return=minimal" }), signal: AbortSignal.timeout(1400) });
    return r.ok;
  } catch { return false; }
}

async function premiumAutoreplies(chatId: number) {
  if (!SUPABASE_URL || !SERVICE_KEY) return [] as Array<{trigger_text:string;response_text:string}>;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_autoreplies`);
    q.searchParams.set("select", "trigger_text,response_text");
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("order", "created_at.asc");
    q.searchParams.set("limit", "50");
    const r = await fetch(q, { headers: dbHeaders(), signal: AbortSignal.timeout(1200) });
    if (!r.ok) return [];
    const rows = await r.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

async function addPremiumAutoreply(chatId: number, userId: number, triggerText: string, responseText: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_autoreplies`);
    q.searchParams.set("on_conflict", "chat_id,trigger_text");
    const r = await fetch(q, {
      method: "POST",
      headers: dbHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ chat_id: chatId, trigger_text: triggerText.toLowerCase().slice(0,80), response_text: responseText.slice(0,1500), added_by: userId }),
      signal: AbortSignal.timeout(1500),
    });
    return r.ok;
  } catch { return false; }
}

async function delPremiumAutoreply(chatId: number, triggerText: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const q = new URL(`${SUPABASE_URL}/rest/v1/vonuchkaa_premium_autoreplies`);
    q.searchParams.set("chat_id", `eq.${chatId}`);
    q.searchParams.set("trigger_text", `eq.${triggerText.toLowerCase().slice(0,80)}`);
    const r = await fetch(q, { method: "DELETE", headers: dbHeaders({ Prefer: "return=minimal" }), signal: AbortSignal.timeout(1400) });
    return r.ok;
  } catch { return false; }
}

async function premiumAi(prompt: string) {
  for (const model of AI_MODELS) {
    try {
      const out = await callInteraction(model, prompt, model.includes("flash-lite") ? 4500 : 6000);
      if (out.text) return out.text;
    } catch {}
  }
  return "AI сейчас не успел ответить. Попробуй ещё раз.";
}

function premiumPlusHelp(active = false) {
  return `<b>💎 ВОНЮЧКА PREMIUM 2.0</b>\n\n` +
    `Premium превращает бота не просто в болталку, а в полноценного AI-админа группы.\n\n` +
    `<b>🧠 AI и контент</b>\n` +
    `• память до 60 последних сообщений\n` +
    `• /summary — умная сводка чата\n` +
    `• /aipost — готовый пост\n` +
    `• /ideas — идеи по любой теме\n` +
    `• /rewrite — переписать текст лучше\n` +
    `• /translate — перевод текста\n` +
    `• /answer — придумать ответ на сообщение\n` +
    `• /poll — AI создаёт опрос с вариантами\n` +
    `• /persona — свой характер бота\n\n` +
    `<b>🛡 Умная модерация</b>\n` +
    `• /badword — свой список запрещённых слов\n` +
    `• /links — автоматическое удаление ссылок\n` +
    `• /caps — защита от сообщений КАПСОМ\n` +
    `• /aimode — когда AI должен отвечать\n\n` +
    `<b>⚙️ Автоматизация группы</b>\n` +
    `• /welcome — своё приветствие\n` +
    `• /goodbye — сообщение при выходе\n` +
    `• /rules и /rules_ai — правила группы\n` +
    `• /autoreply — автоматические ответы на фразы\n` +
    `• /premium_stats — статистика настроек\n` +
    `• без автопиара Вонючки\n\n` +
    (active ? `✅ <b>Premium активен в этой группе.</b>` : `Цена: <b>${PREMIUM_PRICE_STARS} ⭐ / 30 дней</b>`);
}

async function handlePremiumGoodbye(msg: any) {
  const left = msg?.left_chat_member;
  if (!left?.id || !msg?.chat?.id) return false;
  const chatId = Number(msg.chat.id);
  if (!await premiumActive(chatId)) return false;
  const cfg = await getPremiumPlusSettings(chatId);
  if (!cfg.goodbye_enabled) return false;
  const name = userLabel(left);
  const chat = String(msg?.chat?.title ?? "этого чата");
  const template = String(cfg.goodbye_text || "Пока, {name}. Не пропадай 👋");
  await tg("sendMessage", { chat_id: chatId, text: template.replaceAll("{name}", name).replaceAll("{chat}", chat).slice(0,3900) });
  return true;
}

async function handlePremiumPlusMessage(msg: any, text: string) {
  const chatId = Number(msg?.chat?.id);
  if (!chatId || !["group", "supergroup"].includes(String(msg?.chat?.type ?? ""))) return false;
  if (!await premiumActive(chatId)) return false;
  if (text.startsWith("/")) return false;

  const cfg = await getPremiumPlusSettings(chatId);
  const lower = text.toLowerCase();

  if (cfg.links_block && /(?:https?:\/\/|www\.|t\.me\/)/i.test(text)) {
    await tg("deleteMessage", { chat_id: chatId, message_id: msg.message_id }).catch(() => null);
    await tg("sendMessage", { chat_id: chatId, text: `🔗 ${userLabel(msg.from)}, ссылки здесь запрещены Premium-фильтром.` }).catch(() => null);
    return true;
  }

  if (cfg.caps_block) {
    const letters = [...text].filter(ch => /[A-Za-zА-Яа-яЁё]/.test(ch));
    const uppers = letters.filter(ch => ch === ch.toUpperCase() && ch !== ch.toLowerCase());
    if (letters.length >= 12 && uppers.length / letters.length >= 0.75) {
      await tg("deleteMessage", { chat_id: chatId, message_id: msg.message_id }).catch(() => null);
      await tg("sendMessage", { chat_id: chatId, text: `🔇 ${userLabel(msg.from)}, слишком много КАПСА.` }).catch(() => null);
      return true;
    }
  }

  if (cfg.badwords_enabled) {
    const words = await premiumBadwords(chatId);
    const hit = words.find(w => w && lower.includes(w.toLowerCase()));
    if (hit) {
      await tg("deleteMessage", { chat_id: chatId, message_id: msg.message_id }).catch(() => null);
      await tg("sendMessage", { chat_id: chatId, text: `🚫 ${userLabel(msg.from)}, сообщение удалено Premium-фильтром.` }).catch(() => null);
      return true;
    }
  }

  const autos = await premiumAutoreplies(chatId);
  const matched = autos.find(x => x?.trigger_text && lower.includes(String(x.trigger_text).toLowerCase()));
  if (matched?.response_text) {
    await reply(msg, String(matched.response_text));
    return true;
  }

  const mode = cfg.ai_mode ?? "all";
  if (mode === "off") return true;
  if (mode === "mention" && !lower.includes(`@${EXPECTED_BOT.toLowerCase()}`)) return true;
  if (mode === "reply") {
    const repliedUser = String(msg?.reply_to_message?.from?.username ?? "");
    if (repliedUser.toLowerCase() !== EXPECTED_BOT.toLowerCase()) return true;
  }
  return false;
}

async function premiumStatsText(chatId: number) {
  const [memory, badwords, autos] = await Promise.all([
    loadMemory(chatId, 60),
    premiumBadwords(chatId),
    premiumAutoreplies(chatId),
  ]);
  const cfg = await getPremiumPlusSettings(chatId);
  return `<b>📊 Premium-статистика</b>\n\n` +
    `🧠 Сообщений в текущей AI-памяти: <b>${memory.length}</b>\n` +
    `🚫 Запрещённых слов: <b>${badwords.length}</b>\n` +
    `🤖 Автоответов: <b>${autos.length}</b>\n` +
    `🔗 Антиссылки: <b>${cfg.links_block ? "ВКЛ" : "ВЫКЛ"}</b>\n` +
    `🔠 Антикапс: <b>${cfg.caps_block ? "ВКЛ" : "ВЫКЛ"}</b>\n` +
    `🧹 Фильтр слов: <b>${cfg.badwords_enabled ? "ВКЛ" : "ВЫКЛ"}</b>\n` +
    `🧠 Режим AI: <b>${cfg.ai_mode ?? "all"}</b>`;
}

async function handlePremiumPlusCommands(msg: any, text: string) {
  const cmd = commandName(text);
  const commands = ["/premium_help","/ideas","/rewrite","/translate","/answer","/poll","/rules","/rules_ai","/goodbye","/aimode","/badword","/links","/caps","/autoreply","/premium_stats"];
  if (!commands.includes(cmd)) return false;

  const chatId = Number(msg?.chat?.id);
  const userId = Number(msg?.from?.id);
  const group = ["group", "supergroup"].includes(String(msg?.chat?.type ?? ""));

  if (cmd === "/premium_help") {
    const active = group ? await premiumActive(chatId) : false;
    await reply(msg, premiumPlusHelp(active), { parse_mode: "HTML" });
    return true;
  }

  if (!group) {
    await reply(msg, "Эта Premium-функция работает внутри группы.");
    return true;
  }
  if (!await premiumRequired(msg)) return true;

  if (cmd === "/premium_stats") {
    await reply(msg, await premiumStatsText(chatId), { parse_mode: "HTML" });
    return true;
  }

  if (cmd === "/ideas") {
    const topic = commandArgs(text).join(" ").trim() || String(msg?.reply_to_message?.text ?? "").trim();
    if (!topic) { await reply(msg, "Пример: /ideas конкурс для участников группы"); return true; }
    const out = await premiumAi(`Придумай 10 сильных и разных идей для Telegram-группы по теме: ${topic.slice(0,1800)}. Пиши конкретно, коротко и без вступления.`);
    await reply(msg, out); return true;
  }

  if (cmd === "/rewrite") {
    const source = commandArgs(text).join(" ").trim() || String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").trim();
    if (!source) { await reply(msg, "Напиши текст после /rewrite или ответь этой командой на сообщение."); return true; }
    await reply(msg, await premiumAi(`Перепиши текст для Telegram лучше: естественно, ясно, без канцелярита. Сохрани смысл. Верни только готовый текст.\n\n${source.slice(0,3500)}`)); return true;
  }

  if (cmd === "/translate") {
    const args = commandArgs(text);
    const lang = args.shift();
    const source = args.join(" ").trim() || String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").trim();
    if (!lang || !source) { await reply(msg, "Пример: /translate en Привет всем\nИли ответь /translate en на сообщение."); return true; }
    await reply(msg, await premiumAi(`Переведи текст на язык «${lang}». Сохрани стиль и смысл. Верни только перевод.\n\n${source.slice(0,3500)}`)); return true;
  }

  if (cmd === "/answer") {
    const source = String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? commandArgs(text).join(" ")).trim();
    if (!source) { await reply(msg, "Ответь командой /answer на сообщение — AI предложит хороший ответ."); return true; }
    await reply(msg, await premiumAi(`Составь естественный и уместный ответ на это сообщение в Telegram. Стиль живой, не официальный. Верни только текст ответа.\n\nСообщение: ${source.slice(0,3000)}`)); return true;
  }

  if (cmd === "/poll") {
    const topic = commandArgs(text).join(" ").trim();
    if (!topic) { await reply(msg, "Пример: /poll Какой ивент провести в пятницу?"); return true; }
    const raw = await premiumAi(`Создай Telegram-опрос. Верни ТОЛЬКО JSON без markdown: {"question":"...","options":["...","...","...","..."]}. 3-6 коротких вариантов. Тема: ${topic.slice(0,1200)}`);
    try {
      const clean = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const j = JSON.parse(clean);
      const options = Array.isArray(j?.options) ? j.options.map((x:any)=>String(x).slice(0,100)).filter(Boolean).slice(0,10) : [];
      if (options.length < 2) throw new Error("bad options");
      await tg("sendPoll", { chat_id: chatId, question: String(j.question || topic).slice(0,300), options, is_anonymous: true, ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id}: {}) });
    } catch { await reply(msg, raw); }
    return true;
  }

  const level = await effectiveLevel(chatId, userId);
  if (level < 5) {
    await reply(msg, "Эту Premium-настройку может менять только админ группы или модератор 5 уровня.");
    return true;
  }

  if (cmd === "/rules") {
    const args = commandArgs(text);
    const action = String(args.shift() ?? "").toLowerCase();
    if (!action) {
      const cfg = await getPremiumPlusSettings(chatId);
      await reply(msg, cfg.rules_text ? `📜 Правила группы:\n\n${cfg.rules_text}` : "Правила ещё не настроены. Используй /rules set текст или /rules_ai тема.");
      return true;
    }
    if (["reset","off","сброс"].includes(action)) {
      await savePremiumPlusSettings(chatId, { rules_text: null });
      await reply(msg, "Правила Premium сброшены."); return true;
    }
    if (action === "set") {
      const value = args.join(" ").trim() || String(msg?.reply_to_message?.text ?? "").trim();
      if (!value) { await reply(msg, "Напиши /rules set <правила> или ответь /rules set на сообщение с правилами."); return true; }
      const ok = await savePremiumPlusSettings(chatId, { rules_text: value.slice(0,3500) });
      await reply(msg, ok ? "📜 Правила сохранены." : "Не смог сохранить правила."); return true;
    }
    await reply(msg, "Команды: /rules, /rules set <текст>, /rules reset, /rules_ai <описание>"); return true;
  }

  if (cmd === "/rules_ai") {
    const topic = commandArgs(text).join(" ").trim() || "обычная дружелюбная Telegram-группа";
    const rules = await premiumAi(`Составь 8-12 понятных правил Telegram-группы. Короткие пункты, без юридического языка. Учти тему группы: ${topic.slice(0,1200)}. Верни только готовые правила.`);
    const ok = await savePremiumPlusSettings(chatId, { rules_text: rules.slice(0,3500) });
    await reply(msg, ok ? `📜 AI создал и сохранил правила:\n\n${rules}` : rules); return true;
  }

  if (cmd === "/goodbye") {
    const args = commandArgs(text);
    const action = String(args.shift() ?? "").toLowerCase();
    if (!action) { const c=await getPremiumPlusSettings(chatId); await reply(msg, `Goodbye: ${c.goodbye_enabled?"ВКЛ":"ВЫКЛ"}\nТекст: ${c.goodbye_text || "Пока, {name}. Не пропадай 👋"}\n\n/goodbye on <текст> | /goodbye off`); return true; }
    if (["off","0","выкл"].includes(action)) { await savePremiumPlusSettings(chatId,{goodbye_enabled:false}); await reply(msg,"Сообщения при выходе выключены."); return true; }
    if (["on","1","вкл"].includes(action)) {
      const value=args.join(" ").trim();
      await savePremiumPlusSettings(chatId,{goodbye_enabled:true,...(value?{goodbye_text:value.slice(0,1200)}:{})});
      await reply(msg,"Сообщения при выходе включены. Можно использовать {name} и {chat}."); return true;
    }
  }

  if (cmd === "/aimode") {
    const mode = String(commandArgs(text)[0] ?? "").toLowerCase();
    const map: Record<string,"all"|"mention"|"reply"|"off"> = { all:"all", всегда:"all", mention:"mention", упоминание:"mention", reply:"reply", ответ:"reply", off:"off", выкл:"off" };
    if (!mode || !map[mode]) { const c=await getPremiumPlusSettings(chatId); await reply(msg, `Текущий AI-режим: ${c.ai_mode ?? "all"}\n\n/aimode all — отвечает всем\n/aimode mention — только по @упоминанию\n/aimode reply — только ответом на бота\n/aimode off — AI молчит`); return true; }
    await savePremiumPlusSettings(chatId,{ai_mode:map[mode]}); await reply(msg,`AI-режим установлен: ${map[mode]}.`); return true;
  }

  if (cmd === "/links" || cmd === "/caps") {
    const value = String(commandArgs(text)[0] ?? "").toLowerCase();
    const on = ["on","1","вкл","yes"].includes(value);
    const off = ["off","0","выкл","no"].includes(value);
    const cfg = await getPremiumPlusSettings(chatId);
    if (!on && !off) { await reply(msg, `${cmd === "/links" ? "Антиссылки" : "Антикапс"}: ${(cmd === "/links" ? cfg.links_block : cfg.caps_block) ? "ВКЛ" : "ВЫКЛ"}. Используй ${cmd} on/off`); return true; }
    await savePremiumPlusSettings(chatId, cmd === "/links" ? {links_block:on} : {caps_block:on});
    await reply(msg, `${cmd === "/links" ? "Антиссылки" : "Антикапс"}: ${on ? "ВКЛ" : "ВЫКЛ"}.`); return true;
  }

  if (cmd === "/badword") {
    const args = commandArgs(text); const action=String(args.shift()??"").toLowerCase();
    if (!action || action === "list") { const words=await premiumBadwords(chatId); const c=await getPremiumPlusSettings(chatId); await reply(msg, `Фильтр слов: ${c.badwords_enabled?"ВКЛ":"ВЫКЛ"}\nЗапрещённые слова (${words.length}): ${words.length?words.join(", "):"список пуст"}\n\n/badword on|off|add слово|del слово`); return true; }
    if (["on","off","вкл","выкл"].includes(action)) { const on=["on","вкл"].includes(action); await savePremiumPlusSettings(chatId,{badwords_enabled:on}); await reply(msg,`Фильтр запрещённых слов: ${on?"ВКЛ":"ВЫКЛ"}.`); return true; }
    const word=args.join(" ").trim().toLowerCase();
    if (!word) { await reply(msg,"Укажи слово. Например: /badword add спам"); return true; }
    if (action === "add") { await addPremiumBadword(chatId,userId,word); await reply(msg,`Добавил в фильтр: ${word}`); return true; }
    if (["del","delete","remove"].includes(action)) { await delPremiumBadword(chatId,word); await reply(msg,`Убрал из фильтра: ${word}`); return true; }
  }

  if (cmd === "/autoreply") {
    const rawArgs = text.trim().split(/\s+/).slice(1).join(" ").trim();
    const first = rawArgs.split(/\s+/)[0]?.toLowerCase() || "";
    const rest = rawArgs.slice(first.length).trim();
    if (!first || first === "list") {
      const rows=await premiumAutoreplies(chatId);
      const body=rows.length?rows.map((x,i)=>`${i+1}. «${x.trigger_text}» → ${x.response_text.slice(0,80)}`).join("\n"):"Автоответов пока нет.";
      await reply(msg, `${body}\n\nДобавить: /autoreply add привет | Привет!\nУдалить: /autoreply del привет`); return true;
    }
    if (first === "add") {
      const parts=rest.split("|"); const trigger=String(parts.shift()??"").trim(); const response=parts.join("|").trim();
      if (!trigger || !response) { await reply(msg,"Формат: /autoreply add триггер | ответ"); return true; }
      const ok=await addPremiumAutoreply(chatId,userId,trigger,response); await reply(msg,ok?`Автоответ «${trigger}» сохранён.`:"Не смог сохранить автоответ."); return true;
    }
    if (["del","delete","remove"].includes(first)) { if(!rest){await reply(msg,"Формат: /autoreply del триггер");return true;} await delPremiumAutoreply(chatId,rest); await reply(msg,`Автоответ «${rest}» удалён.`); return true; }
  }

  return true;
}
'''

anchor = "\nasync function handlePremiumCommands(msg: any, text: string) {"
if "async function handlePremiumPlusCommands" not in s:
    if anchor not in s:
        raise SystemExit("Premium commands anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

# Replace Premium marketing card with the expanded 2.0 version.
pat = re.compile(r'function premiumText\(active = false, until\?: string\) \{.*?\n\}', re.S)
new_premium_text = r'''function premiumText(active = false, until?: string) {
  const status = active
    ? `\n\n✅ <b>Premium активен${until ? ` до ${new Date(until).toLocaleDateString("ru-RU")}` : ""}</b>`
    : `\n\nЦена: <b>${PREMIUM_PRICE_STARS} ⭐ / 30 дней</b>`;
  return premiumPlusHelp(active) + (active && until ? `\nСрок: <b>${new Date(until).toLocaleDateString("ru-RU")}</b>` : "");
}'''
if pat.search(s):
    s = pat.sub(new_premium_text, s, count=1)

# Premium memory is deliberately much larger than free memory.
s = s.replace("premium ? 30 : 12", "premium ? 60 : 12")
s = s.replace("loadMemory(chatId, 30)", "loadMemory(chatId, 60)")

# Route Premium 2.0 commands before the old Premium command handler.
old_route = '  if (await handlePremiumCommands(msg, text)) return new Response("ok");'
new_route = '  if (await handlePremiumPlusCommands(msg, text)) return new Response("ok");\n  if (await handlePremiumCommands(msg, text)) return new Response("ok");'
if new_route not in s:
    if old_route not in s:
        raise SystemExit("Premium routing anchor not found")
    s = s.replace(old_route, new_route, 1)

# Enforce Premium filters/autoreplies/AI response mode after explicit commands.
old_guard = '''  if (await handleModeration(msg, resolvedText)) return new Response("ok");

  if (!text.startsWith("/")) void maybeAutoPromo(msg);
  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);'''
new_guard = '''  if (await handleModeration(msg, resolvedText)) return new Response("ok");
  if (await handlePremiumPlusMessage(msg, text)) return new Response("ok");

  if (!text.startsWith("/")) void maybeAutoPromo(msg);
  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);'''
if old_guard in s:
    s = s.replace(old_guard, new_guard, 1)
elif "handlePremiumPlusMessage(msg, text)" not in s:
    raise SystemExit("Premium message guard anchor not found")

# Goodbye event must run before the empty-text early return.
old_event = '''  if (Array.isArray(msg?.new_chat_members) && msg.new_chat_members.length) {
    await handlePremiumWelcome(msg);
  }

  const text = String(msg?.text ?? msg?.caption ?? "").trim();'''
new_event = '''  if (Array.isArray(msg?.new_chat_members) && msg.new_chat_members.length) {
    await handlePremiumWelcome(msg);
  }
  if (msg?.left_chat_member) {
    await handlePremiumGoodbye(msg);
  }

  const text = String(msg?.text ?? msg?.caption ?? "").trim();'''
if old_event in s:
    s = s.replace(old_event, new_event, 1)
elif "handlePremiumGoodbye(msg)" not in s:
    raise SystemExit("Premium service-event anchor not found")

s = s.replace('owner_command_without_slash: true });', 'owner_command_without_slash: true, premium_v2: true, premium_filters: true, premium_autoreplies: true, premium_ai_tools: true });')
s = s.replace('      owner_command_without_slash: true,\n      premium_price_stars:', '      owner_command_without_slash: true,\n      premium_v2: true,\n      premium_filters: true,\n      premium_autoreplies: true,\n      premium_ai_tools: true,\n      premium_price_stars:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa Premium v2 patch applied")
