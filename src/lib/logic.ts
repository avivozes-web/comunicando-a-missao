import { addDays, daysBetween, dm, isoWeekday, weekdayShort } from './dates'
import type { Account, Assignees, CheckItem, Filter, Post, PostStatus, Task, TaskStep } from './types'
import { DEFAULT_ASSIGNEES } from './types'

const RANK: PostStatus[] = ['ideia', 'roteiro', 'gravado', 'editado', 'arte_pronta', 'aprovado', 'postado']

const STEP_NEED: Record<TaskStep, PostStatus> = {
  gravar: 'gravado',
  editar: 'editado',
  aprovar: 'aprovado',
  postar: 'postado',
}

const STEP_OFFSET: Record<TaskStep, number> = { gravar: -3, editar: -2, aprovar: -1, postar: 0 }

const STEP_PREFIX: Record<TaskStep, string> = {
  gravar: 'Gravar ',
  editar: 'Editar ',
  aprovar: 'Aprovar a capa e a legenda do ',
  postar: 'Postar ',
}

export function reaches(status: PostStatus, need: PostStatus): boolean {
  return RANK.indexOf(status) >= RANK.indexOf(need)
}

export function isPlaceholder(title: string): boolean {
  return /a definir|tema a definir|nenhum marcado|sem tema/i.test(title)
}

export function showTask(task: Task): boolean {
  return !(task.kind === 'generated' && task.done)
}

export function matchesAccount(account: Account | null | undefined, filter: Filter): boolean {
  if (filter === 'todas' || !account) return true
  return account === filter
}

export function timeLabel(value: string | null): string | null {
  if (!value) return null
  const [h, m] = value.slice(0, 5).split(':')
  return `${h}h${m}`
}

export type AlertInfo = { when: string; miss: string; line: string }

export function postAlert(post: Post, today: string): AlertInfo | null {
  if (post.status === 'postado') return null
  const days = daysBetween(today, post.scheduled_date)
  if (days < 0 || days > 7) return null
  const noCover = !post.cover_url
  const noLeg = !post.legenda?.trim()
  if (!noCover && !noLeg) return null
  const when = days === 0 ? 'É hoje' : days === 1 ? 'Falta 1 dia' : `Faltam ${days} dias`
  const miss = noCover && noLeg ? 'sem capa/legenda' : noCover ? 'sem capa' : 'sem legenda'
  return { when, miss, line: `${when} · ${miss}` }
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] || ''
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
}

export function resumoDoDia(tasks: Task[], posts: Post[], today: string): string {
  const open = tasks.filter((task) => task.due_date === today && !task.done && showTask(task))
  const pending = posts.filter(
    (post) => post.scheduled_date === today && post.status !== 'postado' && !isPlaceholder(post.title),
  )
  if (open.length === 0 && pending.length === 0) {
    const any = tasks.some((task) => task.due_date === today) || posts.some((post) => post.scheduled_date === today)
    return any ? 'Hoje: a rotina de hoje está em dia.' : 'Hoje: nada programado.'
  }
  const gravar = open.filter((task) => /^gravar\b/i.test(task.title))
  const aprovar = open.filter((task) => /^aprovar\b/i.test(task.title))
  const rest = open.filter((task) => !gravar.includes(task) && !aprovar.includes(task))
  const bits: string[] = []
  if (gravar.length === 1) bits.push(lower(gravar[0].title))
  else if (gravar.length > 1) bits.push(`gravar ${gravar.length} vídeos`)
  if (aprovar.length === 1) bits.push(lower(aprovar[0].title))
  else if (aprovar.length > 1) bits.push(`aprovar ${aprovar.length} legendas`)
  for (const task of rest) bits.push(lower(task.title))
  for (const post of pending) bits.push(`publicar ${post.title}`)
  return `Hoje: ${joinPt(bits)}.`
}

