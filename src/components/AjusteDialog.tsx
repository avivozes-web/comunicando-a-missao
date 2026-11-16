import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Icon } from './Icon'

export function AjusteDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) setText('')
  }, [open])

  async function save() {
    const body = text.trim()
    if (!body) return
    setBusy(true)
    try {
      await onSave(body)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && !busy) onClose() }}>
      <DialogContent>
        <div className="mh5">
          <div>
            <div className="eb">Ajuste</div>
            <DialogTitle className="dlg-title">Pedir ajuste</DialogTitle>
            <DialogDescription className="dlg-desc">O recado fica no cartão, com a data e quem pediu. A resposta aparece embaixo.</DialogDescription>
          </div>
          <button type="button" className="xb" onClick={onClose} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="mb">
          <label className="field">Recado
            <textarea className="inp" rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder="O que precisa mudar" />
          </label>
        </div>
        <div className="mf">
          <span />
          <button type="button" className="nx" disabled={busy || !text.trim()} onClick={() => void save()}>{busy ? 'Salvando…' : 'Registrar'}</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function authorFromEmail(email: string | null): string {
  if (!email) return 'Isabelle'
  const local = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  if (!local) return 'Isabelle'
  return local.split(' ').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
