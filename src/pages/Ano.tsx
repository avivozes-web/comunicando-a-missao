import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { MONTHS_FULL } from '@/lib/dates'
import { uid } from '@/lib/utils'
import type { YearDate } from '@/lib/types'

export function Ano() {
  const data = useData()
  const [open, setOpen] = useState(false)
  const year = 2027
  const months = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return data.bundle.year_months.find((item) => item.year === year && item.month === month) || {
      year, month, theme: null, campaign: month === 11,
    }
  })

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Visão do ano</div>
          <h1>Ano 2027</h1>
          <div className="sub">Um tema grande por mês e as datas que mexem com o conteúdo das duas contas.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="lg">
            <span><i style={{ background: '#F16623' }} />Campanha de matrícula</span>
            <span><i style={{ background: '#EEF2F8', border: '1px solid #C9D3E2' }} />Data do ano</span>
          </div>
          <button type="button" className="btn pri" onClick={() => setOpen(true)}><Icon name="star" /> Definir temas</button>
        </div>
      </div>
      <div className="yr">
        {months.map((month) => {
          const dates = data.bundle.year_dates.filter((item) => item.year === year && item.month === month.month)
          return (
            <div key={month.month} className={`card mo ${month.campaign ? 'camp' : ''}`}>
              <div className="mh">
                <b>{MONTHS_FULL[month.month - 1]}</b>
                {month.campaign ? <span className="cbadge">Campanha</span> : <span>2027</span>}
              </div>
              <label className="theme">
                <Icon name="star" />
                <input
                  value={month.theme || ''}
                  placeholder="tema do mês"
                  onChange={(event) => void data.saveMonth({ ...month, theme: event.target.value || null })}
                />
              </label>
              <div className="tags">
                {dates.map((item) => (
                  <span key={item.id} className={`et ${item.kind === 'escola' ? 'mj' : ''} ${item.kind === 'pausa' ? 'pause' : ''}`}>
                    <Icon name="flag" size={11} />
                    {item.label}
                    {item.detail && <small>{item.detail}</small>}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <ThemeDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function ThemeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useData()
  const [label, setLabel] = useState('')
  const [month, setMonth] = useState(1)
  const [detail, setDetail] = useState('')
  const [kind, setKind] = useState<YearDate['kind']>('data')

  async function add() {
    if (!label.trim()) return
    await data.saveYearDate({
      id: uid(),
      year: 2027,
      month,
      label: label.trim(),
      detail: detail.trim() || null,
      kind,
      event_date: null,
    })
    setLabel('')
    setDetail('')
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <div className="mh5">
          <div>
            <div className="eb">Ano 2027</div>
            <DialogTitle className="dlg-title">Definir temas</DialogTitle>
            <DialogDescription className="dlg-desc">O tema do mês fica no cartão. Aqui entram as datas que mudam a grade.</DialogDescription>
          </div>
          <button type="button" className="xb" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="mb stack">
          {data.bundle.year_dates.filter((item) => item.year === 2027).map((item) => (
            <div key={item.id} className="fr">
              <div className="num">{item.month}</div>
              <div />
              <div className="who"><b>{item.label}</b><span>{MONTHS_FULL[item.month - 1]}{item.detail ? ` · ${item.detail}` : ''}</span></div>
              <button type="button" className="btn" onClick={() => void data.removeYearDate(item.id)}>Apagar</button>
            </div>
          ))}
          <div className="form-grid">
            <label className="field">Mês
              <select className="sel" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                {MONTHS_FULL.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
              </select>
            </label>
            <label className="field">Tipo
              <select className="sel" value={kind} onChange={(event) => setKind(event.target.value as YearDate['kind'])}>
                <option value="data">Data do ano</option>
                <option value="escola">Campanha da Escola</option>
                <option value="missao">Data da Missão</option>
                <option value="pausa">Pausa</option>
              </select>
            </label>
            <label className="field">Nome
              <input className="inp" value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
            <label className="field">Detalhe
              <input className="inp" value={detail} onChange={(event) => setDetail(event.target.value)} />
            </label>
          </div>
        </div>
        <div className="mf">
          <span />
          <button type="button" className="nx" onClick={() => void add()}>Adicionar data</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
