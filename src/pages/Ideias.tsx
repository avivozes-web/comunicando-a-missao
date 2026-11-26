import { useMemo, useState } from 'react'
import { AccountChip, EditButton, FormatChip } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, isoWeekday, todayISO, weekdayShort } from '@/lib/dates'
import { matchesAccount } from '@/lib/logic'
import { IDEA_COURSES, IDEA_FORMATS, IDEA_STAGES, type Idea, type IdeaCourse, type IdeaFormat, type IdeaStatus } from '@/lib/types'

type FormatFilter = 'todos' | IdeaFormat
type CourseFilter = 'todos' | IdeaCourse

export function Ideias() {
  const data = useData()
  const ui = useUi()
  const [format, setFormat] = useState<FormatFilter>('todos')
  const [course, setCourse] = useState<CourseFilter>('todos')
  const [mobileStage, setMobileStage] = useState<IdeaStatus>('ideia')

  const ideas = data.bundle.ideas.filter((idea) => {
    if (idea.archived) return false
    if (!matchesAccount(idea.account, ui.filter)) return false
    if (format !== 'todos' && idea.format !== format) return false
    if (ui.filter === 'escola' && course !== 'todos' && idea.course !== course) return false
    return true
  })

  const byStage = useMemo(() => {
    const map = Object.fromEntries(IDEA_STAGES.map((stage) => [stage.id, [] as Idea[]])) as Record<IdeaStatus, Idea[]>
    for (const idea of ideas) {
      if (map[idea.status]) map[idea.status].push(idea)
    }
    return map
  }, [ideas])

  const cadence = useMemo(() => nextEsdras(data.bundle.ideas), [data.bundle.ideas])
  const showCourse = ui.filter === 'escola'

  return (
    <div className="factory">
      <div className="top">
        <div>
          <div className="eyebrow">Criação</div>
          <h1>Fábrica de Conteúdo</h1>
          <div className="sub">Da ideia ao post, cada cartão fica na etapa em que está.</div>
          <div className="cadence">
            <span className="av" style={{ background: '#5B6CF0', width: 18, height: 18, fontSize: 8 }}>E</span>
            <div>
              <div className="when">{cadence}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn pri" onClick={() => ui.openIdea(null)}><Icon name="plus" /> Nova ideia</button>
        </div>
      </div>

      <div className="factory-summary" aria-live="polite">{buildSummary(byStage)}</div>

      <div className="factory-filters">
        <div className="filt-label">Formato</div>
        <div className="seg2 factory-seg">
          <button type="button" className={format === 'todos' ? 'on' : ''} onClick={() => setFormat('todos')}>Todos</button>
          {IDEA_FORMATS.map((item) => (
            <button type="button" key={item.id} className={format === item.id ? 'on' : ''} onClick={() => setFormat(item.id)}>{item.label}</button>
          ))}
        </div>
        {showCourse && (
          <>
            <div className="filt-label">Curso</div>
            <div className="seg2 factory-seg factory-seg-wrap">
              <button type="button" className={course === 'todos' ? 'on' : ''} onClick={() => setCourse('todos')}>Todos</button>
              {IDEA_COURSES.map((item) => (
                <button type="button" key={item.id} className={course === item.id ? 'on' : ''} onClick={() => setCourse(item.id)}>{item.label}</button>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="factory-filter-hint">A conta é escolhida no topo, em Conta: Todas, Escola (MJ Educação) ou Missão (Missão Josué).</p>

      <div className="factory-tabs only-mobile" role="tablist" aria-label="Etapa">
        {IDEA_STAGES.map((stage) => (
          <button
            type="button"
            key={stage.id}
            role="tab"
            aria-selected={mobileStage === stage.id}
            className={`factory-tab ${mobileStage === stage.id ? 'on' : ''}`}
            onClick={() => setMobileStage(stage.id)}
          >
            <span className={`st ${stage.cls}`}>{stage.label}</span>
            <span className="n">{byStage[stage.id].length}</span>
          </button>
        ))}
      </div>

      <div className="factory-board">
        {IDEA_STAGES.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            ideas={byStage[stage.id]}
            hiddenOnMobile={mobileStage !== stage.id}
          />
        ))}
      </div>
    </div>
  )
}

function Column({
  stage,
  ideas,
  hiddenOnMobile,
}: {
  stage: (typeof IDEA_STAGES)[number]
  ideas: Idea[]
  hiddenOnMobile: boolean
}) {
  return (
    <div className={`col factory-col factory-col-${stage.id}${hiddenOnMobile ? ' hide-mobile' : ''}`}>
      <div className="ch">
        <h3><span className={`st ${stage.cls}`}>{stage.label}</span></h3>
        <span className="n">{ideas.length}</span>
      </div>
      <div className="list">
        {ideas.length === 0 && <div className="empty">Nenhum cartão nesta etapa.</div>}
        {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
      </div>
    </div>
  )
}

function IdeaCard({ idea }: { idea: Idea }) {
  const data = useData()
  const ui = useUi()
  const stage = IDEA_STAGES.find((item) => item.id === idea.status)
  const next = nextStage(idea)
  const when = !idea.suggested_date
    ? 'Sem data'
    : formatDate(idea.suggested_date)
  const nextLabel = next ? IDEA_STAGES.find((item) => item.id === next)?.label : null

  async function advance() {
    if (!next) return
    await data.setIdeaStatus(idea.id, next)
    ui.toast(`Passou para ${nextLabel}.`)
  }

  async function launch() {
    if (idea.post_id) {
      ui.toast('Este conteúdo já está na semana.')
      return
    }
    if (!idea.suggested_date) {
      ui.openIdea(idea)
      ui.toast('Coloque a data de postar e clique em Lançar na semana.')
      return
    }
    await data.launchIdea(idea, idea.suggested_date)
    ui.toast('Lançado na semana.')
  }

  return (
    <div className={`card ic factory-card factory-card-${idea.status}`}>
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
        {idea.course && <span className="chip c-gray">{idea.course}</span>}
        {!idea.course && idea.tags.map((tag) => <span key={tag} className="chip c-gray">{tag}</span>)}
        {stage && <span className={`st ${stage.cls}`}>{stage.label}</span>}
      </div>
      <div className="fb">
        <span className="when"><Icon name="cal" />{when}</span>
        {idea.record_date && <span className="when">Gravar {formatDate(idea.record_date)}</span>}
        {idea.edit_date && <span className="when">Editar {formatDate(idea.edit_date)}</span>}
        {idea.updated_by && <div className="by" style={{ margin: 0 }}>{idea.updated_by}</div>}
      </div>
      <div className="factory-actions">
        {idea.script_url && (
          <a className="btn" href={idea.script_url} target="_blank" rel="noopener noreferrer">
            <Icon name="external" /> Ver roteiro
          </a>
        )}
        {!idea.post_id && (
          <button type="button" className="btn" onClick={() => void launch()}>
            Lançar na semana
          </button>
        )}
        {next && (
          <button type="button" className="btn pri factory-advance" onClick={() => void advance()}>
            Avançar para {nextLabel}
            <Icon name="chevron" />
          </button>
        )}
      </div>
    </div>
  )
}

function nextStage(idea: Idea): IdeaStatus | null {
  const reels: IdeaStatus[] = ['ideia', 'aprovada', 'roteiro_pronto', 'em_producao', 'pronto_postar', 'postado']
  const carousel: IdeaStatus[] = ['ideia', 'aprovada', 'em_producao', 'pronto_postar', 'postado']
  const order = idea.format === 'carrossel' ? carousel : reels
  const index = order.indexOf(idea.status)
  if (index >= 0) return order[index + 1] || null
  const fallback = reels.indexOf(idea.status)
  return fallback >= 0 ? reels[fallback + 1] || null : null
}

function formatDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

function buildSummary(byStage: Record<IdeaStatus, Idea[]>): string {
  const bits: [IdeaStatus, string, string][] = [
    ['pronto_postar', 'pronto para postar', 'prontos para postar'],
    ['roteiro_pronto', 'com roteiro pronto', 'com roteiro pronto'],
    ['em_producao', 'em produção', 'em produção'],
    ['aprovada', 'aprovada', 'aprovadas'],
    ['ideia', 'ideia', 'ideias'],
    ['postado', 'postado', 'postados'],
  ]
  const parts = bits
    .map(([id, one, many]) => {
      const count = byStage[id]?.length || 0
      if (!count) return null
      return `${count} ${count === 1 ? one : many}`
    })
    .filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Nenhum cartão nesta seleção.'
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
    if ((weekday === 1 || weekday === 4) && day >= today) {
      next = day
      break
    }
  }
  const lastText = last ? `${weekdayShort(last)} ${Number(last.slice(8, 10))}/${Number(last.slice(5, 7))}` : 'ainda sem atualização'
  return `Última atualização do Esdras: ${lastText} · Próxima: ${weekdayShort(next)} ${Number(next.slice(8, 10))}/${Number(next.slice(5, 7))}`
}
