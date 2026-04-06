import { useCallback } from 'react'
import { useStore } from '../../store'

const BUREAU_CONFIG = {
  experian:   { label: 'Experian',   limit: 1000, warnAt: 950,  color: 'text-red-700' },
  transunion: { label: 'TransUnion', limit: 1000, warnAt: 950,  color: 'text-purple-700' },
  equifax:    { label: 'Equifax',    limit: 250,  warnAt: 220,  color: 'text-blue-700' },
}

function CopyButton({ id, text, bureau }) {
  const copiedId = useStore((s) => s.copiedId)
  const setCopied = useStore((s) => s.setCopied)
  const isCopied = copiedId === id

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => setCopied(id))
  }, [id, setCopied, text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${bureau} dispute text`}
      className="min-w-[44px] min-h-[44px] flex items-center gap-1.5 px-3 py-2
                 text-xs font-medium rounded-full transition-all duration-150
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600
                 hover:bg-slate-100 active:scale-95"
    >
      {isCopied ? (
        <>
          <svg className="w-4 h-4 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-slate-500">Copy</span>
        </>
      )}
      {/* Screen reader announcement — aria-live on this span */}
      <span aria-live="polite" className="sr-only">
        {isCopied ? 'Copied' : ''}
      </span>
    </button>
  )
}

/**
 * Renders the three bureau dispute text boxes for a single detractor.
 * @param {{ detractorIndex: number, onlineDisputeText: object }} props
 */
export default function DisputePortalText({ detractorIndex, onlineDisputeText = {} }) {
  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-white/40">
      <p className="text-subheader">Dispute Portal Text</p>
      {Object.entries(BUREAU_CONFIG).map(([bureau, config]) => {
        const text = onlineDisputeText[bureau] ?? ''
        const charCount = text.length
        const isOverLimit = charCount > config.limit
        const isNearLimit = charCount >= config.warnAt
        const copyId = `${detractorIndex}-${bureau}`

        return (
          <section key={bureau} aria-label={`${config.label} dispute text`} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${config.color}`}>
                {config.label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono ${
                    isOverLimit ? 'text-red-500 font-bold' :
                    isNearLimit ? 'text-amber-500' :
                    'text-slate-400'
                  }`}
                >
                  {charCount}/{config.limit}
                </span>
                <CopyButton id={copyId} text={text} bureau={config.label} />
              </div>
            </div>
            <div
              className="surface-inset rounded-xl p-3 font-mono text-xs text-slate-700
                         min-h-[60px] leading-relaxed whitespace-pre-wrap break-words"
            >
              {text || <span className="text-slate-400 italic">No dispute text generated</span>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
