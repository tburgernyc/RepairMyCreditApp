import { useRef, useState, useCallback } from 'react'
import { useGemini } from '../../hooks/useGemini'
import { useStore } from '../../store'
import Button from './Button'

const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'])
const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg'
const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024 // 4MB

const BUREAUS = [
  { id: 'experian',   label: 'Experian',   color: 'text-red-600',    ring: 'ring-red-300',    bg: 'bg-red-50/40' },
  { id: 'transunion', label: 'TransUnion', color: 'text-purple-600', ring: 'ring-purple-300', bg: 'bg-purple-50/40' },
  { id: 'equifax',    label: 'Equifax',    color: 'text-blue-600',   ring: 'ring-blue-300',   bg: 'bg-blue-50/40' },
]

function UploadIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  )
}

function FileSlot({ bureau, file, onSelect, onRemove, isDisabled, dragOver, onDragOver, onDragLeave, onDrop }) {
  const inputRef = useRef(null)

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isDisabled && !file) {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const slotBase = [
    'relative flex flex-col items-center justify-center gap-2',
    'rounded-[1.25rem] border-2 border-dashed transition-all duration-150 p-4 min-h-[120px]',
    dragOver ? `${bureau.bg} ring-2 ${bureau.ring} border-transparent scale-[1.02]` :
    file ? 'glass-surface-sm border-transparent' :
    'border-white/60 hover:border-slate-300/80 bg-white/20',
    isDisabled ? 'opacity-50 cursor-not-allowed' : file ? 'cursor-default' : 'cursor-pointer',
  ].join(' ')

  return (
    <div
      role={file ? 'region' : 'button'}
      tabIndex={isDisabled || file ? -1 : 0}
      aria-label={file
        ? `${bureau.label} report: ${file.name}`
        : `Upload ${bureau.label} report. Press Enter to open file picker.`}
      aria-disabled={isDisabled}
      className={slotBase}
      onClick={() => !isDisabled && !file && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        disabled={isDisabled}
        onChange={(e) => onSelect(e.target.files[0])}
      />

      {/* Bureau label */}
      <span className={`text-xs font-bold tracking-widest uppercase ${bureau.color}`}>
        {bureau.label}
      </span>

      {file ? (
        /* File selected state */
        <div className="text-center space-y-1 w-full">
          <p className="text-xs font-medium text-slate-700 truncate px-1" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-slate-400">
            {(file.size / 1024).toFixed(0)} KB
          </p>
          {file.size > LARGE_FILE_THRESHOLD && (
            <p className="text-xs text-amber-600">Large file</p>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            aria-label={`Remove ${bureau.label} report`}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center mx-auto
                       text-slate-400 hover:text-red-500 transition-colors rounded-full
                       focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      ) : (
        /* Empty state */
        <div className="text-center space-y-1">
          <div className="text-slate-400 flex justify-center">
            <UploadIcon />
          </div>
          <p className="text-xs text-slate-400">Drop or click</p>
        </div>
      )}
    </div>
  )
}

export default function UploadZone() {
  const { analyze } = useGemini()
  const status = useStore((s) => s.status)
  const isDisabled = status === 'uploading' || status === 'analyzing'

  // files: { experian: File|null, transunion: File|null, equifax: File|null }
  const [files, setFiles] = useState({ experian: null, transunion: null, equifax: null })
  const [dragOver, setDragOver] = useState(null) // bureau id currently being dragged over
  const [error, setError] = useState(null)

  const fileCount = Object.values(files).filter(Boolean).length
  const hasAnyFile = fileCount > 0

  const validateFile = useCallback((file) => {
    if (!file) return null
    if (!ACCEPTED_TYPES.has(file.type)) return `Unsupported type: ${file.name}. Use PDF, PNG, or JPEG.`
    return null
  }, [])

  const handleSelect = useCallback((bureauId, file) => {
    const err = validateFile(file)
    if (err) { setError(err); return }
    setError(null)
    setFiles((prev) => ({ ...prev, [bureauId]: file }))
  }, [validateFile])

  const handleRemove = useCallback((bureauId) => {
    setFiles((prev) => ({ ...prev, [bureauId]: null }))
    setError(null)
  }, [])

  const handleDragOver = useCallback((e, bureauId) => {
    e.preventDefault()
    if (isDisabled) return
    setDragOver(bureauId)
  }, [isDisabled])

  const handleDragLeave = useCallback(() => setDragOver(null), [])

  const handleDrop = useCallback((e, bureauId) => {
    e.preventDefault()
    setDragOver(null)
    if (isDisabled) return
    const file = e.dataTransfer.files[0]
    handleSelect(bureauId, file)
  }, [handleSelect, isDisabled])

  const handleAnalyze = useCallback(() => {
    if (!hasAnyFile || isDisabled) return
    const fileList = BUREAUS
      .filter((b) => files[b.id])
      .map((b) => ({ file: files[b.id], bureau: b.label }))
    analyze(fileList)
  }, [analyze, files, hasAnyFile, isDisabled])

  return (
    <div className="glass-surface rounded-[1.5rem] p-6 space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-display text-xl">Upload Bureau Reports</h2>
        <p className="text-sm text-slate-500">
          Add up to 3 reports — one per bureau. At least 1 required.
        </p>
      </div>

      {/* Three bureau slots */}
      <div className="grid grid-cols-3 gap-3" role="group" aria-label="Bureau report upload slots">
        {BUREAUS.map((bureau) => (
          <FileSlot
            key={bureau.id}
            bureau={bureau}
            file={files[bureau.id]}
            isDisabled={isDisabled}
            dragOver={dragOver === bureau.id}
            onSelect={(file) => handleSelect(bureau.id, file)}
            onRemove={() => handleRemove(bureau.id)}
            onDragOver={(e) => handleDragOver(e, bureau.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, bureau.id)}
          />
        ))}
      </div>

      {/* File count summary */}
      {hasAnyFile && (
        <p className="text-center text-xs text-slate-500">
          {fileCount} of 3 report{fileCount !== 1 ? 's' : ''} ready
        </p>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="text-xs text-red-700 bg-red-50/60 border border-red-200 rounded-xl px-4 py-2 text-center">
          {error}
        </div>
      )}

      {/* Hint */}
      <p className="text-center text-xs text-slate-400">PDF · PNG · JPEG · Max 4MB per file</p>

      {/* Analyze button */}
      <div className="flex justify-center">
        <Button
          onClick={handleAnalyze}
          disabled={!hasAnyFile || isDisabled}
          ariaLabel={`Analyze ${fileCount} credit report${fileCount !== 1 ? 's' : ''}`}
        >
          {isDisabled
            ? status === 'uploading' ? 'Preparing…' : 'Analyzing…'
            : `Analyze ${fileCount > 0 ? fileCount : ''} Report${fileCount !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  )
}
