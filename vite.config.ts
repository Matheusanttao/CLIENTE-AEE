import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteApiDev } from './plugins/viteApiDev'

function createBuildVersion() {
  return new Date().toISOString().replace(/[-:]/g, '').replace('T', '.').slice(0, 13)
}

export default defineConfig(({ mode }) => {
  const buildVersion = createBuildVersion()

  return {
    plugins: [react(), tailwindcss(), viteApiDev(mode)],
    define: {
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion),
    },
    build: {
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-router-dom')) return 'vendor'
            if (id.includes('node_modules/@supabase')) return 'supabase'
            if (id.includes('node_modules/@tanstack')) return 'query'
            return undefined
          },
        },
      },
    },
  }
})
