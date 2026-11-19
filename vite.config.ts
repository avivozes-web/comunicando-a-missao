import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const APP_VERSION = new Date().toISOString()

// version.json fica fora do cache do app: o app compara com a própria versão e se atualiza.
function versionFile(): Plugin {
  return {
    name: 'version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: APP_VERSION }) })
    },
  }
}

function previewData(): Plugin {
  const file = path.join(root, 'src/fixtures/preview.json')
  const send = (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: string) => void }, next: () => void) => {
    if (!req.url?.split('?')[0].endsWith('/preview-data.json')) return next()
    res.setHeader('content-type', 'application/json')
    res.end(fs.readFileSync(file, 'utf8'))
  }
  return {
    name: 'preview-data',
    configureServer(server) {
      server.middlewares.use(send)
    },
  }
}

export default defineConfig({
  base: '/comunicando-a-missao/',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [
    react(),
    previewData(),
    versionFile(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.png', 'apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'Comunicando a Missão',
        short_name: 'Comunicando',
        description: 'A central da mídia da Escola e da Missão Josué.',
        lang: 'pt-BR',
        start_url: '/comunicando-a-missao/',
        scope: '/comunicando-a-missao/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0A1F3D',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/comunicando-a-missao/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/version\.json/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  server: { host: '0.0.0.0', port: 5173 },
})
