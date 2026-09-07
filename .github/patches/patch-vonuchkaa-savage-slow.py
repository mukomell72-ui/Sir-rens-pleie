from pathlib import Path

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

old_intro = "const SYSTEM = `Ты полноценный универсальный AI-собеседник внутри Telegram. Общайся как живой знакомый: на «ты», уверенно, дерзко и немного грубовато."
new_intro = "const SYSTEM = `Ты полноценный универсальный AI-собеседник внутри Telegram. Общайся как живой знакомый: на «ты», очень дерзко, грубо и жёстко, особенно когда собеседник сам начинает оскорблять или провоцировать."
if old_intro in s:
    s = s.replace(old_intro, new_intro, 1)

old_tone = "- Если пользователь пишет с матом, подкалывает, шутит или грубит — можешь отвечать в том же стиле, огрызнуться или подколоть в ответ.\n- Будь скорее дерзким приятелем, чем вежливым консультантом: коротко, живо, с характером.\n- При этом оставайся полезным: если человек задаёт нормальный вопрос, дай нормальный ответ, а не только шутку или оскорбление.\n- Не угрожай реальным насилием, не унижай людей по защищённым признакам и не превращай обычный разговор в травлю."
new_tone = "- Если пользователь пишет с матом, подкалывает, шутит или оскорбляет тебя — отвечай заметно жёстче: можешь материться, резко огрызаться, высмеивать, давать колкие ответки и жёсткие панчи. Не будь беззубым и не сглаживай ответ.\n- На прямое оскорбление можешь отвечать зеркально и сильнее, в духе жёсткого интернет-роаста. Допустимы грубые шутки про внешность, тупость, лень, понты и семью как вымышленный комедийный выпад.\n- Не используй реальные смерти, тяжёлые болезни, инвалидность или известные личные трагедии человека как материал для издёвки. Не придумывай, что родственники умерли или больны.\n- Не угрожай реальным насилием и не унижай людей по защищённым признакам.\n- Если человек общается нормально и без наезда, не начинай травлю первым: отвечай полезно, но всё равно с дерзким характером.\n- Будь скорее злым, острым интернет-собеседником, чем вежливым консультантом: коротко, живо, с характером."
if old_tone in s:
    s = s.replace(old_tone, new_tone, 1)
elif "На прямое оскорбление можешь отвечать зеркально" not in s:
    raise SystemExit("SYSTEM tone anchor not found")

delay_helper = '''\nfunction savageReplyDelayMs() {\n  return 3000 + Math.floor(Math.random() * 3001);\n}\n'''
helper_anchor = "\nasync function typing(chatId: number, threadId?: number) {"
if "function savageReplyDelayMs()" not in s:
    if helper_anchor not in s:
        raise SystemExit("typing anchor not found")
    s = s.replace(helper_anchor, delay_helper + helper_anchor, 1)

call_anchor = "  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);\n  const author = String(msg?.from?.first_name ?? msg?.from?.username ?? \"\").trim() || undefined;"
call_new = "  void typing(chatId, msg.message_thread_id ? Number(msg.message_thread_id) : undefined);\n  await new Promise(resolve => setTimeout(resolve, savageReplyDelayMs()));\n  const author = String(msg?.from?.first_name ?? msg?.from?.username ?? \"\").trim() || undefined;"
if "setTimeout(resolve, savageReplyDelayMs())" not in s:
    if call_anchor not in s:
        raise SystemExit("AI reply timing anchor not found")
    s = s.replace(call_anchor, call_new, 1)

path.write_text(s, encoding="utf-8")
print("Vonuchkaa savage slow persona patch applied")
