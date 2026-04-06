export const config = { runtime: 'edge' }

import { verifyFirebaseJWT, firestoreGet, firestoreSet, firestoreCreate } from './_utils.js'

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // ─── 1. Verify JWT ───────────────────────────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

  let uid
  try {
    const payload = await verifyFirebaseJWT(token)
    uid = payload.uid
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

  const { analysisId, message, chatId } = body
  if (!analysisId || !message) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 })
  }

  // ─── 3. Load analysis context (summarized — not full detractors) ─
  let auditContext = ''
  try {
    const analysis = await firestoreGet(`analyses/${analysisId}`)
    if (analysis && analysis.uid !== uid) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    }
    if (analysis) {
      auditContext = `
AUDIT CONTEXT:
- Certainty Score: ${analysis.certaintyScore ?? 'N/A'}
- Protocol: ${(analysis.protocol ?? '').slice(0, 500)}
Note: You are acting as an ongoing credit strategy advisor based on this completed audit.
`.trim()
    }
  } catch {
    // Non-fatal — proceed without context
  }

  // ─── 4. Load/create chat history (last 10 messages) ─────────────
  let chatDocId = chatId
  let priorMessages = []

  if (chatDocId) {
    try {
      const chatDoc = await firestoreGet(`chats/${chatDocId}`)
      if (chatDoc && chatDoc.uid === uid) {
        const allMessages = chatDoc.messages ?? []
        priorMessages = allMessages.slice(-10)
      }
    } catch {
      // Start fresh if chat fetch fails
    }
  }

  // ─── 5. Build Gemini conversation ────────────────────────────────
  const systemPrompt = `You are the Neural Strategist — an expert credit removal advisor.
${auditContext}
Be concise, actionable, and refer to the audit context above when relevant.
Focus on Metro 2 compliance, FCRA rights, and dispute strategy.`

  const contents = [
    ...priorMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ]

  let reply = ''
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7 },
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await res.json()
    reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response generated.'
  } catch {
    return new Response(
      JSON.stringify({ error: 'gemini_timeout', message: 'Chat timed out. Please retry.' }),
      { status: 504 }
    )
  }

  // ─── 6. Persist chat ─────────────────────────────────────────────
  const userMsg = { role: 'user', content: message, timestamp: new Date().toISOString() }
  const modelMsg = { role: 'model', content: reply, timestamp: new Date().toISOString() }

  try {
    if (!chatDocId) {
      chatDocId = await firestoreCreate('chats', {
        uid,
        analysisId,
        createdAt: new Date().toISOString(),
        messages: [...priorMessages, userMsg, modelMsg],
      })
    } else {
      await firestoreSet(`chats/${chatDocId}`, {
        messages: [...priorMessages, userMsg, modelMsg],
      })
    }
  } catch {
    // Non-fatal
  }

  return new Response(JSON.stringify({ chatId: chatDocId, reply }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
