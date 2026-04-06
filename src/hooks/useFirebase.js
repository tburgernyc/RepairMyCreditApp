import { useState, useEffect, useCallback } from 'react'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../services/firebase'
import { useStore } from '../store'

/**
 * Firebase auth hook — provides sign-in, sign-out, and a fresh token getter.
 * CRITICAL: getToken() calls getIdToken() fresh on every API request.
 * Never store the raw token string in state — it expires after 1 hour.
 */
export function useFirebase() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const reset = useStore((s) => s.reset)
  const revokeBlobUrl = useStore((s) => s.revokeBlobUrl)

  // Subscribe to auth state — upserts user profile doc on sign-in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
      if (firebaseUser) {
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              displayName: firebaseUser.displayName ?? firebaseUser.email,
              email: firebaseUser.email,
              lastSeenAt: serverTimestamp(),
            },
            { merge: true }
          )
        } catch {
          // Non-fatal — don't block auth on Firestore write failure
        }
      }
    })
    return unsub
  }, [])

  const signInGoogle = useCallback(async () => {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setAuthError(err.message)
    }
  }, [])

  const signInEmail = useCallback(async (email, password) => {
    setAuthError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }, [])

  const signUpEmail = useCallback(async (email, password, displayName) => {
    setAuthError(null)
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
      if (displayName) {
        await updateProfile(newUser, { displayName })
      }
    } catch (err) {
      setAuthError(err.message)
      throw err
    }
  }, [])

  const signOutUser = useCallback(async () => {
    revokeBlobUrl()
    reset()
    await signOut(auth)
  }, [reset, revokeBlobUrl])

  /**
   * Returns a fresh Firebase ID token for API Authorization headers.
   * Call this immediately before every fetch — never cache the result.
   * @returns {Promise<string>}
   */
  const getToken = useCallback(async () => {
    if (!auth.currentUser) throw new Error('Not authenticated')
    return auth.currentUser.getIdToken(false)
  }, [])

  return {
    user,
    authLoading,
    authError,
    signInGoogle,
    signInEmail,
    signUpEmail,
    signOut: signOutUser,
    getToken,
  }
}
