export const config = { runtime: 'edge' }

import { verifyFirebaseJWT, firestoreGet, firestoreSet, firestoreCreate } from './_utils.js'

// ─── IMMUTABLE SYSTEM PROMPT ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `Act as a 30-year expert Credit Removal Architect. Analyze these bureau reports.
TASK: Perform technical research to identify permanent removal paths based on Metro 2 inconsistencies.
GOAL: Removal of all negative detractors for Tier-1 Expansion.

CRITICAL INSTRUCTION FOR ONLINE DISPUTES:
For every detractor identified, you MUST generate exact, copy-paste-ready text for the user to input into the online dispute portals of the three major credit bureaus. You must strictly adhere to the character limits and typical workflows of each portal:
- Experian: Max 1000 characters. Focus on Metro 2 compliance failure and demand validation.
- TransUnion: Max 1000 characters. Focus on specific data inaccuracies and direct verification requests.
- Equifax: Max 250 characters. Must be highly condensed and specifically target the error.

OUTPUT SCHEMA:
{"certaintyScore":number,"detractors":[{"account":"string","issue":"string","removalTactic":"string","metro2Code":"string","onlineDisputeText":{"experian":"string","transunion":"string","equifax":"string"}}],"missionChecklist":[{"step":"string","instruction":"string"}],"lendingExpansion":{"personal":"string","business":"string","realEstate":"string"},"roadmap":["string"],"protocol":"string","audioSummary":"string"}`

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // ─── Env-var guard — surface missing config immediately ─────────
  if (!process.env.GEMINI_API_KEY) {
    console.error('[analyze] GEMINI_API_KEY is not set in environment variables')
    return new Response(
      JSON.stringify({ error: 'config_error', message: 'Server configuration error: GEMINI_API_KEY missing. Contact support.' }),
      { status: 503 }
    )
  }

  // ─── 1. Verify Firebase JWT ──────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  let uid
  try {
    const payload = await verifyFirebaseJWT(token)
    uid = payload.uid
  } catch (err) {
    console.error('[analyze] JWT verification failed:', err?.message)
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  // ─── 2. Rate limit: 10 analyses per user per day ─────────────────
  const today = new Date().toISOString().split('T')[0]
  const rateLimitPath = `rateLimits/${uid}_${today}`
  try {
    const rateDoc = await firestoreGet(rateLimitPath)
    const count = rateDoc?.count ?? 0
    if (count >= 10) {
      return new Response(
        JSON.stringify({ error: 'rate_limit', message: 'Daily analysis limit reached (10/day). Try again tomorrow.' }),
        { status: 429 }
      )
    }
    await firestoreSet(rateLimitPath, { count: count + 1, uid, date: today })
  } catch {
    // Non-fatal
  }

  // ─── 3. Parse request body ───────────────────────────────────────
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  // Support three formats:
  //   New array: { files: [{ contents: [...], bureau }] }       ← current
  //   Legacy:    { files: [{ content: {...}, bureau }] }        ← single content obj
  //   Minimal:   { content: {...} }                             ← single file, no bureau
  const fileList = body.files ?? [{ contents: body.content ? [body.content] : [], bureau: 'Report' }]

  if (!fileList.length) {
    return new Response(JSON.stringify({ error: 'no_files' }), { status: 400 })
  }

  // ─── 4. Build Gemini parts — one label + content part(s) per bureau ──
  // Each bureau report is labeled so Gemini can cross-reference bureau-specific findings.
  const userParts = []

  for (const file of fileList) {
    // Normalize: support both `contents` (array) and legacy `content` (single)
    const parts = file.contents ?? (file.content ? [file.content] : [])
    const bureau = file.bureau ?? 'Report'

    if (!parts.length) continue

    // Label the report
    userParts.push({ text: `--- ${bureau.toUpperCase()} CREDIT REPORT ---` })

    for (const part of parts) {
      if (part.type === 'text') {
        userParts.push({ text: part.text })
      } else if (part.type === 'base64') {
        userParts.push({
          inline_data: {
            mime_type: part.mimeType,
            data: part.data,
          },
        })
      }
    }
  }

  if (!userParts.length) {
    return new Response(JSON.stringify({ error: 'empty_content' }), { status: 400 })
  }

  const geminiBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: userParts,
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.2,
    },
  }

  // ─── 5. Call Gemini ──────────────────────────────────────────────
  // Timeout is 20s — Vercel Edge Functions are terminated at ~25s.
  // Aborting at 20s lets us return a clean error instead of being force-killed.
  let geminiData
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)
    const geminiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!geminiRes.ok) {
      const errBody = await geminiRes.json().catch(() => ({}))
      const msg = errBody?.error?.message ?? `Gemini HTTP ${geminiRes.status}`
      console.error('[analyze] Gemini error:', geminiRes.status, msg)
      // 400 = bad API key or invalid request — surface to client immediately
      if (geminiRes.status === 400 || geminiRes.status === 403) {
        return new Response(
          JSON.stringify({ error: 'gemini_auth', message: `Gemini rejected the request: ${msg}` }),
          { status: 502 }
        )
      }
      return new Response(
        JSON.stringify({ error: 'gemini_error', message: `Gemini returned ${geminiRes.status}. Please try again.` }),
        { status: 502 }
      )
    }

    geminiData = await geminiRes.json()
  } catch (err) {
    const isTimeout = err?.name === 'AbortError'
    console.error('[analyze] Gemini fetch error:', err?.name, err?.message)
    return new Response(
      JSON.stringify({
        error: isTimeout ? 'gemini_timeout' : 'gemini_fetch_error',
        message: isTimeout
          ? 'Analysis timed out (20s). Try uploading fewer or smaller files.'
          : 'Could not reach the AI service. Please try again.',
      }),
      { status: 504 }
    )
  }

  // ─── 6. Parse JSON response ──────────────────────────────────────
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) {
    return new Response(
      JSON.stringify({ error: 'gemini_empty', message: 'Gemini returned no content.' }),
      { status: 502 }
    )
  }

  let result
  try {
    const stripped = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()
    result = JSON.parse(stripped)
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (match) {
      try { result = JSON.parse(match[0]) } catch {
        return new Response(
          JSON.stringify({ error: 'parse_failed', message: 'Could not parse AI response.' }),
          { status: 502 }
        )
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'parse_failed', message: 'Could not parse AI response.' }),
        { status: 502 }
      )
    }
  }

  // ─── 7. Persist to Firestore ─────────────────────────────────────
  let analysisId = crypto.randomUUID()
  try {
    analysisId = await firestoreCreate('analyses', {
      uid,
      createdAt: new Date().toISOString(),
      status: 'complete',
      certaintyScore: result.certaintyScore ?? 0,
      protocol: result.protocol ?? '',
      audioSummaryText: result.audioSummary ?? '',
      fileCount: fileList.length,
      bureaus: fileList.map((f) => f.bureau),
    })
  } catch {
    // Non-fatal
  }

  return new Response(JSON.stringify({ analysisId, result }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
