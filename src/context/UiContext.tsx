import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Filter, Idea, Post, Task } from '@/lib/types'

type UiValue = {
  filter: Filter
  setFilter: (filter: Filter) => void
  post: Post | 'new' | null
  postDate: string | null
  openPost: (post?: Post | null, date?: string | null) => void
  closePost: () => void
  idea: Idea | 'new' | null
  openIdea: (idea?: Idea | null) => void
  closeIdea: () => void
  task: Task | 'new' | null
  taskDate: string | null
  openTask: (task?: Task | null, date?: string | null) => void
  closeTask: () => void
  audio: boolean
  setAudio: (open: boolean) => void
  more: boolean
  setMore: (open: boolean) => void
  notice: string | null
  toast: (message: string) => void
}

const UiContext = createContext<UiValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<Filter>('todas')
  const [post, setPost] = useState<Post | 'new' | null>(null)
  const [postDate, setPostDate] = useState<string | null>(null)
  const [idea, setIdea] = useState<Idea | 'new' | null>(null)
  const [task, setTask] = useState<Task | 'new' | null>(null)
  const [taskDate, setTaskDate] = useState<string | null>(null)
  const [audio, setAudio] = useState(false)
  const [more, setMore] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function toast(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 3200)
  }

  const value: UiValue = {
    filter,
    setFilter,
    post,
    postDate,
    openPost: (next = null, date = null) => {
      setPost(next ?? 'new')
      setPostDate(date)
    },
    closePost: () => setPost(null),
    idea,
    openIdea: (next = null) => setIdea(next ?? 'new'),
    closeIdea: () => setIdea(null),
    task,
    taskDate,
    openTask: (next = null, date = null) => {
      setTask(next ?? 'new')
      setTaskDate(date)
    },
    closeTask: () => setTask(null),
    audio,
    setAudio,
    more,
    setMore,
    notice,
    toast,
  }

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const value = useContext(UiContext)
  if (!value) throw new Error('UI ausente')
  return value
}
