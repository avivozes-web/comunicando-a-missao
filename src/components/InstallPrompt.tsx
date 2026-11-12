import { useEffect, useState } from 'react'
import { Icon } from './Icon'

const KEY = 'cm-pwa-hint'

type PromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function alreadyInstalled() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function iphone() {
  const pad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || pad
}

function remember() {
  try { localStorage.setItem(KEY, '1') } catch { /* private mode */ }
}

export function InstallPrompt() {
  const [install, setInstall] = useState<PromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    if (alreadyInstalled()) return
    try {
      if (localStorage.getItem(KEY) === '1') return
    } catch { /* private mode */ }
    if (iphone()) setIosHint(true)
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstall(event as PromptEvent)
      setIosHint(false)
    }
    const onInstalled = () => {
      remember()
      setInstall(null)
      setIosHint(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function accept() {
    if (!install) return
    await install.prompt()
    const choice = await install.userChoice
    if (choice.outcome === 'accepted') remember()
    setInstall(null)
  }

  function close() {
    remember()
    setInstall(null)
    setIosHint(false)
  }

  if (!install && !iosHint) return null

  return (
    <div className="install-hint" role="region" aria-label="Instalar app">
      <p>{install ? 'Leve a Central para a tela inicial.' : 'No iPhone: Compartilhar, depois Adicionar à Tela de Início.'}</p>
      {install && <button type="button" className="nx" onClick={() => void accept()}>Instalar app</button>}
      <button type="button" className="xb" onClick={close} aria-label="Fechar"><Icon name="x" /></button>
    </div>
  )
}
