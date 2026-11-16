import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountChip, FormatChip, StatusBadge } from '@/components/Bits'
import { AjusteDialog, authorFromEmail } from '@/components/AjusteDialog'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, asDate, dayNumber, longDate, startOfWeek, weekdayShort, weekTitle } from '@/lib/dates'
import { todayISO } from '@/lib/dates'
import { matchesAccount, resumoDoDia, taskBadge } from '@/lib/logic'
import type { Idea, Post, Task } from '@/lib/types'
import { uid } from '@/lib/utils'

type Order = 'prioridade' | 'az'

export function Tarefas() {
  const data = useData()
  const ui = useUi()
  const navigate = useNavigate()
  const { email } = useAuth()
  const today = todayISO()
  const [order, setOrder] = useState<Order>('prioridade')
  const [ajuste, setAjuste] = useState<{ postId?: string; ideaId?: string } | null>(null)
  const posts = data.bundle.posts.filter((post) => matchesAccount(post.account, ui.filter))
  const ideas = data.bundle.ideas.filter((idea) => matchesAccount(idea.account, ui.filter))
  const tasks = data.bundle.tasks.filter((task) => matchesAccount(task.account, ui.filter))
  const summary = resumoDoDia(tasks, posts, today)
  const openToday = tasks.filter((task) => asDate(task.due_date) === today && !task.done).sort(bySort)
  const waitingPosts = posts.filter((post) => post.status === 'arte_pronta')
  const waitingIdeas = ideas.filter((idea) => idea.status === 'ideia')
  const weeks = [0, 1, 2, 3, 4].map((index) => addDays(startOfWeek(today), index * 7))

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

  async function approvePost(post: Post) {
    await data.savePost({ ...post, status: 'aprovado' })
    ui.toast('Aprovado. A tarefa de Stories entra na conta Escola.')
  }

  async function approveIdea(idea: Idea) {
    await data.setIdeaStatus(idea.id, 'aprovada')
    ui.toast('Ideia aprovada.')
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
      <section className="card secbox queue">
        <div className="bh">
          <h2><Icon name="flag" /> Esperando você</h2>
          <span className="pill">{waitingPosts.length + waitingIdeas.length}</span>
        </div>
        {waitingPosts.length + waitingIdeas.length === 0 && <div className="empty">Nada esperando a sua aprovação.</div>}
        {waitingPosts.map((post) => (
          <div className="queue-item" key={post.id}>
            <div className="tx">
              <div className="ih"><AccountChip account={post.account} /><FormatChip format={post.format} /><StatusBadge status={post.status} /></div>
              <h3>{post.title}</h3>
              <CommentPeek comments={commentsFor(data.bundle.comments, post.id, null)} />
            </div>
            <div className="top-actions">
              <button type="button" className="btn pri" onClick={() => void approvePost(post)}>Aprovar</button>
              <button type="button" className="btn" onClick={() => setAjuste({ postId: post.id })}>Pedir ajuste</button>
            </div>
          </div>
        ))}
        {waitingIdeas.map((idea) => (
          <div className="queue-item" key={idea.id}>
            <div className="tx">
              <div className="ih"><AccountChip account={idea.account} /><span className="chip c-gray">Ideia</span></div>
              <h3>{idea.title}</h3>
              <CommentPeek comments={commentsFor(data.bundle.comments, null, idea.id)} />
            </div>
            <div className="top-actions">
              <button type="button" className="btn pri" onClick={() => void approveIdea(idea)}>Aprovar</button>
              <button type="button" className="btn" onClick={() => setAjuste({ ideaId: idea.id })}>Pedir ajuste</button>
            </div>
          </div>
        ))}
      </section>
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
          <h2><Icon name="sun" /> Hoje · {dayLabel(today)}</h2>
          <span className="pill">{openToday.length} {openToday.length === 1 ? 'tarefa' : 'tarefas'}</span>
        </div>
        <div className="hgrid">
          {openToday.map((task) => <TaskCard key={task.id} task={task} />)}
          {openToday.length === 0 && <div className="tc ghost"><div className="tt">Nada pendente hoje.</div></div>}
        </div>
      </div>
      <div className="order-row">
        <div className="eyebrow" style={{ margin: 0 }}>Próximas semanas</div>
        <div className="filt" aria-label="Ordem dos dias">
          <button type="button" className={order === 'prioridade' ? 'on' : ''} onClick={() => setOrder('prioridade')}>Prioridade</button>
          <button type="button" className={order === 'az' ? 'on' : ''} onClick={() => setOrder('az')}>A–Z</button>
        </div>
      </div>
      {weeks.map((monday) => {
        const days = [0, 1, 2, 3, 4, 5, 6].map((index) => addDays(monday, index))
        return (
          <section className="card secbox week-block" key={monday}>
            <h2>{weekTitle(monday)}</h2>
            <div className="scrollx">
              <div className="days">
                {days.map((date) => (
                  <DayColumn
                    key={date}
                    date={date}
                    order={order}
                    tasks={tasks.filter((task) => asDate(task.due_date) === date)}
                    posts={posts.filter((post) => asDate(post.scheduled_date) === date)}
                  />
                ))}
              </div>
            </div>
          </section>
        )
      })}
      <AjusteDialog
        open={ajuste !== null}
        onClose={() => setAjuste(null)}
        onSave={async (body) => {
          await data.saveComment({
            id: uid(),
            post_id: ajuste?.postId || null,
            idea_id: ajuste?.ideaId || null,
            body,
            author: authorFromEmail(email),
            kind: 'ajuste',
          })
          ui.toast('Ajuste registrado.')
        }}
      />
    </>
  )
}

