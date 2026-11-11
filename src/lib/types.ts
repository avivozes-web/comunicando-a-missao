export type Account = 'escola' | 'missao'
export type Filter = 'todas' | Account
export type PostStatus = 'ideia' | 'roteiro' | 'gravado' | 'editado' | 'arte_pronta' | 'aprovado' | 'postado'
export type PostFormat = 'reel' | 'carrossel' | 'stories' | 'post_leve' | 'video'
export type IdeaStatus = 'ideia' | 'aprovada' | 'rejeitada' | 'publicada'
export type TaskKind = 'fixed' | 'adhoc' | 'generated'
export type TaskStep = 'gravar' | 'editar' | 'aprovar' | 'postar'

export type CheckItem = { label: string; done: boolean }

export type Post = {
  id: string
  account: Account
  title: string
  format: PostFormat
  status: PostStatus
  scheduled_date: string
  scheduled_time: string | null
  aspect: string | null
  legenda: string | null
  cover_url: string | null
  drive_url: string | null
  checklist: CheckItem[]
  note: string | null
  date_tag: string | null
  updated_by: string | null
}

export type Idea = {
  id: string
  account: Account
  title: string
  body: string
  format: string
  tags: string[]
  status: IdeaStatus
  suggested_date: string | null
  heart: boolean
  updated_by: string | null
  updated_at?: string | null
}

export type FixedTask = {
  id: string
  title: string
  assignee: string
  weekdays: number[]
  account: Account | null
  sort: number
  active: boolean
}

export type Task = {
  id: string
  title: string
  assignee: string
  account: Account | null
  due_date: string
  done: boolean
  kind: TaskKind
  rolled_from: string | null
  origin_date: string | null
  post_id: string | null
  fixed_task_id: string | null
  step: TaskStep | null
  badge: string | null
  sort: number
}

export type YearMonth = {
  year: number
  month: number
  theme: string | null
  campaign: boolean
}

export type YearDate = {
  id: string
  year: number
  month: number
  label: string
  detail: string | null
  kind: 'data' | 'escola' | 'missao' | 'pausa'
  event_date: string | null
}

export type Narrative = { body: string; updated_by: string | null }

export type Report = {
  id: string
  account: Account
  kind: 'semanal' | 'mensal'
  period_start: string
  period_end: string
  title: string
  subtitle: string | null
  pdf_url: string | null
  payload: Record<string, unknown> | null
}

export type SnapshotRow = {
  account: Account
  snapshot_date: string
  arroba: string
  nome: string
}

export type Follower = {
  account: Account
  arroba: string
  nome: string
  seguidores: number | null
  seguindo: number | null
  posts: number | null
  privado: boolean
  bio: string | null
  nicho: string | null
  ficha_em: string | null
}

export type FollowerEvent = {
  id: string
  account: Account
  event_date: string
  kind: 'entrou' | 'saiu'
  arroba: string | null
  nome: string | null
  note: string | null
}

export type GoalDay = {
  account: Account
  day: string
  total: number | null
  entraram: number | null
  sairam: number | null
  saldo: number | null
  fonte: string | null
  status: string | null
  meta_dia: number | null
  meta_semana: number | null
  acumulada: number | null
  foco: string | null
}

export type RampWeek = [string, string, number, number, string]

export type GoalConfig = {
  account: Account
  alvo: number
  data_alvo: string
  inicio: string
  base: number
  base_data: string
  rampa: RampWeek[]
  checkpoints: { data: string; valor: number }[]
  funil: { etapas?: { k: string; l: string; v: number | null; fonte?: string }[] } | null
  posts_metricas: {
    data?: string
    tipo?: string
    titulo?: string
    url?: string
    curtidas?: number | null
    comentarios?: number | null
    engajamento?: number | null
  }[]
  link_insights: { data?: string; toques?: number | null; periodo?: string; fonte?: string; lido_em?: string }[]
  notes: { traga1?: string }
}

export type LinkTap = {
  account: Account
  day: string
  periodo: string
  toques: number | null
  fonte: string | null
}

export type Bundle = {
  posts: Post[]
  ideas: Idea[]
  fixed_tasks: FixedTask[]
  tasks: Task[]
  year_months: YearMonth[]
  year_dates: YearDate[]
  narrative: Narrative
  reports: Report[]
  snapshots: SnapshotRow[]
  followers: Follower[]
  events: FollowerEvent[]
  goal_days: GoalDay[]
  goal_config: GoalConfig | null
  link_taps: LinkTap[]
}

export type Assignees = Record<TaskStep, string>

export const EMPTY_BUNDLE: Bundle = {
  posts: [],
  ideas: [],
  fixed_tasks: [],
  tasks: [],
  year_months: [],
  year_dates: [],
  narrative: { body: '', updated_by: null },
  reports: [],
  snapshots: [],
  followers: [],
  events: [],
  goal_days: [],
  goal_config: null,
  link_taps: [],
}

export const ACCOUNTS: { id: Account; name: string; handle: string }[] = [
  { id: 'escola', name: 'Escola', handle: '@missaojosue.educacao' },
  { id: 'missao', name: 'Missão', handle: '@missaojosue.ofc' },
]

export const STATUSES: { id: PostStatus; label: string; cls: string }[] = [
  { id: 'ideia', label: 'Ideia', cls: 's-ideia' },
  { id: 'roteiro', label: 'Roteiro', cls: 's-roteiro' },
  { id: 'gravado', label: 'Gravado', cls: 's-gravado' },
  { id: 'editado', label: 'Editado', cls: 's-editado' },
  { id: 'arte_pronta', label: 'Arte pronta', cls: 's-arte' },
  { id: 'aprovado', label: 'Aprovado', cls: 's-aprovado' },
  { id: 'postado', label: 'Postado', cls: 's-postado' },
]

export const FORMATS: { id: PostFormat; label: string }[] = [
  { id: 'reel', label: 'Reel' },
  { id: 'carrossel', label: 'Carrossel' },
  { id: 'stories', label: 'Stories' },
  { id: 'post_leve', label: 'Post leve' },
  { id: 'video', label: 'Vídeo' },
]

export const TEAM = ['Isabelle', 'Richard', 'Lídia', 'Esdras', 'Bezalel']

export const DEFAULT_ASSIGNEES: Assignees = {
  gravar: 'Isabelle',
  editar: 'Bezalel',
  aprovar: 'Lídia + Isabelle',
  postar: 'Lídia',
}
