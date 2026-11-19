import { registerSW } from 'virtual:pwa-register'

// Versão do build. Muda a cada deploy (vite.config.ts grava a mesma em version.json).
export const APP_VERSION = __APP_VERSION__

type Listener = (fresh: boolean) => void
const listeners = new Set<Listener>()
let fresh = false

export function onNewVersion(listener: Listener) {
  listeners.add(listener)
  listener(fresh)
  return () => listeners.delete(listener)
}

function announce() {
  fresh = true
  listeners.forEach((listener) => listener(true))
}

async function remoteVersion(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!response.ok) return null
    const body = (await response.json()) as { version?: string }
    return body.version || null
  } catch {
    return null
  }
}

// Atualiza de verdade: tira o service worker antigo, apaga o cache e abre a versão nova.
export async function hardRefresh(version?: string | null) {
  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.() || []
    await Promise.all(registrations.map((registration) => registration.unregister()))
    const keys = await caches?.keys?.() || []
    await Promise.all(keys.map((key) => caches.delete(key)))
  } catch {
    // Mesmo sem conseguir limpar, recarrega.
  }
  const url = new URL(window.location.href)
  url.searchParams.set('v', version || String(Date.now()))
  window.location.replace(url.toString())
}

async function check(onLaunch: boolean) {
  const version = await remoteVersion()
  if (!version || version === APP_VERSION) return
  const key = `cm-refresh-${version}`
  let tried = false
  try { tried = sessionStorage.getItem(key) === '1' } catch { /* private mode */ }
  if (onLaunch && !tried) {
    try { sessionStorage.setItem(key, '1') } catch { /* private mode */ }
    await hardRefresh(version)
    return
  }
  announce()
}

export function startPwa() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      const update = () => {
        if (navigator.onLine) void registration?.update().catch(() => undefined)
      }
      window.setInterval(() => { update(); void check(false) }, 5 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        update()
        void check(false)
      })
    },
  })
  void check(true)
}
