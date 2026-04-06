/**
 * Strips Gemini markdown code fences and parses the JSON payload.
 * Gemini often wraps responses in ```json ... ``` fences even when
 * response_mime_type: 'application/json' is set.
 *
 * @param {string} raw - Raw text from Gemini candidate
 * @returns {object} Parsed JSON object
 * @throws {SyntaxError} If the response cannot be parsed after all recovery attempts
 */
export function robustJsonParse(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new SyntaxError('Gemini returned empty or non-string response')
  }

  const stripped = raw
    .trim()
    // Remove opening fence: ```json or ```
    .replace(/^```(?:json)?\s*/i, '')
    // Remove closing fence
    .replace(/\s*```\s*$/i, '')
    // Remove control characters (except tab, newline, carriage return which JSON allows)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()

  // Attempt 1: direct parse
  try {
    return JSON.parse(stripped)
  } catch {
    // Attempt 2: extract the outermost {...} block (handles extra text before/after)
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        // fall through
      }
    }
    throw new SyntaxError(
      `Unparseable Gemini response. First 300 chars: ${stripped.slice(0, 300)}`
    )
  }
}
