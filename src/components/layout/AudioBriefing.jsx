import { useAudioSynthesis } from '../../hooks/useAudioSynthesis'
import { useStore } from '../../store'
import Button from '../ui/Button'

export default function AudioBriefing() {
  const { generate, audioStatus, blobUrl, audioError } = useAudioSynthesis()
  const audioSummaryText = useStore((s) => s.audioSummaryText)

  if (!audioSummaryText) return null

  return (
    <section aria-label="Audio briefing" className="glass-surface rounded-[1.5rem] p-6 space-y-4">
      <p className="text-subheader">Audio Briefing</p>

      {blobUrl ? (
        <audio
          controls
          src={blobUrl}
          aria-label="Credit report audio briefing"
          className="w-full rounded-xl"
        />
      ) : (
        <Button
          onClick={generate}
          disabled={audioStatus === 'loading'}
          ariaLabel="Generate audio briefing"
          className="w-full justify-center"
        >
          {audioStatus === 'loading' ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating audio…
            </span>
          ) : (
            '🎧 Generate Audio Briefing'
          )}
        </Button>
      )}

      {audioError && (
        <p role="alert" className="text-xs text-red-600">{audioError}</p>
      )}

      {/* Always-available text transcript — accessibility fallback */}
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium py-1">
          Read transcript
        </summary>
        <p className="mt-2 text-slate-700 leading-relaxed text-sm">{audioSummaryText}</p>
      </details>
    </section>
  )
}
