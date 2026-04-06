/**
 * UI interaction state.
 */
export const createUiSlice = (set) => ({
  isChatOpen: false,
  jurisdiction: 'federal', // 'federal' | 'california' | 'new-york'
  copiedId: null, // tracks which copy button last fired (for aria-live)

  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  closeChat: () => set({ isChatOpen: false }),
  openChat: () => set({ isChatOpen: true }),

  setJurisdiction: (jurisdiction) => set({ jurisdiction }),

  setCopied: (id) => {
    set({ copiedId: id })
    setTimeout(() => set({ copiedId: null }), 2000)
  },
})
