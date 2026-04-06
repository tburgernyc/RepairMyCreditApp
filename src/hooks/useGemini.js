import { useCallback } from 'react'
import { useStore } from '../store'
import { fetchWithRetry } from '../services/api'
import { extractFileContent } from '../utils/pdfExtractor'
import { useFirebase } from './useFirebase'

/**
 * Hook that drives the full analysis pipeline.
 * Accepts an array of { file: File, bureau: string } objects (1–3 bureaus).
 * Extracts each file's content in parallel, sends all to the Edge Function
 * in a single Gemini request.
 */
export function useGemini() {
  const setStatus = useStore((s) => s.setStatus)
  const setResult = useStore((s) => s.setResult)
  const setError = useStore((s) => s.setError)
  const setFileMetadata = useStore((s) => s.setFileMetadata)
  const { getToken } = useFirebase()

  /**
   * @param {Array<{ file: File, bureau: string }>} fileList
   */
  const analyze = useCallback(
    async (fileList) => {
      if (!fileList?.length) return

      setStatus('uploading')
      setFileMetadata(
        fileList.map(({ file, bureau }) => ({
          originalName: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          bureau,
        }))
      )

      try {
        // Extract content from all files in parallel
        const extracted = await Promise.all(
          fileList.map(async ({ file, bureau }) => {
            const content = await extractFileContent(file)
            return {
              content,
              bureau,
              fileMetadata: {
                originalName: file.name,
                sizeBytes: file.size,
                mimeType: file.type,
              },
            }
          })
        )

        setStatus('analyzing')
        const token = await getToken()

        const res = await fetchWithRetry('/api/analyze', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ files: extracted }),
        })

        const { analysisId, result } = await res.json()
        setResult(result, analysisId)
      } catch (err) {
        const message =
          err.status === 429
            ? 'Daily analysis limit reached (10/day). Try again tomorrow.'
            : err.message || 'Analysis failed. Please try again.'
        setError(message)
      }
    },
    [getToken, setError, setFileMetadata, setResult, setStatus]
  )

  return { analyze }
}
