import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api/* to `vercel dev` (port 3000) during local development.
    // Run both: `vercel dev` (port 3000) + `npm run dev` (port 5173)
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'], // prevents CJS worker shim failure
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
})
