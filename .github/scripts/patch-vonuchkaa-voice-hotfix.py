from pathlib import Path
import re

path = Path("supabase/functions/vonuchkaa-ai-bot/index.ts")
s = path.read_text(encoding="utf-8")

# Gemini 3.1 TTS returns raw 24 kHz mono PCM. Encode it to MP3 because Telegram
# voice notes accept OGG/Opus, MP3, or M4A rather than raw PCM.
if 'npm:@breezystack/lamejs@1.2.7' not in s:
    first_import = 'import "jsr:@supabase/functions-js/edge-runtime.d.ts";'
    if first_import not in s:
        raise SystemExit("edge runtime import anchor not found")
    s = s.replace(
        first_import,
        first_import + '\nimport * as lamejs from "npm:@breezystack/lamejs@1.2.7";',
        1,
    )

pattern = re.compile(r'''async function generatePremiumVoice\(text: string, preset: VoicePreset\) \{.*?\n\}\n\nasync function sendVoiceBytes''', re.S)
replacement = r'''function premiumVoiceAudioData(data: any) {
  const roots = [data, data?.interaction].filter(Boolean);
  for (const root of roots) {
    const direct = root?.output_audio ?? root?.outputAudio;
    if (direct?.data) return String(direct.data);
    const steps = Array.isArray(root?.steps) ? root.steps : [];
    for (const step of steps) {
      const content = Array.isArray(step?.content) ? step.content : [];
      for (const part of content) {
        if (String(part?.type ?? "").toLowerCase() === "audio" && part?.data) {
          return String(part.data);
        }
      }
    }
  }
  return "";
}

function premiumVoiceError(status: number, raw: string) {
  if (status === 403) return "TTS_403";
  if (status === 429) return "TTS_LIMIT";
  if (status >= 500) return `TTS_${status}`;
  try {
    const d = JSON.parse(raw);
    const code = String(d?.error?.status ?? d?.error?.code ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    const msg = String(d?.error?.message ?? "").replace(/\s+/g, " ").replace(/[^\p{L}\p{N} .,:;()_\/-]/gu, "").slice(0, 120);
    return code ? `TTS_${status}_${code}${msg ? `_${msg}` : ""}` : `TTS_${status}${msg ? `_${msg}` : ""}`;
  } catch {
    return `TTS_${status}`;
  }
}

function pcm24kMonoToMp3(pcm: Uint8Array) {
  const sampleCount = Math.floor(pcm.length / 2);
  const samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const lo = pcm[i * 2];
    const hi = pcm[i * 2 + 1];
    let v = lo | (hi << 8);
    if (v >= 0x8000) v -= 0x10000;
    samples[i] = v;
  }

  const encoder = new lamejs.Mp3Encoder(1, 24000, 64);
  const chunks: Uint8Array[] = [];
  const block = 1152;
  for (let i = 0; i < samples.length; i += block) {
    const encoded = encoder.encodeBuffer(samples.subarray(i, Math.min(i + block, samples.length)));
    if (encoded?.length) chunks.push(new Uint8Array(encoded.buffer, encoded.byteOffset, encoded.byteLength));
  }
  const tail = encoder.flush();
  if (tail?.length) chunks.push(new Uint8Array(tail.buffer, tail.byteOffset, tail.byteLength));

  const total = chunks.reduce((sum, x) => sum + x.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function generatePremiumVoice(text: string, preset: VoicePreset) {
  const prompt = `Синтезируй речь. ${preset.direction}\n\nТЕКСТ ДЛЯ ОЗВУЧКИ (произнеси дословно, ничего не добавляй):\n${text.slice(0, 700)}`;
  let lastError = "TTS_UNKNOWN";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch(INTERACTIONS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": GEMINI_KEY,
        },
        body: JSON.stringify({
          model: PREMIUM_VOICE_MODEL,
          input: prompt,
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice: preset.voice }] },
        }),
        signal: AbortSignal.timeout(22000),
      });
      const raw = await r.text();
      if (!r.ok) {
        lastError = premiumVoiceError(r.status, raw);
        if (r.status >= 500 && attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        return { ok: false, error: lastError, bytes: null as Uint8Array | null };
      }

      try {
        const data = JSON.parse(raw);
        const b64 = premiumVoiceAudioData(data);
        if (b64) {
          const pcm = b64bytes(b64);
          const mp3 = pcm24kMonoToMp3(pcm);
          if (mp3.byteLength > 0) return { ok: true, error: "", bytes: mp3 };
          lastError = "TTS_MP3_ENCODE_EMPTY";
        } else {
          lastError = "TTS_AUDIO_MISSING";
        }
      } catch {
        lastError = "TTS_AUDIO_CONVERT_ERROR";
      }
    } catch (e) {
      lastError = e instanceof DOMException && e.name === "TimeoutError" ? "TTS_TIMEOUT" : "TTS_REQUEST_ERROR";
    }

    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { ok: false, error: lastError, bytes: null as Uint8Array | null };
}

async function sendVoiceBytes'''

if not pattern.search(s):
    raise SystemExit("voice generator anchor not found")
s = pattern.sub(lambda _m: replacement, s, count=1)

old = '''  if (!audio.ok || !audio.bytes) {
    voiceCooldown.delete(cdKey);
    await reply(msg, "Не смог сейчас сгенерировать голосовое. Попробуй ещё раз позже.");
    return true;
  }'''
new = '''  if (!audio.ok || !audio.bytes) {
    voiceCooldown.delete(cdKey);
    const reason = audio.error === "TTS_403"
      ? "Доступ к голосовой модели отклонён Gemini (403)."
      : audio.error === "TTS_LIMIT"
      ? "Закончился текущий лимит генерации голоса Gemini."
      : audio.error === "TTS_TIMEOUT"
      ? "Генерация голоса не успела завершиться."
      : `Ошибка генерации: ${audio.error}.`;
    await reply(msg, `Не смог сейчас сгенерировать голосовое. ${reason}`);
    return true;
  }'''
if old not in s:
    raise SystemExit("voice error reply anchor not found")
s = s.replace(old, new, 1)

path.write_text(s, encoding="utf-8")
print("Vonuchkaa voice hotfix applied: PCM -> MP3")