export function syncGeneratedTasks(tasks: Task[], post: Post, assignees: Assignees = DEFAULT_ASSIGNEES): Task[] {
  const others = tasks.filter((task) => task.post_id !== post.id)
  if (isPlaceholder(post.title)) return tasks
  const existing = new Map(tasks.filter((task) => task.post_id === post.id && task.step).map((task) => [task.step, task]))
  const next: Task[] = []
  ;(Object.keys(STEP_NEED) as TaskStep[]).forEach((step) => {
    const due = addDays(post.scheduled_date, STEP_OFFSET[step])
    const prev = existing.get(step)
    next.push({
      id: prev?.id || crypto.randomUUID(),
      title: STEP_PREFIX[step] + post.title,
      assignee: assignees[step] || prev?.assignee || DEFAULT_ASSIGNEES[step],
      account: post.account,
      due_date: prev?.rolled_from ? prev.due_date : due,
      done: reaches(post.status, STEP_NEED[step]),
      kind: 'generated',
      rolled_from: prev?.rolled_from || null,
      origin_date: due,
      post_id: post.id,
      fixed_task_id: null,
      step,
      badge: prev?.badge || null,
      sort: 80 + ['gravar', 'editar', 'aprovar', 'postar'].indexOf(step),
    })
  })
  return [...others, ...next]
}

export function blankChecklist(): CheckItem[] {
  return []
}

export type Pendencia = {
  date: string
  title: string
  accounts: Account[]
  alert: string | null
  postId: string | null
}

const FORMAT_NAME: Record<string, string> = {
  reel: 'vídeo',
  video: 'vídeo',
  carrossel: 'carrossel',
  stories: 'stories',
  post_leve: 'post leve',
}

export function pendencias(posts: Post[], today: string): Pendencia[] {
  const start = addDays(startMonday(today), 7)
  const end = addDays(start, 4)
  const rows = posts
    .filter((post) => post.scheduled_date >= start && post.scheduled_date <= end && post.status !== 'postado')
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.account.localeCompare(b.account))
  const byDate = new Map<string, Post[]>()
  for (const post of rows) {
    const list = byDate.get(post.scheduled_date) || []
    list.push(post)
    byDate.set(post.scheduled_date, list)
  }
  const out: Pendencia[] = []
  for (const [date, group] of byDate) {
    const vague = group.filter((post) => isPlaceholder(post.title))
    const real = group.filter((post) => !isPlaceholder(post.title))
    if (vague.length > 1 && real.length === 0) {
      const bits = vague.map((post) => `${FORMAT_NAME[post.format] || post.format} da ${post.account === 'escola' ? 'Escola' : 'Missão'}`)
      out.push({
        date,
        title: `Definir o ${joinPt(bits)}`,
        accounts: vague.map((post) => post.account),
        alert: null,
        postId: vague[0].id,
      })
    } else {
      for (const post of vague) {
        const name = FORMAT_NAME[post.format] || post.format
        out.push({
          date,
          title: post.format === 'post_leve' ? 'Escolher o tema do post leve' : `Definir o ${name}`,
          accounts: [post.account],
          alert: null,
          postId: post.id,
        })
      }
    }
    for (const post of real) {
      const alert = postAlert(post, today)
      out.push({
        date,
        title: alert ? `Aprovar a capa e a legenda do ${post.title}` : post.title,
        accounts: [post.account],
        alert: alert?.line || null,
        postId: post.id,
      })
    }
  }
  return out
}

function startMonday(today: string): string {
  return addDays(today, 1 - isoWeekday(today))
}

export function taskBadge(task: Task, posts: Post[]): string | null {
  if (task.badge === 'eventual') return null
  if (task.step !== 'aprovar' || !task.post_id) return null
  const post = posts.find((item) => item.id === task.post_id)
  if (!post || post.scheduled_date === task.due_date) return null
  return dm(post.scheduled_date)
}

export function weekdayName(iso: string): string {
  return weekdayShort(iso)
}
