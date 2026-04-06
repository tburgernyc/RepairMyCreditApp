/**
 * Audio synthesis state.
 * audioStatus: 'idle' | 'loading' | 'ready' | 'error'
 */
export const createAudioSlice = (set, get) => ({
  audioStatus: 'idle',
  blobUrl: null,
  audioError: null,

  setAudioStatus: (audioStatus) => set({ audioStatus }),

  setBlobUrl: (blobUrl) => set({ blobUrl, audioStatus: 'ready', audioError: null }),

  setAudioError: (audioError) => set({ audioStatus: 'error', audioError }),

  revokeBlobUrl: () => {
    const { blobUrl } = get()
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    set({ blobUrl: null, audioStatus: 'idle' })
  },
})
