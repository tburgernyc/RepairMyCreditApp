import { useStore, useUiState } from '../../store'
import { useFirebase } from '../../hooks/useFirebase'

export default function Header() {
  const { user, signOut } = useFirebase()
  const { isChatOpen } = useUiState()
  const toggleChat = useStore((s) => s.toggleChat)
  const status = useStore((s) => s.status)

  return (
    <header className="sticky top-0 z-30 glass-surface border-b border-white/40 px-6 h-16 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center" aria-hidden="true">
          <span className="text-white text-xs font-bold">RE</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-800 leading-none">Removal Engine</h1>
          <p className="text-xs text-slate-400">v12.6</p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Neural Strategist toggle — only show when analysis is complete */}
        {status === 'complete' && (
          <button
            type="button"
            onClick={toggleChat}
            aria-label={isChatOpen ? 'Close Neural Strategist chat' : 'Open Neural Strategist chat'}
            aria-expanded={isChatOpen}
            className="min-w-[44px] min-h-[44px] flex items-center gap-2 px-4 py-2
                       text-xs font-medium text-slate-600 rounded-full
                       hover:bg-slate-100 transition-all
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="hidden sm:inline">Neural Strategist</span>
          </button>
        )}

        {/* User avatar + sign out */}
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-[120px]">
              {user.displayName ?? user.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center
                         text-xs text-slate-500 hover:text-slate-700 rounded-full
                         hover:bg-slate-100 transition-colors
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
