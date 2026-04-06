import { useEffect, useCallback } from 'react'
import { useStore, useAudioState } from '../store'
import { fetchWithRetry } from '../services/api'
import { buildWavBlob } from '../utils/wavBuilder'
import { useFirebase } from './useFirebase'

/**
 * Hook that generates an audio briefing via Gemini TTS.
 * Converts the raw PCM response into a WAV Blob URL for the <audio> element.
 * Cleans up the Blob URL on unmount.
 */
export function useAudioSynthesis() {
  const audioSummaryText = useStore((s) => s.audioSummaryText)
  const analysisId = useStore((s) => s.analysisId)
  const setBlobUrl = useStore((s) => s.setBlobUrl)
  const setAudioStatus = useStore((s) => s.setAudioStatus)
  const setAudioError = useStore((s) => s.setAudioError)
  const revokeBlobUrl = useStore((s) => s.revokeBlobUrl)
  const { getToken } = useFirebase()

  // Revoke blob URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => revokeBlobUrl()
  }, [revokeBlobUrl])

  const generate = useCallback(async () => {
    if (!audioSummaryText) {
      setAudioError('No audio summary text available.')
      return
    }

    setAudioStatus('loading')

    try {
      const token = await getToken()
      const res = await fetchWithRetry('/api/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: audioSummaryText, analysisId }),
      })

      const { audio } = await res.json()

      if (!audio) throw new Error('TTS returned no audio data')

      const blob = buildWavBlob(audio)
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
    } catch (err) {
      setAudioError(err.message || 'Audio generation failed.')
    }
  }, [analysisId, audioSummaryText, getToken, setBlobUrl, setAudioError, setAudioStatus])

  return { generate, ...useAudioState() }
}
