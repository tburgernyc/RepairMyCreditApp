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
        // extractFileContent now returns an ARRAY of content parts
        // (machine PDFs → 1 text part, scanned PDFs → 1 compressed JPEG per page)
        const extracted = await Promise.all(
          fileList.map(async ({ file, bureau }) => {
            const contents = await extractFileContent(file)
            return {
              contents, // array of { type, text|data, mimeType }
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
        const status = err.status
        const message =
          status === 429
            ? 'Daily analysis limit reached (10/day). Try again tomorrow.'
            : status === 401
            ? 'Session expired. Please sign out and sign back in.'
            : status === 503
            ? 'Server configuration error. Please contact support.'
            : status === 504
            ? 'Analysis timed out. Try uploading fewer or smaller files, then retry.'
            : status === 502
            ? 'The AI service returned an error. Please wait a moment and try again.'
            : err.message || 'Analysis failed. Please try again.'
        setError(message)
      }
    },
    [getToken, setError, setFileMetadata, setResult, setStatus]
  )

  return { analyze }
}
