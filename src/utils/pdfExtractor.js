import * as pdfjsLib from 'pdfjs-dist'
// ?url import gives us the worker as a URL string, not bundled inline (~800KB saved)
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const MIN_TEXT_CHARS = 500 // below this → scanned PDF → fall back to compressed images
const MAX_IMAGE_DIM = 1400 // max px on longest side — keeps payload small for Gemini
const JPEG_QUALITY = 0.55  // 55% JPEG — Gemini reads credit reports fine at this quality
const MAX_PAGES = 12       // cap pages per report to stay under Vercel 4MB body limit

/**
 * Extracts content from a file for Gemini ingestion.
 * Returns an ARRAY of content parts (allows multi-page scanned PDFs):
 *
 * - Machine-generated PDFs → [{ type: 'text', text }]
 * - Images (PNG/JPEG)      → [{ type: 'base64', data, mimeType }] (compressed)
 * - Scanned PDFs            → [{ type: 'base64', ... }, ...] (one compressed JPEG per page)
 *
 * @param {File} file
 * @returns {Promise<Array<{ type: string, text?: string, data?: string, mimeType?: string }>>}
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

      // Machine-generated PDF → text is tiny and cheap
      if (fullText.trim().length >= MIN_TEXT_CHARS) {
        return [{ type: 'text', text: fullText.trim() }]
      }

      // Scanned PDF — render each page as a compressed JPEG
      const pageParts = []
      const numPages = Math.min(pdf.numPages, MAX_PAGES)
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 }) // ~150 DPI
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        await page.render({ canvasContext: ctx, viewport }).promise
        const compressed = await compressCanvas(canvas)
        pageParts.push(compressed)
      }

      return pageParts.length > 0 ? pageParts : [await compressImageFile(file)]
    } catch {
      // pdfjs failed entirely — fall through to image compression
    }
  }

  // Images (PNG/JPEG) — always compress before sending
  return [await compressImageFile(file)]
}

// ─── Compression helpers ────────────────────────────────────────────────────

/**
 * Compress a canvas element to a JPEG base64 content part.
 * Resizes if the canvas exceeds MAX_IMAGE_DIM on either axis.
 */
function compressCanvas(sourceCanvas) {
  let canvas = sourceCanvas
  const { width, height } = canvas

  if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
    const scale = MAX_IMAGE_DIM / Math.max(width, height)
    const newW = Math.round(width * scale)
    const newH = Math.round(height * scale)
    const resized = document.createElement('canvas')
    resized.width = newW
    resized.height = newH
    const ctx = resized.getContext('2d')
    ctx.drawImage(canvas, 0, 0, newW, newH)
    canvas = resized
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            type: 'base64',
            data: reader.result.split(',')[1],
            mimeType: 'image/jpeg',
          })
        }
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

/**
 * Compress an image File (PNG/JPEG) to a smaller JPEG base64 content part.
 * Loads into an <img>, draws to canvas at reduced size, exports as JPEG.
 */
function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
        const scale = MAX_IMAGE_DIM / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(img.src)

      canvas.toBlob(
        (blob) => {
          const reader = new FileReader()
          reader.onload = () => {
            resolve({
              type: 'base64',
              data: reader.result.split(',')[1],
              mimeType: 'image/jpeg',
            })
          }
          reader.readAsDataURL(blob)
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Image load failed'))
    }
    img.src = URL.createObjectURL(file)
  })
}
