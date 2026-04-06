import * as pdfjsLib from 'pdfjs-dist'
// ?url import gives us the worker as a URL string, not bundled inline (~800KB saved)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const MIN_TEXT_CHARS = 500 // below this → scanned PDF → fall back to base64

/**
 * Extracts content from a file for Gemini ingestion.
 * - Machine-generated PDFs: extracts text (cheap path, fewer tokens)
 * - Scanned PDFs / images: returns base64 inline_data (fallback)
 *
 * @param {File} file
 * @returns {Promise<
 *   { type: 'text', text: string } |
 *   { type: 'base64', data: string, mimeType: string }
 * >}
 */
export async function extractFileContent(file) {
  if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        fullText += textContent.items.map((item) => item.str).join(' ') + '\n'
      }

      if (fullText.trim().length >= MIN_TEXT_CHARS) {
        return { type: 'text', text: fullText.trim() }
      }
      // Scanned PDF — insufficient text extracted
    } catch {
      // pdfjs failed entirely — fall through to base64
    }
  }

  // Images (PNG/JPEG) and scanned PDFs → base64 inline
  return fileToBase64(file)
}

/**
 * @param {File} file
 * @returns {Promise<{ type: 'base64', data: string, mimeType: string }>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // result is: "data:image/png;base64,AAAA..." — strip the prefix
      const base64 = reader.result.split(',')[1]
      resolve({ type: 'base64', data: base64, mimeType: file.type })
    }
    reader.onerror = () => reject(new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })
}
