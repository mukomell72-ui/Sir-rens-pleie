from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

helper = r'''
const PREMIUM_VOICE_MODEL = "gemini-3.1-flash-tts-preview";
const voiceCooldown = new Map<string, number>();

type VoicePreset = { voice: string; direction: string; label: string };
const VOICE_PRESETS: Record<string, VoicePreset> = {
  default: { voice: "Puck", label: "обычный", direction: "Живой, естественный, разговорный голос. Говори уверенно и без театральной переигровки." },
  football: { voice: "Puck", label: "футбол", direction: "Энергичный, харизматичный мужской спортивный стиль, уверенная подача, лёгкий португальский оттенок произношения. Не имитируй и не выдавай голос за конкретного реального человека." },
  deep: { voice: "Algenib", label: "низкий", direction: "Низкий, хрипловатый, уверенный голос. Говори чуть медленнее обычного." },
  narrator: { voice: "Charon", label: "диктор", direction: "Профессиональный дикторский стиль, чёткая артикуляция, спокойный темп." },
  soft: { voice: "Achernar", label: "мягкий", direction: "Мягкий, спокойный, тёплый голос без резких интонаций." },
  fun: { voice: "Puck", label: "весёлый", direction: "Весёлый, бодрый, живой голос, чуть быстрее обычного." },
  robot: { voice: "Orus", label: "робот", direction: "Ровная механическая подача, короткие паузы, слегка роботизированная манера, но речь должна оставаться понятной." },
};

function voicePresetKey(raw: string) {
  const k = raw.toLowerCase().replace(/^\//, "");
  const aliases: Record<string,string> = {
    default:"default", обычный:"default", normal:"default",
    football:"football", футбол:"football", sport:"football", спорт:"football",
    deep:"deep", низкий:"deep", bass:"deep",
    narrator:"narrator", диктор:"narrator",
    soft:"soft", мягкий:"soft",
    fun:"fun", веселый:"fun", "весёлый":"fun",
    robot:"robot", робот:"robot",
  };
  return aliases[k] ?? "";
}

function b64bytes(data: string) {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function generatePremiumVoice(text: string, preset: VoicePreset) {
  const prompt = `${preset.direction}\n\nПроизнеси дословно следующий текст. Ничего не добавляй от себя:\n${text.slice(0, 700)}`;
  const r = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      model: PREMIUM_VOICE_MODEL,
      input: prompt,
      response_format: { type: "audio", mime_type: "audio/mp3", delivery: "inline", bit_rate: 48000 },
      generation_config: { speech_config: [{ voice: preset.voice }] },
    }),
    signal: AbortSignal.timeout(18000),
  });
  const raw = await r.text();
  if (!r.ok) return { ok: false, error: `TTS ${r.status}`, bytes: null as Uint8Array | null };
  try {
    const data = JSON.parse(raw);
    const b64 = String(data?.output_audio?.data ?? "");
    if (!b64) return { ok: false, error: "TTS_AUDIO_MISSING", bytes: null as Uint8Array | null };
    return { ok: true, error: "", bytes: b64bytes(b64) };
  } catch {
    return { ok: false, error: "TTS_PARSE_ERROR", bytes: null as Uint8Array | null };
  }
}

async function sendVoiceBytes(msg: any, bytes: Uint8Array) {
  const form = new FormData();
  form.set("chat_id", String(msg.chat.id));
  form.set("voice", new Blob([bytes], { type: "audio/mpeg" }), "vonuchkaa.mp3");
  form.set("reply_parameters", JSON.stringify({ message_id: msg.message_id, allow_sending_without_reply: true }));
  if (msg.message_thread_id) form.set("message_thread_id", String(msg.message_thread_id));
  const r = await fetch(`${TG}/sendVoice`, { method: "POST", body: form, signal: AbortSignal.timeout(12000) });
  return await r.json().catch(() => ({ ok: false, description: `HTTP ${r.status}` }));
}

function premiumVoicesHelp() {
  return `<b>🎙 Голосовые Premium</b>\n\n` +
    `/voice текст — обычный голос\n` +
    `/voice football текст — энергичный футбольный стиль\n` +
    `/voice deep текст — низкий голос\n` +
    `/voice narrator текст — диктор\n` +
    `/voice soft текст — мягкий голос\n` +
    `/voice fun текст — весёлый голос\n` +
    `/voice robot текст — робот\n\n` +
    `Можно ответить командой на чужое сообщение — бот озвучит его текст.\n` +
    `<i>Голоса — синтетические стили, не копии конкретных реальных людей.</i>`;
}

async function handlePremiumVoiceCommand(msg: any, text: string) {
  const cmd = commandName(text);
  if (cmd !== "/voice" && cmd !== "/voices") return false;
  const group = ["group", "supergroup"].includes(String(msg?.chat?.type ?? ""));
  if (!group) {
    await reply(msg, "Голосовые Premium работают внутри группы.");
    return true;
  }
  const chatId = Number(msg.chat.id);
  if (!await premiumActive(chatId)) {
    await reply(msg, `🎙 Голосовые доступны только в 💎 Premium. Напиши /premium.`);
    return true;
  }
  if (cmd === "/voices") {
    await reply(msg, premiumVoicesHelp(), { parse_mode: "HTML" });
    return true;
  }

  const userId = Number(msg.from?.id);
  const cdKey = `${chatId}:${userId}`;
  const now = Date.now();
  const last = voiceCooldown.get(cdKey) ?? 0;
  if (now - last < 30000) {
    const left = Math.ceil((30000 - (now - last)) / 1000);
    await reply(msg, `Подожди ${left} сек. перед следующим голосовым.`);
    return true;
  }

  const args = commandArgs(text);
  let presetKey = voicePresetKey(String(args[0] ?? ""));
  if (!presetKey) presetKey = "default";
  else args.shift();
  const replied = String(msg?.reply_to_message?.text ?? msg?.reply_to_message?.caption ?? "").trim();
  const spoken = (args.join(" ").trim() || replied).slice(0, 700);
  if (!spoken) {
    await reply(msg, premiumVoicesHelp(), { parse_mode: "HTML" });
    return true;
  }

  voiceCooldown.set(cdKey, now);
  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);
  const preset = VOICE_PRESETS[presetKey] ?? VOICE_PRESETS.default;
  const audio = await generatePremiumVoice(spoken, preset);
  if (!audio.ok || !audio.bytes) {
    voiceCooldown.delete(cdKey);
    await reply(msg, "Не смог сейчас сгенерировать голосовое. Попробуй ещё раз позже.");
    return true;
  }
  const sent = await sendVoiceBytes(msg, audio.bytes);
  if (!sent?.ok) {
    voiceCooldown.delete(cdKey);
    await reply(msg, `Не смог отправить голосовое: ${tgError(sent)}.`);
  }
  return true;
}
'''

