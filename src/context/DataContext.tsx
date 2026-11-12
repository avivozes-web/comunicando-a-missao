import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '@/lib/api'
import { addDays, isoWeekday, todayISO } from '@/lib/dates'
import { syncGeneratedTasks } from '@/lib/logic'
import type { Assignees, Bundle, GoalConfig, Idea, Post, Task, YearDate, YearMonth } from '@/lib/types'
import { PREVIEW, uid } from '@/lib/utils'

type DataValue = {
  loading: boolean
  error: string | null
  bundle: Bundle
  savePost: (post: Post, assignees?: Assignees) => Promise<void>
  removePost: (id: string) => Promise<void>
  setCover: (postId: string, file: File) => Promise<string>
  toggleCheck: (postId: string, index: number) => Promise<void>
  saveIdea: (idea: Idea) => Promise<void>
  removeIdea: (id: string) => Promise<void>
  setIdeaStatus: (id: string, status: Idea['status']) => Promise<void>
  toggleHeart: (id: string) => Promise<void>
  saveTask: (task: Task) => Promise<void>
  saveTasks: (tasks: Task[]) => Promise<void>
  toggleTask: (id: string) => Promise<void>
  removeTask: (id: string) => Promise<void>
  saveMonth: (row: YearMonth) => Promise<void>
  saveYearDate: (row: YearDate) => Promise<void>
  removeYearDate: (id: string) => Promise<void>
  saveNarrative: (body: string) => Promise<void>
  saveTraga: (text: string) => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

function maintain(bundle: Bundle, today: string) {
  for (const task of bundle.tasks) {
    if (!task.done && task.due_date < today && (task.kind === 'adhoc' || task.kind === 'generated')) {
      task.rolled_from = task.rolled_from || task.due_date
      task.due_date = today
    }
  }
  const end = addDays(today, 21)
  for (let day = today; day <= end; day = addDays(day, 1)) {
    const weekday = isoWeekday(day)
    for (const fixed of bundle.fixed_tasks) {
      if (!fixed.active || !fixed.weekdays.includes(weekday)) continue
      if (bundle.tasks.some((task) => task.fixed_task_id === fixed.id && task.origin_date === day)) continue
      bundle.tasks.push({
        id: uid(),
        title: fixed.title,
        assignee: fixed.assignee,
        account: fixed.account,
        due_date: day,
        done: false,
        kind: 'fixed',
        rolled_from: null,
        origin_date: day,
        post_id: null,
        fixed_task_id: fixed.id,
        step: null,
        badge: null,
        sort: fixed.sort,
      })
    }
  }
}

async function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [bundle, setBundle] = useState<Bundle>(api.emptyBundle())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function run() {
      try {
        const next = PREVIEW ? await loadPreview() : await api.loadBundle()
        if (alive) {
          setBundle(next)
          setError(null)
        }
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void run()
    return () => {
      alive = false
    }
  }, [])

  function commit(next: Bundle) {
    setBundle({ ...next })
  }

  async function reload() {
    const next = await api.loadBundle()
    setBundle(next)
  }

  async function run(work: (current: Bundle) => Promise<Bundle | void> | Bundle | void) {
    setError(null)
    try {
      if (PREVIEW) {
        const next = structuredClone(bundle)
        const result = await work(next)
        commit(result || next)
      } else {
        await work(bundle)
        await reload()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar.'
      setError(message)
      throw err
    }
  }

  const value: DataValue = {
    loading,
    error,
    bundle,
    savePost: (post, assignees) => run(async (current) => {
      if (PREVIEW) {
        const exists = current.posts.some((item) => item.id === post.id)
        current.posts = exists ? current.posts.map((item) => (item.id === post.id ? post : item)) : [...current.posts, post]
        current.tasks = syncGeneratedTasks(current.tasks, post, assignees)
        return current
      }
      await api.savePost(post, assignees)
    }),
    removePost: (id) => run(async (current) => {
      if (PREVIEW) {
        current.posts = current.posts.filter((post) => post.id !== id)
        current.tasks = current.tasks.filter((task) => task.post_id !== id)
        return current
      }
      await api.removePost(id)
    }),
    setCover: async (postId, file) => {
      setError(null)
      try {
        if (PREVIEW) {
          const url = await readFile(file)
          setBundle((current) => ({
            ...current,
            posts: current.posts.map((post) => (post.id === postId ? { ...post, cover_url: url } : post)),
          }))
          return url
        }
        const url = await api.uploadCover(postId, file)
        setBundle(await api.loadBundle())
        return url
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Não foi possível salvar a capa.'
        setError(message)
        throw err
      }
    },
    toggleCheck: (postId, index) => run(async (current) => {
      const post = current.posts.find((item) => item.id === postId)
      if (!post) return current
      const checklist = post.checklist.map((item, itemIndex) => itemIndex === index ? { ...item, done: !item.done } : item)
      const next = { ...post, checklist }
      if (PREVIEW) {
        current.posts = current.posts.map((item) => (item.id === postId ? next : item))
        return current
      }
      await api.savePost(next)
    }),
    saveIdea: (idea) => run(async (current) => {
      const next = { ...idea, updated_at: new Date().toISOString() }
      if (PREVIEW) {
        const exists = current.ideas.some((item) => item.id === idea.id)
        current.ideas = exists ? current.ideas.map((item) => (item.id === idea.id ? next : item)) : [next, ...current.ideas]
        return current
      }
      await api.saveIdea(next)
    }),
    removeIdea: (id) => run(async (current) => {
      if (PREVIEW) {
        current.ideas = current.ideas.filter((idea) => idea.id !== id)
        return current
      }
      await api.removeIdea(id)
    }),
    setIdeaStatus: (id, status) => run(async (current) => {
      if (status === 'rejeitada') {
        if (PREVIEW) {
          current.ideas = current.ideas.filter((idea) => idea.id !== id)
          return current
        }
        await api.removeIdea(id)
        return
      }
      const idea = current.ideas.find((item) => item.id === id)
      if (!idea) return current
      const next = { ...idea, status, updated_at: new Date().toISOString() }
      if (PREVIEW) {
        current.ideas = current.ideas.map((item) => (item.id === id ? next : item))
        return current
      }
      await api.saveIdea(next)
    }),
    toggleHeart: (id) => run(async (current) => {
      const idea = current.ideas.find((item) => item.id === id)
      if (!idea) return current
      const next = { ...idea, heart: !idea.heart }
      if (PREVIEW) {
        current.ideas = current.ideas.map((item) => (item.id === id ? next : item))
        return current
      }
      await api.saveIdea(next)
    }),
    saveTask: (task) => run(async (current) => {
      if (PREVIEW) {
        const exists = current.tasks.some((item) => item.id === task.id)
        current.tasks = exists ? current.tasks.map((item) => (item.id === task.id ? task : item)) : [...current.tasks, task]
        return current
      }
      await api.saveTask(task)
    }),
    saveTasks: (tasks) => run(async (current) => {
      if (PREVIEW) {
        for (const task of tasks) {
          const exists = current.tasks.some((item) => item.id === task.id)
          current.tasks = exists ? current.tasks.map((item) => (item.id === task.id ? task : item)) : [...current.tasks, task]
        }
        return current
      }
      for (const task of tasks) await api.saveTask(task)
    }),
    toggleTask: (id) => run(async (current) => {
      const task = current.tasks.find((item) => item.id === id)
      if (!task) return current
      const next = { ...task, done: !task.done }
      if (PREVIEW) {
        current.tasks = current.tasks.map((item) => (item.id === id ? next : item))
        return current
      }
      await api.saveTask(next)
    }),
    removeTask: (id) => run(async (current) => {
      if (PREVIEW) {
        current.tasks = current.tasks.filter((task) => task.id !== id)
        return current
      }
      await api.removeTask(id)
    }),
    saveMonth: (row) => run(async (current) => {
      if (PREVIEW) {
        const exists = current.year_months.some((item) => item.year === row.year && item.month === row.month)
        current.year_months = exists
          ? current.year_months.map((item) => (item.year === row.year && item.month === row.month ? row : item))
          : [...current.year_months, row]
        return current
      }
      await api.saveMonth(row)
    }),
    saveYearDate: (row) => run(async (current) => {
      if (PREVIEW) {
        const exists = current.year_dates.some((item) => item.id === row.id)
        current.year_dates = exists
          ? current.year_dates.map((item) => (item.id === row.id ? row : item))
          : [...current.year_dates, row]
        return current
      }
      await api.saveYearDate(row)
    }),
    removeYearDate: (id) => run(async (current) => {
      if (PREVIEW) {
        current.year_dates = current.year_dates.filter((item) => item.id !== id)
        return current
      }
      await api.removeYearDate(id)
    }),
    saveNarrative: (body) => run(async (current) => {
      const narrative = { body, updated_by: 'Isabelle' }
      if (PREVIEW) {
        current.narrative = narrative
        return current
      }
      await api.saveNarrative(narrative)
    }),
    saveTraga: (text) => run(async (current) => {
      if (!current.goal_config) return current
      const notes: GoalConfig['notes'] = { ...current.goal_config.notes, traga1: text }
      if (PREVIEW) {
        current.goal_config = { ...current.goal_config, notes }
        return current
      }
      await api.saveGoalNotes(current.goal_config.account, notes)
    }),
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

async function loadPreview(): Promise<Bundle> {
  const response = await fetch(`${import.meta.env.BASE_URL}preview-data.json`)
  if (!response.ok) throw new Error('Pré-visualização sem dados.')
  const bundle = (await response.json()) as Bundle
  maintain(bundle, todayISO())
  return bundle
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('Dados ausentes')
  return value
}
