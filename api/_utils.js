/**
 * Shared Edge Function utilities.
 * _ prefix prevents Vercel from treating this as a function route.
 *
 * Implements JWT verification and Firestore REST access without
 * Firebase Admin SDK (which requires Node.js — unavailable in Edge Runtime).
 */

// ─── Base64url helper ────────────────────────────────────────────────────────

/**
 * Encodes a string as base64url (JWT-compatible).
 * btoa() alone produces regular base64 with +, /, = which Google's OAuth rejects.
 */
function toBase64Url(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// ─── JWT Verification ────────────────────────────────────────────────────────

let cachedPublicKeys = null
let publicKeysCachedAt = 0
const PUBLIC_KEY_TTL_MS = 3_600_000 // 1 hour

async function getFirebasePublicKeys() {
  if (cachedPublicKeys && Date.now() - publicKeysCachedAt < PUBLIC_KEY_TTL_MS) {
    return cachedPublicKeys
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  )
  cachedPublicKeys = await res.json()
  publicKeysCachedAt = Date.now()
  return cachedPublicKeys
}

function base64UrlToBuffer(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function pemToDer(pem) {
  const lines = pem.split('\n').filter((l) => !l.startsWith('---'))
  const b64 = lines.join('')
  return base64UrlToBuffer(b64)
}

/**
 * Verifies a Firebase ID token using Google's public keys and Web Crypto API.
 * @param {string} token - Firebase ID token from Authorization: Bearer header
 * @returns {Promise<{ uid: string, email: string }>}
 */
export async function verifyFirebaseJWT(token) {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format')
  const [headerB64, payloadB64, signatureB64] = parts

  // Decode header to find the key ID (kid)
  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
  const keys = await getFirebasePublicKeys()
  const publicKeyPem = keys[header.kid]
  if (!publicKeyPem) throw new Error('Unknown JWT key ID')

  // Import RSA public key
  const keyData = pemToDer(publicKeyPem)
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )

  // Verify signature
  const sigBuffer = base64UrlToBuffer(signatureB64)
  const dataBuffer = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sigBuffer, dataBuffer)
  if (!valid) throw new Error('JWT signature invalid')

  // Validate claims
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) throw new Error('JWT expired')

  const projectId = process.env.FIREBASE_PROJECT_ID
  if (projectId && payload.aud !== projectId) throw new Error('JWT wrong audience')

  return {
    uid: payload.user_id || payload.sub,
    email: payload.email ?? null,
  }
}

// ─── Firestore REST helpers ──────────────────────────────────────────────────

let serviceAccountAccessToken = null
let accessTokenExpiresAt = 0

async function getServiceAccountToken() {
  if (serviceAccountAccessToken && Date.now() < accessTokenExpiresAt) {
    return serviceAccountAccessToken
  }

  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  const now = Math.floor(Date.now() / 1000)

  // Build JWT for service account — must use base64url (not btoa regular base64)
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = toBase64Url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  )

  // Import service account private key
  const pkPem = sa.private_key
  const pkDer = pemToDer(pkPem)
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pkDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign JWT
  const signingInput = new TextEncoder().encode(`${header}.${payload}`)
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, signingInput)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const jwt = `${header}.${payload}.${sigB64}`

  // Exchange for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const tokenData = await tokenRes.json()
  serviceAccountAccessToken = tokenData.access_token
  accessTokenExpiresAt = Date.now() + 3_500_000 // ~58 min
  return serviceAccountAccessToken
}

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${
  process.env.FIREBASE_PROJECT_ID
}/databases/(default)/documents`

/**
 * Read a Firestore document via REST.
 * @param {string} path - e.g. "rateLimits/uid_2024-01-01"
 * @returns {Promise<object|null>}
 */
export async function firestoreGet(path) {
  const token = await getServiceAccountToken()
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Firestore GET failed: ${res.status}`)
  const doc = await res.json()
  return firestoreDocToObject(doc)
}

/**
 * Write/merge a Firestore document via REST.
 * @param {string} path
 * @param {object} data
 */
export async function firestoreSet(path, data) {
  const token = await getServiceAccountToken()
  const fields = objectToFirestoreFields(data)
  const res = await fetch(
    `${FIRESTORE_BASE}/${path}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  )
  if (!res.ok) throw new Error(`Firestore SET failed: ${res.status}`)
}

/**
 * Create a new Firestore document with auto-generated ID.
 * @param {string} collection
 * @param {object} data
 * @returns {Promise<string>} Document ID
 */
export async function firestoreCreate(collection, data) {
  const token = await getServiceAccountToken()
  const fields = objectToFirestoreFields(data)
  const res = await fetch(`${FIRESTORE_BASE}/${collection}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Firestore CREATE failed: ${res.status}`)
  const doc = await res.json()
  return doc.name.split('/').pop()
}

// ─── Firestore value serializers ─────────────────────────────────────────────

function objectToFirestoreFields(obj) {
  const fields = {}
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(value)
  }
  return fields
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') return { doubleValue: value }
  if (typeof value === 'string') return { stringValue: value }
  if (Array.isArray(value))
    return { arrayValue: { values: value.map(toFirestoreValue) } }
  if (typeof value === 'object')
    return { mapValue: { fields: objectToFirestoreFields(value) } }
  return { stringValue: String(value) }
}

function firestoreDocToObject(doc) {
  if (!doc.fields) return {}
  const obj = {}
  for (const [key, val] of Object.entries(doc.fields)) {
    obj[key] = fromFirestoreValue(val)
  }
  return obj
}

function fromFirestoreValue(val) {
  if ('stringValue' in val) return val.stringValue
  if ('integerValue' in val) return parseInt(val.integerValue)
  if ('doubleValue' in val) return val.doubleValue
  if ('booleanValue' in val) return val.booleanValue
  if ('nullValue' in val) return null
  if ('arrayValue' in val) return (val.arrayValue.values ?? []).map(fromFirestoreValue)
  if ('mapValue' in val) return firestoreDocToObject(val.mapValue)
  return null
}
