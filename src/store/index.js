import { create } from 'zustand'
import { createAnalysisSlice } from './analysisSlice'
import { createUiSlice } from './uiSlice'
import { createAudioSlice } from './audioSlice'

/**
 * Combined Zustand store — canonical slice pattern.
 * Pass (...args) so each slice receives (set, get, api).
 */
export const useStore = create((...args) => ({
  ...createAnalysisSlice(...args),
  ...createUiSlice(...args),
  ...createAudioSlice(...args),
}))

// ─── Granular selector hooks ──────────────────────────────────────────────────
// Components subscribe ONLY to the fields they need — prevents wasted re-renders.

/** KineticRemovalCore subscribes to this only (status changes color + speed). */
export const useAnalysisStatus = () => useStore((s) => s.status)

export const useAnalysisResult = () =>
  useStore((s) => ({
    analysisId: s.analysisId,
    certaintyScore: s.certaintyScore,
    detractors: s.detractors,
    missionChecklist: s.missionChecklist,
    lendingExpansion: s.lendingExpansion,
    roadmap: s.roadmap,
    protocol: s.protocol,
    audioSummaryText: s.audioSummaryText,
    error: s.error,
    fileMetadata: s.fileMetadata,
  }))

export const useUiState = () =>
  useStore((s) => ({
    isChatOpen: s.isChatOpen,
    jurisdiction: s.jurisdiction,
    copiedId: s.copiedId,
  }))

export const useAudioState = () =>
  useStore((s) => ({
    audioStatus: s.audioStatus,
    blobUrl: s.blobUrl,
    audioError: s.audioError,
  }))
