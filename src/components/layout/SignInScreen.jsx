import { useState } from 'react'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function SignInScreen({ onGoogleSignIn, onEmailSignIn, onSignUp, authError }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState(null)

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await onEmailSignIn(email, password)
      } else {
        await onSignUp(email, password, displayName)
      }
    } catch (err) {
      setLocalError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const error = localError || authError

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand mark */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-indigo-600
                          flex items-center justify-center mx-auto shadow-lg" aria-hidden="true">
            <span className="text-white text-xl font-bold">RE</span>
          </div>
          <h1 className="text-display">Removal Engine</h1>
          <p className="text-sm text-slate-500">Institutional-grade credit dispute analysis</p>
        </div>

        {/* Card */}
        <div className="glass-surface rounded-[2rem] p-8 space-y-6">
          <h2 className="text-lg font-semibold text-slate-800 text-center">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>

          {/* Google */}
          <Button
            onClick={onGoogleSignIn}
            disabled={loading}
            ariaLabel="Sign in with Google"
            className="w-full justify-center flex items-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" aria-hidden="true" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-200" aria-hidden="true" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <Input
                id="display-name"
                label="Full Name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                autoComplete="name"
              />
            )}
            <Input
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete={mode === 'signin' ? 'username' : 'email'}
              required
            />
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
            />

            {error && (
              <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              ariaLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
              className="w-full justify-center"
            >
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-xs text-slate-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setLocalError(null) }}
              className="text-blue-600 hover:underline font-medium focus-visible:outline-none focus-visible:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
