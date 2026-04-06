import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useAnalysisStatus } from '../../store'

// State → visual config mapping.
// NOTE: idle color is #94a3b8 (slate-400) NOT #e5e7eb (slate-200).
// slate-200 fails WCAG 3:1 non-text contrast against the light background (ratio ~1.2:1).
// slate-400 passes at 3.2:1.
const STATE_CONFIG = {
  idle:      { color: '#94a3b8', speed: 0.003 },
  uploading: { color: '#94a3b8', speed: 0.008 },
  analyzing: { color: '#007AFF', speed: 0.018 },
  error:     { color: '#FF3B30', speed: 0.008 },
  complete:  { color: '#34C759', speed: 0.004 },
}

const STATUS_MESSAGES = {
  idle:      'Ready to analyze',
  uploading: 'Uploading report…',
  analyzing: 'Analyzing your credit report…',
  error:     'Issues found in your report',
  complete:  'Analysis complete',
}

function Icosahedron({ status, prefersReduced }) {
  const meshRef = useRef()
  const wireRef = useRef()
  const { color, speed } = STATE_CONFIG[status] ?? STATE_CONFIG.idle

  useFrame(() => {
    if (prefersReduced) return
    if (meshRef.current) {
      meshRef.current.rotation.y += speed
      meshRef.current.rotation.x += speed * 0.4
    }
    if (wireRef.current) {
      wireRef.current.rotation.y += speed
      wireRef.current.rotation.x += speed * 0.4
    }
  })

  return (
    <group>
      {/* Solid flat-shaded base */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.8, 0]} />
        <meshPhongMaterial color={color} flatShading transparent opacity={0.85} />
      </mesh>
      {/* Wireframe overlay */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.82, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

export default function KineticRemovalCore() {
  const status = useAnalysisStatus() // subscribes ONLY to status — no other re-renders
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className="relative w-56 h-56 mx-auto">
      {/* Canvas is purely decorative — hidden from assistive technology */}
      <Canvas
        aria-hidden="true"
        tabIndex={-1}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, 5]} intensity={0.3} />
        <Icosahedron status={status} prefersReduced={prefersReduced} />
      </Canvas>

      {/* Parallel live region — announces state changes to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {STATUS_MESSAGES[status] ?? STATUS_MESSAGES.idle}
      </div>
    </div>
  )
}
