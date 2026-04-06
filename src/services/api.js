const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504])
const NON_RETRYABLE_CODES = new Set([400, 401, 403, 404])
const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 1000 // doubles each retry: 1s, 2s, 4s, 8s, 16s

/**
 * Fetch with exponential backoff retry logic.
 * Retries on transient server errors (5xx, 429).
 * Throws immediately on client errors (4xx).
 *
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} [maxAttempts]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options, maxAttempts = MAX_ATTEMPTS) {
  let lastError

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options)

      if (res.ok) return res

      if (NON_RETRYABLE_CODES.has(res.status)) {
        const err = new Error(`HTTP ${res.status}`)
        err.status = res.status
        throw err
      }

      if (RETRYABLE_CODES.has(res.status)) {
        lastError = new Error(`HTTP ${res.status} — attempt ${attempt + 1}`)
        lastError.status = res.status
        if (attempt < maxAttempts - 1) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt))
          continue
        }
      }

      // Unexpected status — don't retry
      const err = new Error(`HTTP ${res.status}`)
      err.status = res.status
      throw err
    } catch (err) {
      if (err.status && NON_RETRYABLE_CODES.has(err.status)) throw err
      lastError = err
      if (attempt < maxAttempts - 1) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt))
      }
    }
  }

  throw lastError ?? new Error('Request failed after max retries')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
