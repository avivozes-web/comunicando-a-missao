import { useMemo, useState } from 'react'
import { AccountChip, EditButton, FormatChip } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, isoWeekday, todayISO, weekdayShort } from '@/lib/dates'
import { matchesAccount } from '@/lib/logic'
import type { Idea } from '@/lib/types'

export function Ideias() {
  const data = useData()
  const ui = useUi()
  const [history, setHistory] = useState(false)
  const ideas = data.bundle.ideas.filter((idea) => matchesAccount(idea.account, ui.filter))
  const coluna = ideas.filter((idea) => idea.status === 'ideia')
  const aprovadas = ideas.filter((idea) => idea.status === 'aprovada')
  const publicadas = ideas.filter((idea) => idea.status === 'publicada')
  const cadence = useMemo(() => nextEsdras(ideas), [ideas])

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Ideias</div>
          <h1>Banco de Ideias</h1>
          <div className="sub">Cada cartão anda por Ideia, Aprovada e Publicada. A aprovada fica aqui até ser usada.</div>
          <div className="cadence">
            <span className="av" style={{ background: '#5B6CF0', width: 18, height: 18, fontSize: 8 }}>E</span>
            <div>
              <b>Atualizado pelo Esdras toda segunda e quinta</b> <span className="prop">proposta — a Isabelle confirma</span>
              <div className="when">{cadence}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setHistory((value) => !value)}><Icon name="refresh" /> {history ? 'Ver o banco' : 'Ver histórico'}</button>
          <button type="button" className="btn pri" onClick={() => ui.openIdea(null)}><Icon name="plus" /> Nova ideia</button>
        </div>
      </div>
      <div className="hint">
        <div>As ideias <b>publicadas</b> saem destas colunas e vão para o Histórico, para a gente não repetir tema. As que <b>não forem aprovadas</b> saem do banco.</div>
        <div className="arrowflow">
          <span className="st s-ideia">Ideia</span>
          <Icon name="chevron" size={14} />
          <span className="st s-aprovada">Aprovada</span>
          <Icon name="chevron" size={14} />
          <span className="st s-publicada">Publicada</span>
        </div>
      </div>
      {history ? (
        <div className="card secbox">
          <h3>Histórico</h3>
          <p className="src">O que já foi publicado, para não repetir o tema.</p>
          {publicadas.length === 0 && <div className="empty">Nenhuma ideia publicada ainda.</div>}
          <div className="stack-sm">
            {publicadas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
          </div>
        </div>
      ) : (
        <div className="board">
          <Column title="Ideia" ideas={coluna} />
          <Column title="Aprovada" ideas={aprovadas} />
        </div>
      )}
    </>
  )
}

function Column({ title, ideas }: { title: string; ideas: Idea[] }) {
  return (
    <div className="col">
      <div className="ch"><h3>{title}</h3><span className="n">{ideas.length}</span></div>
      <div className="list">
        {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
      </div>
    </div>
  )
}

function IdeaCard({ idea }: { idea: Idea }) {
  const data = useData()
  const ui = useUi()
  const when = !idea.suggested_date
    ? 'Sem data'
    : idea.status === 'aprovada'
      ? `Agendado ${idea.suggested_date.slice(8, 10)}/${idea.suggested_date.slice(5, 7)}`
      : `Sugestão ${idea.suggested_date.slice(8, 10)}/${idea.suggested_date.slice(5, 7)}`
  return (
    <div className="card ic">
      <div className="ih">
        <div className={`bulb ${idea.account === 'escola' ? 'mj' : 'mi'}`}><Icon name="bulb" /></div>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button" className={`hrt ${idea.heart ? 'on' : ''}`} onClick={() => void data.toggleHeart(idea.id)} aria-label="Favoritar" style={{ color: idea.heart ? '#F16623' : '#C5CAD3', background: 'transparent', border: 0 }}>
            <Icon name="heart" />
          </button>
          <EditButton onClick={() => ui.openIdea(idea)} />
        </span>
      </div>
      <h3>{idea.title}</h3>
      <p>{idea.body}</p>
      <div className="tg">
        <AccountChip account={idea.account} />
        <FormatChip format={idea.format} />
        {idea.tags.map((tag) => <span key={tag} className="chip c-gray">{tag}</span>)}
        <span className={`st ${idea.status === 'aprovada' ? 's-aprovada' : idea.status === 'publicada' ? 's-publicada' : 's-ideia'}`}>
          {idea.status === 'aprovada' ? 'Aprovada' : idea.status === 'publicada' ? 'Publicada' : 'Ideia'}
        </span>
      </div>
      <div className="fb">
        <span className="when"><Icon name="cal" />{when}</span>
        <div className="by" style={{ margin: 0 }}>atualizado por {idea.updated_by || 'Esdras'}</div>
      </div>
    </div>
  )
}

function nextEsdras(ideas: Idea[]): string {
  const today = todayISO()
  const stamps = ideas
    .filter((idea) => (idea.updated_by || '').toLowerCase().includes('esdras') && idea.updated_at)
    .map((idea) => idea.updated_at!.slice(0, 10))
    .sort()
  const last = stamps[stamps.length - 1]
  let next = today
  for (let i = 0; i < 8; i += 1) {
    const day = addDays(today, i)
    const weekday = isoWeekday(day)
    if (weekday === 1 || weekday === 4) {
      if (day >= today) { next = day; break }
    }
  }
  const lastText = last ? `${weekdayShort(last)} ${Number(last.slice(8, 10))}/${Number(last.slice(5, 7))}` : 'ainda sem atualização'
  return `Última atualização: ${lastText} · Próxima: ${weekdayShort(next)} ${Number(next.slice(8, 10))}/${Number(next.slice(5, 7))}`
}
