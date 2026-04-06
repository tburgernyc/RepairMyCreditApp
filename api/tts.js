export const config = { runtime: 'edge' }

import { verifyFirebaseJWT } from './_utils.js'

const TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // ─── 1. Verify JWT ───────────────────────────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  try {
    await verifyFirebaseJWT(token)
  } catch {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  // ─── 2. Parse body ───────────────────────────────────────────────
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  const { text } = body
  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'missing_text' }), { status: 400 })
  }

  // Truncate to avoid excessive token cost (~2000 chars ≈ 60s of audio)
  const truncatedText = text.slice(0, 2000)

  // ─── 3. Call Gemini TTS ──────────────────────────────────────────
  const ttsBody = {
    contents: [{ parts: [{ text: truncatedText }] }],
    generationConfig: {
      response_modalities: ['AUDIO'],
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            // Primary: Puck. If unavailable, swap to: Charon, Kore, Fenrir
            voice_name: 'Puck',
          },
        },
      },
    },
  }

  let audioData
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsBody),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errText = await res.text()
      // Fallback: try Charon voice if Puck fails
      if (res.status === 400 && errText.includes('voice')) {
        ttsBody.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name = 'Charon'
        const retry = await fetch(TTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ttsBody),
        })
        const retryData = await retry.json()
        audioData = retryData?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data
      } else {
        throw new Error(`TTS API error: ${res.status}`)
      }
    } else {
      const data = await res.json()
      audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'tts_failed', message: err.message }),
      { status: 502 }
    )
  }

  if (!audioData) {
    return new Response(
      JSON.stringify({ error: 'tts_empty', message: 'TTS returned no audio data.' }),
      { status: 502 }
    )
  }

  // Return raw base64 PCM — client builds WAV header via wavBuilder.js
  // Gemini TTS outputs: 24000 Hz mono 16-bit PCM
  return new Response(JSON.stringify({ audio: audioData, sampleRate: 24000 }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
