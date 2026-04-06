// Gemini TTS hardcoded output spec — DO NOT parameterize
const SAMPLE_RATE = 24000
const NUM_CHANNELS = 1
const BITS_PER_SAMPLE = 16

/**
 * Converts a base64-encoded raw PCM string (from Gemini TTS) into a
 * playable WAV Blob by prepending a valid 44-byte RIFF/WAVE header.
 *
 * @param {string} base64PCM - base64-encoded raw PCM audio from Gemini TTS
 * @returns {Blob} WAV file blob (audio/wav)
 */
export function buildWavBlob(base64PCM) {
  const pcmBytes = base64ToUint8Array(base64PCM)
  const dataLength = pcmBytes.byteLength
  const headerLength = 44
  const buffer = new ArrayBuffer(headerLength + dataLength)
  const view = new DataView(buffer)

  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8)

  // ─── RIFF chunk descriptor ────────────────────────────────────────
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)   // file size - 8 bytes
  writeString(view, 8, 'WAVE')

  // ─── fmt sub-chunk ────────────────────────────────────────────────
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)               // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true)                // audio format (PCM = 1)
  view.setUint16(22, NUM_CHANNELS, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, BITS_PER_SAMPLE, true)

  // ─── data sub-chunk ───────────────────────────────────────────────
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  // Copy PCM bytes after header
  new Uint8Array(buffer, headerLength).set(pcmBytes)

  return new Blob([buffer], { type: 'audio/wav' })
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function base64ToUint8Array(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