function commentsFor(comments: { post_id: string | null; idea_id: string | null; body: string; created_at?: string | null }[] | undefined, postId: string | null, ideaId: string | null) {
  return (comments || [])
    .filter((comment) => (postId && comment.post_id === postId) || (ideaId && comment.idea_id === ideaId))
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
}

function CommentPeek({ comments }: { comments: { body: string }[] }) {
  const last = comments[comments.length - 1]
  if (!last) return null
  return <p className="src">{comments.length} recado(s). Último: {last.body}</p>
}

function dayLabel(date: string): string {
  const name = weekdayShort(date)
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${dayNumber(date)}`
}

function bySort(a: Task, b: Task) {
  return a.sort - b.sort || a.title.localeCompare(b.title, 'pt')
}

function byTitle(a: Task, b: Task) {
  return a.title.localeCompare(b.title, 'pt') || a.sort - b.sort
}

function moveItem(list: Task[], from: number, to: number): Task[] {
  const next = list.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function DayColumn({ date, tasks, posts, order }: { date: string; tasks: Task[]; posts: Post[]; order: Order }) {
  const data = useData()
  const ui = useUi()
  const weekend = weekdayShort(date) === 'sáb' || weekdayShort(date) === 'dom'
  const signature = tasks.map((task) => `${task.id}:${task.sort}:${task.done}`).join('|')
  const base = [...tasks].sort(order === 'az' ? byTitle : bySort)
  const [live, setLive] = useState<Task[] | null>(null)
  const liveRef = useRef<Task[] | null>(null)
  useEffect(() => {
    liveRef.current = null
    setLive(null)
  }, [signature, order])
  const list = live || base

  async function commit(next: Task[]) {
    const changed = next.flatMap((task, index) => {
      const sort = (index + 1) * 10
      return task.sort === sort ? [] : [{ ...task, sort }]
    })
    if (changed.length) await data.saveTasks(changed)
  }

  function begin(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (order !== 'prioridade' || list.length < 2) return
    event.preventDefault()
    event.stopPropagation()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const startY = event.clientY
    const start = list.slice()
    let last = index
    function move(ev: PointerEvent) {
      const next = Math.max(0, Math.min(start.length - 1, index + Math.round((ev.clientY - startY) / 72)))
      if (next === last) return
      last = next
      const ordered = moveItem(start, index, next)
      liveRef.current = ordered
      setLive(ordered)
    }
    function finish() {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', finish)
      handle.removeEventListener('pointercancel', finish)
      const finalList = liveRef.current
      if (finalList && finalList.some((task, item) => task.id !== start[item]?.id)) void commit(finalList)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', finish)
    handle.addEventListener('pointercancel', finish)
  }

  return (
    <div className={`dcol ${weekend ? 'weekend' : ''}`}>
      <div className="dh2"><span>{dayLabel(date).split(' ')[0]}</span><b>{dayNumber(date)}</b></div>
      <div className="list">
        {list.map((task, index) => <TaskCard key={task.id} task={task} drag={order === 'prioridade' ? (event) => begin(event, index) : undefined} />)}
        {weekend && list.length === 0 && posts.length === 0 && <div className="tc ghost"><div className="tt">Folga</div></div>}
        {posts.map((post) => (
          <button type="button" key={post.id} className={`tc day-post ${post.account === 'missao' ? 'mi' : ''}`} onClick={() => ui.openPost(post)}>
            <div className="tt">{post.title}</div>
            <div className="who">
              <AccountChip account={post.account} />
              <FormatChip format={post.format} />
              <StatusBadge status={post.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function TaskCard({ task, drag }: { task: Task; drag?: (event: React.PointerEvent<HTMLButtonElement>) => void }) {
  const data = useData()
  const ui = useUi()
  const badge = taskBadge(task, data.bundle.posts)
  return (
    <div className={`tc ${task.done ? 'done' : ''} ${task.rolled_from ? 'roll' : ''}`}>
      <div className="tt">
        {drag && <button type="button" className="grip" aria-label="Arrastar para mudar a prioridade" onPointerDown={drag}><Icon name="grip" size={14} /></button>}
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
        {task.note && <span>{task.note}</span>}
        {badge && <span className="ared" style={{ padding: '2px 6px', fontSize: 9.5 }}>{badge}</span>}
      </div>
    </div>
  )
}
