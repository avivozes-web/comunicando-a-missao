import { useMemo, useState } from 'react'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, dm, todayISO } from '@/lib/dates'
import { fmt } from '@/lib/format'
import type { Account, Follower, FollowerEvent } from '@/lib/types'

const FEATURED = ['sheilagoulart04', 'madrugadasemfome', 'missoes.liderar', 'pr.gesielamorim', 'saracoutooficial', 'weslanirodrigues', 'missaojosue_barravelha', 'elvesemary', 'josuefernandesaqts', '027_esliel', 'admjjuazeirodonorte', 'joisyeloh']

export function Seguidores() {
  const data = useData()
  const ui = useUi()
  const account: Account = ui.filter === 'missao' ? 'missao' : 'escola'
  const [query, setQuery] = useState('')
  const today = todayISO()
  const snapshots = data.bundle.snapshots.filter((row) => row.account === account)
  const dates = [...new Set(snapshots.map((row) => row.snapshot_date))].sort()
  const latest = dates[dates.length - 1] || null
  const current = latest ? snapshots.filter((row) => row.snapshot_date === latest) : []
  const followers = data.bundle.followers.filter((row) => row.account === account)
  const byHandle = new Map(followers.map((row) => [row.arroba, row]))
  const withCard = current.filter((row) => byHandle.has(row.arroba)).length
  const day = data.bundle.goal_days.find((row) => row.account === account && row.day === (latest || today))
  const entered = day?.entraram
  const left = day?.sairam
  const events = data.bundle.events.filter((event) => event.account === account)
  const recentIn = events.filter((event) => event.kind === 'entrou' && event.event_date >= addDays(latest || today, -14)).sort((a, b) => b.event_date.localeCompare(a.event_date)).slice(0, 4)
  const recentOut = events.filter((event) => event.kind === 'saiu' && event.event_date >= addDays(latest || today, -14)).sort((a, b) => b.event_date.localeCompare(a.event_date)).slice(0, 4)
  const cards = useMemo(() => {
    const text = query.trim().toLowerCase().replace(/^@/, '')
    return followers
      .filter((row) => {
        if (!text) return true
        return row.arroba.toLowerCase().includes(text) || (row.bio || '').toLowerCase().includes(text) || (row.nicho || '').toLowerCase().includes(text)
      })
      .sort((a, b) => {
        const ai = FEATURED.indexOf(a.arroba)
        const bi = FEATURED.indexOf(b.arroba)
        if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        return (b.seguidores || 0) - (a.seguidores || 0)
      })
  }, [followers, query])

  if (ui.filter === 'missao' && current.length === 0) {
    return (
      <>
        <Header />
        <div className="card secbox"><div className="empty">Ainda não há snapshot da conta Missão.</div></div>
      </>
    )
  }

  return (
    <>
      <Header onSearch={() => document.getElementById('busca-seguidor')?.focus()} />
      <p className="src" style={{ margin: '-8px 0 14px' }}>
        Fonte: snapshot de {latest ? dm(latest) : '—'} e as fichas do controle diário. {withCard} de {current.length || '—'} têm ficha{current.length ? `; ${current.length - withCard} ainda não` : ''}.
      </p>
      <div className="pk">
        <div className="card kpi"><div className="k">Seguidores agora</div><div className="v">{current.length || '—'}</div><div className="s">{handle(account)}{latest ? ` · ${dm(latest)}` : ''}</div></div>
        <div className="card kpi"><div className="k">Entraram hoje</div><div className="v">{entered === null || entered === undefined ? '—' : entered}</div><div className="s">{latest ? `Snapshot de ${dm(latest)}` : 'Sem snapshot'}</div></div>
        <div className="card kpi"><div className="k">Saíram hoje</div><div className="v">{left === null || left === undefined ? '—' : left}</div><div className="s">{left === 0 ? 'Ninguém deixou de seguir' : 'No controle do dia'}</div></div>
        <div className="card kpi"><div className="k">Com ficha</div><div className="v">{current.length ? withCard : '—'}</div><div className="s">{current.length ? `${current.length - withCard} ainda sem ficha` : 'Sem snapshot'}</div></div>
      </div>
      <div className="col2">
        <EventCard title="Entraram recentemente" events={recentIn} all={events} empty="Nenhuma entrada neste intervalo." />
        <EventCard title="Saíram recentemente" events={recentOut} all={events} empty="Nenhuma saída neste intervalo." />
      </div>
      <div className="card secbox">
        <h3>Fichas</h3>
        <p className="src">A lista completa de quem tem ficha. Bio e “o que posta” vêm da última leitura de cada perfil.</p>
        <label className="search">
          <Icon name="search" />
          <input id="busca-seguidor" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por @, bio ou o que posta" />
        </label>
        {cards.length === 0 && <div className="empty">Nenhuma ficha com esse texto.</div>}
        <div className="fg">
          {cards.map((card) => <Ficha key={card.arroba} card={card} events={events} />)}
        </div>
      </div>
    </>
  )
}

