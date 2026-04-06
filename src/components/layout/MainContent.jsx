import { useStore, useAnalysisResult, useUiState } from '../../store'
import UploadZone from '../ui/UploadZone'
import Card from '../ui/Card'
import Button from '../ui/Button'
import DisputePortalText from '../ui/DisputePortalText'
import AudioBriefing from './AudioBriefing'
import KineticRemovalCore from '../3d/KineticRemovalCore'

const JURISDICTION_LABELS = {
  federal: 'Federal',
  california: 'California CCPA',
  'new-york': 'New York',
}

// ─── Loading skeleton ─────────────────────────���──────────────────────────────
function AnalyzingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-label="Analyzing report" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-surface rounded-[1.5rem] p-6 h-40 bg-white/20" />
      ))}
    </div>
  )
}

// ─── Error state ─────────────────────────────────────────────────────────────
function ErrorState({ error }) {
  const reset = useStore((s) => s.reset)
  return (
    <Card className="text-center space-y-4">
      <div className="text-4xl" aria-hidden="true">⚠️</div>
      <h2 className="text-display text-xl text-red-700">Analysis Failed</h2>
      <p className="text-sm text-slate-600">{error}</p>
      <Button onClick={reset} ariaLabel="Try again">Try Again</Button>
    </Card>
  )
}

