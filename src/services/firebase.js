import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// VITE_FIREBASE_CONFIG is the JSON object from Firebase console
// stored as a JSON string in .env — safe to expose (public Firebase config)
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}')

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