function Header({ onSearch }: { onSearch?: () => void }) {
  return (
    <div className="top">
      <div>
        <div className="eyebrow">Acompanhar</div>
        <h1>Painel de seguidores</h1>
        <div className="sub">Quem entrou, quem saiu e a ficha de cada @ — quantidade de seguidores, quem segue, a bio e o que posta.</div>
      </div>
      {onSearch && <button type="button" className="btn" onClick={onSearch}><Icon name="search" /> Buscar @</button>}
    </div>
  )
}

function EventCard({ title, events, all, empty }: { title: string; events: FollowerEvent[]; all: FollowerEvent[]; empty: string }) {
  return (
    <div className="card secbox">
      <h3>{title}</h3>
      <p className="src">Controle diário dos últimos 14 dias.</p>
      {events.length === 0 && <div className="empty">{empty}</div>}
      {events.map((event) => {
        const back = event.kind === 'entrou' && all.some((other) => other.kind === 'saiu' && other.arroba && other.arroba === event.arroba && other.event_date < event.event_date)
        return (
          <div className="mv" key={event.id}>
            <span className={`tag ${event.kind === 'entrou' ? 'in' : 'out'}`}>{event.kind === 'entrou' ? 'entrou' : 'saiu'}</span>
            <span className="at">{event.arroba ? `@${event.arroba}` : event.nome || 'sem @'}</span>
            <span className="dt">{dm(event.event_date)}{back ? ' · voltou' : ''}{event.note ? ` · ${event.note}` : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

function Ficha({ card, events }: { card: Follower; events: FollowerEvent[] }) {
  const unavailable = /indispon[ií]vel|não encontrada|nao encontrada/i.test(`${card.bio || ''} ${card.nicho || ''}`)
  const date = card.ficha_em ? dm(card.ficha_em) : '—'
  const movement = events.filter((event) => event.arroba === card.arroba).sort((a, b) => b.event_date.localeCompare(a.event_date))[0]
  return (
    <div className="card fc">
      <div className="at">@{card.arroba}</div>
      <div className="nums">{fmt(card.seguidores)} seguidores · segue {fmt(card.seguindo)} · {fmt(card.posts)} posts</div>
      <div className="bio">{card.bio?.trim() || (unavailable ? 'Perfil indisponível na última leitura.' : '—')}</div>
      <div className="nich">{unavailable || !card.nicho ? 'Ainda sem leitura do que posta' : `Posta: ${card.nicho}`}</div>
      <div className="ft">
        Ficha de {date}
        {card.privado ? ' · conta privada' : ''}
        {movement ? ` · ${movement.kind === 'saiu' ? 'saiu' : 'entrou'} em ${dm(movement.event_date)}` : ''}
      </div>
    </div>
  )
}

function handle(account: Account) {
  return account === 'escola' ? '@missaojosue.educacao' : '@missaojosue.ofc'
}