anchor = "\nDeno.serve(async (req: Request) => {"
if "async function handlePremiumVoiceCommand" not in s:
    if anchor not in s:
        raise SystemExit("Deno serve anchor not found")
    s = s.replace(anchor, "\n" + helper + anchor, 1)

# Route voice commands before the wider Premium command handlers.
old_route = '  if (await handlePremiumPlusCommands(msg, text)) return new Response("ok");'
new_route = '  if (await handlePremiumVoiceCommand(msg, text)) return new Response("ok");\n  if (await handlePremiumPlusCommands(msg, text)) return new Response("ok");'
if new_route not in s:
    if old_route not in s:
        raise SystemExit("Premium voice routing anchor not found")
    s = s.replace(old_route, new_route, 1)

# Add the feature to the Premium 2.0 help card.
needle = '    `• /persona — свой характер бота\\n\\n` +'
replacement = '    `• /persona — свой характер бота\\n` +\n    `• /voice и /voices — голосовые сообщения разными AI-голосами\\n\\n` +'
if needle in s and "/voice и /voices" not in s:
    s = s.replace(needle, replacement, 1)

# Expose commands in Telegram's menu if the existing setup menu is present.
menu_needle = '      { command: "aipost", description: "Premium: создать AI-пост" }'
menu_replacement = '      { command: "aipost", description: "Premium: создать AI-пост" },\n      { command: "voice", description: "Premium: отправить голосовое" },\n      { command: "voices", description: "Premium: список голосов" }'
if menu_needle in s and 'command: "voice"' not in s:
    s = s.replace(menu_needle, menu_replacement, 1)

s = s.replace('premium_ai_tools: true });', 'premium_ai_tools: true, premium_voice: true, premium_voice_model: PREMIUM_VOICE_MODEL });')
s = s.replace('      premium_ai_tools: true,\n      premium_price_stars:', '      premium_ai_tools: true,\n      premium_voice: true,\n      premium_voice_model: PREMIUM_VOICE_MODEL,\n      premium_price_stars:')

path.write_text(s, encoding="utf-8")
print("Vonuchkaa Premium voice patch applied")
