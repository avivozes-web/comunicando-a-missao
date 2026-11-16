import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountChip } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, asDate, dayNumber, isoWeekday, longDate, startOfWeek, weekdayShort, weekLabel } from '@/lib/dates'
import { todayISO } from '@/lib/dates'
import { matchesAccount, resumoDoDia, taskBadge } from '@/lib/logic'
import type { Post, Task } from '@/lib/types'

export function Tarefas() {
  const data = useData()
  const ui = useUi()
  const navigate = useNavigate()
  const today = todayISO()
  const [offset, setOffset] = useState(0)
  const monday = addDays(startOfWeek(today), offset * 7)
  const days = [0, 1, 2, 3, 4, 5, 6].map((index) => addDays(monday, index))
  const posts = data.bundle.posts.filter((post) => matchesAccount(post.account, ui.filter))
  const tasks = data.bundle.tasks.filter((task) => matchesAccount(task.account, ui.filter))
  const summary = resumoDoDia(tasks, posts, today)
  const todayTasks = tasks.filter((task) => asDate(task.due_date) === today).sort(bySort)
  const weekName = offset === 0 ? 'Esta semana' : offset === 1 ? 'Semana que vem' : 'Semana'
  const ghost = todayTasks.length > 0 && todayTasks.length < 3 && isoWeekday(today) === 3
  const head = todayTasks.filter((task) => task.sort < 60)
  const tail = todayTasks.filter((task) => task.sort >= 60)

  async function gravado(post?: Post) {
    const target = post || posts
      .filter((item) => (item.format === 'reel' || item.format === 'video') && (item.status === 'ideia' || item.status === 'roteiro'))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0]
    if (!target) {
      ui.toast('Não há vídeo esperando gravação.')
      return
    }
    await data.savePost({ ...target, status: 'gravado' })
    ui.toast('Marcado: gravado, falta editar.')
  }

  return (
    <>
      <div className="only-desktop">
        <div className="hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="eyebrow">{longDate(today)}</div>
            <h1>Olá, Isabelle</h1>
            <div className="sub">O que precisa sair hoje e amanhã, nas duas contas.</div>
            <div className="resumo-k">Resumo do dia</div>
            <div className="resumo">{summary}</div>
            <div className="ico-row">
              <span className="ico-c navy"><Icon name="book" /></span>
              <span className="ico-c navy"><Icon name="cap" /></span>
              <span className="ico-c navy"><Icon name="globe" /></span>
              <span className="ico-c navy"><Icon name="compass" /></span>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn-rec" onClick={() => void gravado()}><Icon name="reel" /> Gravado, falta editar</button>
            <button type="button" className="btn" onClick={() => navigate('/semana')}><Icon name="calx" /> Ver semana</button>
            <button type="button" className="btn pri" onClick={() => ui.openPost(null)}><Icon name="plus" /> Novo conteúdo</button>
          </div>
        </div>
      </div>
      <div className="only-mobile">
        <div className="resumo-k">Resumo do dia</div>
        <div className="resumo mobile-resumo">{summary}</div>
      </div>
      <div className="top">
        <div>
          <div className="eyebrow">Rotina da equipe</div>
          <h1>Tarefas</h1>
          <div className="sub">O que se repete toda semana, o que aparece no dia e o que cada post gera até a data de sair.</div>
        </div>
        <div className="top-actions">
          <button type="button" className="btn" onClick={() => ui.setAudio(true)}><Icon name="mic" /> Ditar o dia por áudio</button>
          <button type="button" className="btn pri" onClick={() => ui.openTask(null, today)}><Icon name="plus" /> Tarefa</button>
        </div>
      </div>
      <div className="hojebox">
        <div className="ht">
          <h2><Icon name="sun" /> Hoje · {weekdayShort(today)} {dayNumber(today)}/{Number(today.slice(5, 7))}</h2>
          <span className="pill">{ghost ? `${todayTasks.length + 1} tarefas · a quarta fica a definir` : `${todayTasks.length} ${todayTasks.length === 1 ? 'tarefa' : 'tarefas'}`}</span>
        </div>
        <div className="hgrid">
          {head.map((task) => <TaskCard key={task.id} task={task} />)}
          {ghost && <Ghost onClick={() => ui.openTask(null, today)} />}
          {tail.map((task) => <TaskCard key={task.id} task={task} />)}
          {todayTasks.length === 0 && <div className="tc ghost"><div className="tt">Nada em aberto hoje.</div></div>}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, margin: '0 0 8px', flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 2 }}>{weekName}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{weekLabel(days[0])}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => setOffset(offset - 1)} aria-label="Semana anterior"><Icon name="chevronL" /></button>
          <button type="button" className="btn" onClick={() => setOffset(0)}>Esta semana</button>
          <button type="button" className="btn" onClick={() => setOffset(1)}>Semana que vem</button>
          <button type="button" className="btn" onClick={() => setOffset(offset + 1)} aria-label="Semana seguinte"><Icon name="chevron" /></button>
        </div>
      </div>
      <div className="scrollx">
        <div className="days">
          {days.map((date) => {
            const list = tasks.filter((task) => asDate(task.due_date) === date).sort(bySort)
            const showGhost = (isoWeekday(date) === 3 || isoWeekday(date) === 4) && list.some((task) => task.sort < 60)
            const fixed = list.filter((task) => task.sort < 60)
            const rest = list.filter((task) => task.sort >= 60)
            const weekend = isoWeekday(date) >= 6
            return (
              <div className={`dcol ${weekend ? 'weekend' : ''}`} key={date}>
                <div className="dh2"><b>{dayNumber(date)}</b><span>{weekdayShort(date)}</span></div>
                <div className="list">
                  {fixed.map((task) => <TaskCard key={task.id} task={task} />)}
                  {showGhost && <Ghost onClick={() => ui.openTask(null, date)} />}
                  {rest.map((task) => <TaskCard key={task.id} task={task} />)}
                  {weekend && list.length === 0 && <div className="tc ghost"><div className="tt">Folga</div></div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function bySort(a: Task, b: Task) {
  return a.sort - b.sort || a.title.localeCompare(b.title)
}

function TaskCard({ task }: { task: Task }) {
  const data = useData()
  const ui = useUi()
  const badge = taskBadge(task, data.bundle.posts)
  return (
    <div className={`tc ${task.done ? 'done' : ''} ${task.rolled_from ? 'roll' : ''}`}>
      <div className="tt">
        <button type="button" className="bx" aria-label={task.done ? 'Desmarcar' : 'Concluir'} onClick={() => void data.toggleTask(task.id)}>
          {task.done && <Icon name="check" size={9} />}
        </button>
        <button type="button" className="task-title" onClick={() => ui.openTask(task)}>{task.title}</button>
      </div>
      <div className="who">
        {task.kind === 'fixed' && <Icon name="repeat" />}
        {task.assignee}
        {task.account && <AccountChip account={task.account} />}
        {task.badge === 'eventual' && <span className="badge-ev">eventual</span>}
        {task.rolled_from && <span className="badge-roll">passou de ontem</span>}
        {badge && <span className="ared" style={{ padding: '2px 6px', fontSize: 9.5 }}>{badge}</span>}
      </div>
    </div>
  )
}

function Ghost({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="tc ghost" onClick={onClick}>
      <div className="tt">a definir com a Isabelle</div>
    </button>
  )
}