// ─── Detractor card ────────────────────────────────��─────────────────────────
function DetractorCard({ detractor, index }) {
  return (
    <article
      aria-label={`Detractor: ${detractor.account}`}
      className="glass-surface rounded-[1.5rem] p-6 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" aria-hidden="true" />
          <h3 className="text-slate-800 font-semibold text-base truncate" title={detractor.account}>
            {detractor.account}
          </h3>
        </div>
        {detractor.metro2Code && (
          <span className="flex-shrink-0 text-xs font-mono bg-slate-100 text-slate-600 rounded-lg px-2 py-1">
            Metro 2: {detractor.metro2Code}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm text-slate-700">
        <p><span className="font-medium text-slate-500">Issue: </span>{detractor.issue}</p>
        <p><span className="font-medium text-slate-500">Strategy: </span>{detractor.removalTactic}</p>
      </div>

      <DisputePortalText
        detractorIndex={index}
        onlineDisputeText={detractor.onlineDisputeText ?? {}}
      />
    </article>
  )
}

// ─── Protocol / Notes area ─────────────────────────────────���─────────────────
function ProtocolSection({ protocol }) {
  const { jurisdiction } = useUiState()
  const setJurisdiction = useStore((s) => s.setJurisdiction)
  const label = JURISDICTION_LABELS[jurisdiction] ?? 'Federal'

  return (
    <section aria-labelledby="protocol-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-subheader">Executive Protocol</p>
        <div>
          <label htmlFor="jurisdiction-select" className="sr-only">Select jurisdiction</label>
          <select
            id="jurisdiction-select"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            className="surface-inset rounded-full px-4 py-2 text-xs font-medium text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
          >
            <option value="federal">Federal</option>
            <option value="california">California</option>
            <option value="new-york">New York</option>
          </select>
        </div>
      </div>

      {/* aria-live announces jurisdiction header change to AT */}
      <div aria-live="polite">
        <h2
          id="protocol-heading"
          className="text-lg font-semibold text-slate-800"
        >
          {label} Credit Protocol
        </h2>
      </div>

      <article
        className="surface-inset rounded-[1.5rem] p-6 text-sm text-slate-700
                   leading-relaxed whitespace-pre-wrap bg-amber-50/30
                   border-l-4 border-amber-200/60"
      >
        {protocol}
      </article>
    </section>
  )
}

// ─── Certainty score badge ────────────────────────────────────────────────────
function CertaintyScore({ score }) {
  const color =
    score >= 80 ? 'text-green-600' :
    score >= 60 ? 'text-amber-600' :
    'text-red-600'

  return (
    <div className="glass-surface rounded-[1.5rem] p-6 text-center">
      <p className="text-subheader mb-1">Removal Certainty Score</p>
      <p className={`text-6xl font-bold tracking-tight ${color}`} aria-label={`${score} percent`}>
        {score}<span className="text-2xl">%</span>
      </p>
    </div>
  )
}

// ─── Mission checklist ────────────────────────────────────────────────────────
function MissionChecklist({ items }) {
  if (!items?.length) return null
  return (
    <section aria-labelledby="checklist-heading">
      <p id="checklist-heading" className="text-subheader mb-3">Mission Checklist</p>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="glass-surface rounded-xl p-4 flex gap-3 text-sm">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700
                             text-xs font-bold flex items-center justify-center" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-slate-800">{item.step}</p>
              <p className="text-slate-600 mt-0.5">{item.instruction}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ─── Lending expansion ───────────────────────────────────────────────────────��
function LendingExpansion({ data }) {
  if (!data) return null
  const tiles = [
    { key: 'personal', label: 'Personal' },
    { key: 'business', label: 'Business' },
    { key: 'realEstate', label: 'Real Estate' },
  ]
  return (
    <section aria-labelledby="lending-heading">
      <p id="lending-heading" className="text-subheader mb-3">Lending Expansion Paths</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tiles.map(({ key, label }) => (
          <div key={key} className="glass-surface-sm rounded-[1.5rem] p-4 space-y-1">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="text-sm text-slate-700">{data[key]}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Roadmap ──────────────────────────────────────────────────────────��──────
function Roadmap({ items }) {
  if (!items?.length) return null
  return (
    <section aria-labelledby="roadmap-heading">
      <p id="roadmap-heading" className="text-subheader mb-3">Action Roadmap</p>
      <ol className="space-y-2">
        {items.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-slate-700">
            <span className="flex-shrink-0 text-blue-500 font-bold">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ─── Main export ───────────────────────────────���─────────────────────────────
export default function MainContent() {
  const status = useStore((s) => s.status)
  const {
    certaintyScore, detractors, missionChecklist,
    lendingExpansion, roadmap, protocol, error,
  } = useAnalysisResult()

  return (
    <div className="space-y-6">
      {/* 3D Core — always visible */}
      <div className="flex justify-center py-4">
        <KineticRemovalCore />
      </div>

      {/* State-driven content */}
      {(status === 'idle') && <UploadZone />}

      {status === 'uploading' && (
        <div className="text-center space-y-3">
          <UploadZone />
          <p className="text-sm text-slate-500 animate-pulse">Preparing your report…</p>
        </div>
      )}

      {status === 'analyzing' && <AnalyzingSkeleton />}

      {status === 'error' && <ErrorState error={error} />}

      {status === 'complete' && (
        <div className="space-y-6">
          {/* Score */}
          {certaintyScore != null && <CertaintyScore score={certaintyScore} />}

          {/* Detractors */}
          {detractors.length > 0 && (
            <section aria-labelledby="detractors-heading">
              <p id="detractors-heading" className="text-subheader mb-3">
                Identified Detractors ({detractors.length})
              </p>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {detractors.map((d, i) => (
                  <DetractorCard key={i} detractor={d} index={i} />
                ))}
              </div>
            </section>
          )}

          {detractors.length === 0 && (
            <Card className="text-center space-y-2">
              <p className="text-3xl" aria-hidden="true">✅</p>
              <h2 className="text-display text-xl text-green-700">No Negative Items Found</h2>
              <p className="text-sm text-slate-600">Your credit report appears clean.</p>
            </Card>
          )}

          {/* Protocol */}
          {protocol && <ProtocolSection protocol={protocol} />}

          {/* Mission checklist */}
          <MissionChecklist items={missionChecklist} />

          {/* Lending expansion */}
          <LendingExpansion data={lendingExpansion} />

          {/* Roadmap */}
          <Roadmap items={roadmap} />

          {/* Audio briefing */}
          <AudioBriefing />

          {/* Reset */}
          <div className="flex justify-center pt-4">
            <Button
              variant="ghost"
              onClick={() => useStore.getState().reset()}
              ariaLabel="Start a new analysis"
            >
              ↩ New Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
