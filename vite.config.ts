import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

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
  plugins: [react(), previewData()],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  server: { host: '0.0.0.0', port: 5173 },
})
