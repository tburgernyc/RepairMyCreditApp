import { useFirebase } from './hooks/useFirebase'
import Header from './components/layout/Header'
import MainContent from './components/layout/MainContent'
import NeuralStrategist from './components/chat/NeuralStrategist'
import SignInScreen from './components/layout/SignInScreen'

function SplashLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto animate-pulse" aria-hidden="true" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  const { user, authLoading, authError, signInGoogle, signInEmail, signUpEmail } = useFirebase()

  if (authLoading) return <SplashLoader />

  if (!user) {
    return (
      <SignInScreen
        onGoogleSignIn={signInGoogle}
        onEmailSignIn={signInEmail}
        onSignUp={signUpEmail}
        authError={authError}
      />
    )
  }

  return (
    // Global mesh gradient background
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30">
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <MainContent />
      </main>

      {/* Fixed-position slide-out chat panel — rendered outside main flow */}
      <NeuralStrategist />
    </div>
  )
}
