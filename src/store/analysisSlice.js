/**
 * Analysis pipeline state.
 * status: 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'
 */
export const createAnalysisSlice = (set) => ({
  status: 'idle',
  analysisId: null,
  certaintyScore: null,
  detractors: [],
  missionChecklist: [],
  lendingExpansion: null,
  roadmap: [],
  protocol: null,
  audioSummaryText: null,
  error: null,
  fileMetadata: null,

  setStatus: (status) => set({ status }),

  setResult: (result, analysisId) =>
    set({
      status: 'complete',
      analysisId,
      certaintyScore: result.certaintyScore ?? null,
      detractors: result.detractors ?? [],
      missionChecklist: result.missionChecklist ?? [],
      lendingExpansion: result.lendingExpansion ?? null,
      roadmap: result.roadmap ?? [],
      protocol: result.protocol ?? null,
      audioSummaryText: result.audioSummary ?? null,
      error: null,
    }),

  setError: (error) => set({ status: 'error', error }),

  setFileMetadata: (fileMetadata) => set({ fileMetadata }),

  reset: () =>
    set({
      status: 'idle',
      analysisId: null,
      certaintyScore: null,
      detractors: [],
      missionChecklist: [],
      lendingExpansion: null,
      roadmap: [],
      protocol: null,
      audioSummaryText: null,
      error: null,
      fileMetadata: null,
    }),
})
