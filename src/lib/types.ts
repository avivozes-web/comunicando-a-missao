export type Account = 'escola' | 'missao'
export type Filter = 'todas' | Account
export type PostStatus = 'ideia' | 'roteiro' | 'gravado' | 'editado' | 'arte_pronta' | 'aprovado' | 'pronto' | 'postado'
export type PostFormat = 'reel' | 'carrossel' | 'stories' | 'post_leve' | 'video'
export type IdeaStatus = 'ideia' | 'aprovada' | 'roteiro_pronto' | 'em_producao' | 'pronto_postar' | 'postado' | 'rejeitada'
export type IdeaCourse = 'FIMC' | 'Teologia' | 'Missiologia' | 'Portal'
export type IdeaFormat = 'reel' | 'carrossel'
export type TaskKind = 'fixed' | 'adhoc' | 'generated'
export type TaskStep = 'gravar' | 'editar' | 'aprovar' | 'postar'

export type CheckItem = { label: string; done: boolean }
export type ReadyChecks = {
  tamanho?: boolean
  legenda?: boolean
  conta?: boolean
  sem_hashtag?: boolean
  pix?: boolean
}
export type CommentKind = 'ajuste' | 'resposta' | 'nota'

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
  legenda_whatsapp: string | null
  ready_checks: ReadyChecks
  cover_url: string | null
  cover_thumb_url: string | null
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
  course: IdeaCourse | null
  script_url: string | null
  archived: boolean
  post_id: string | null
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
  note: string | null
  sort: number
}

export type PostComment = {
  id: string
  post_id: string | null
  idea_id: string | null
  body: string
  author: string
  kind: CommentKind
  created_at?: string | null
}

export type ReportAction = {
  id: string
  account: Account
  report_id: string | null
  body: string
  basis: string | null
  action_date: string
  sort: number
  task_id: string | null
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
  notes: { traga1?: string; estrategia?: GoalStrategy }
}

export type GoalStrategy = {
  atualizado_em?: string
  inicio?: string
  page_url?: string
  diagnostico?: { numeros?: { v: string; k: string; d?: string }[]; texto?: string }
  taticas?: { titulo: string; fazer: string; quem: string; esforco?: string; impacto?: string }[]
  realismo?: string
  regras?: string[]
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
  comments: PostComment[]
  report_actions: ReportAction[]
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
  comments: [],
  report_actions: [],
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
  { id: 'pronto', label: 'Pronto para postar', cls: 's-pronto' },
  { id: 'postado', label: 'Postado', cls: 's-postado' },
]

export const FORMATS: { id: PostFormat; label: string }[] = [
  { id: 'reel', label: 'Reel' },
  { id: 'carrossel', label: 'Carrossel' },
  { id: 'stories', label: 'Stories' },
  { id: 'post_leve', label: 'Post leve' },
  { id: 'video', label: 'Vídeo' },
]

export const IDEA_STAGES: { id: IdeaStatus; label: string; cls: string }[] = [
  { id: 'ideia', label: 'Ideia', cls: 's-ideia' },
  { id: 'aprovada', label: 'Aprovada', cls: 's-aprovada' },
  { id: 'roteiro_pronto', label: 'Roteiro pronto', cls: 's-roteiro-pronto' },
  { id: 'em_producao', label: 'Em produção', cls: 's-em-producao' },
  { id: 'pronto_postar', label: 'Pronto para postar', cls: 's-pronto-postar' },
  { id: 'postado', label: 'Postado', cls: 's-postado' },
]

export const IDEA_COURSES: { id: IdeaCourse; label: string }[] = [
  { id: 'FIMC', label: 'FIMC' },
  { id: 'Teologia', label: 'Teologia' },
  { id: 'Missiologia', label: 'Missiologia' },
  { id: 'Portal', label: 'Portal' },
]

export const IDEA_FORMATS: { id: IdeaFormat; label: string }[] = [
  { id: 'reel', label: 'Reels' },
  { id: 'carrossel', label: 'Carrossel' },
]

export const TEAM = ['Isabelle', 'Richard', 'Lídia', 'Esdras', 'Bezalel']

export const DEFAULT_ASSIGNEES: Assignees = {
  gravar: 'Isabelle',
  editar: 'Bezalel',
  aprovar: 'Lídia + Isabelle',
  postar: 'Lídia',
}
