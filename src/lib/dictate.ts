export type OrganizedItem = {
  id: string
  title: string
  time: string
  suggested: boolean
}

export type OrganizedDay = {
  dayHint: 'hoje' | 'amanha' | null
  items: OrganizedItem[]
}

const VERBS: Record<string, string> = {
  gravo: 'Gravar',
  gravar: 'Gravar',
  grava: 'Gravar',
  edito: 'Editar',
  editar: 'Editar',
  edita: 'Editar',
  atualizo: 'Atualizar',
  atualizar: 'Atualizar',
  posto: 'Postar',
  postar: 'Postar',
  posta: 'Postar',
  aprovo: 'Aprovar',
  aprovar: 'Aprovar',
  fecho: 'Fechar',
  fechar: 'Fechar',
  reviso: 'Revisar',
  revisar: 'Revisar',
  escrevo: 'Escrever',
  escrever: 'Escrever',
  ligo: 'Ligar',
  ligar: 'Ligar',
  marco: 'Marcar',
  marcar: 'Marcar',
  busco: 'Buscar',
  buscar: 'Buscar',
  decido: 'Decidir',
  decidir: 'Decidir',
  faco: 'Fazer',
  fazer: 'Fazer',
  vejo: 'Ver',
  ver: 'Ver',
  falo: 'Falar',
  falar: 'Falar',
  envio: 'Enviar',
  enviar: 'Enviar',
  preparo: 'Preparar',
  preparar: 'Preparar',
  confiro: 'Conferir',
  conferir: 'Conferir',
  respondo: 'Responder',
  responder: 'Responder',
  publico: 'Publicar',
  publicar: 'Publicar',
  agendo: 'Agendar',
  agendar: 'Agendar',
  organizo: 'Organizar',
  organizar: 'Organizar',
  mando: 'Mandar',
  mandar: 'Mandar',
  subo: 'Subir',
  subir: 'Subir',
  baixo: 'Baixar',
  baixar: 'Baixar',
  escolho: 'Escolher',
  escolher: 'Escolher',
  defino: 'Definir',
  definir: 'Definir',
  anoto: 'Anotar',
  anotar: 'Anotar',
}

const HOUR_WORDS: [string, number][] = [
  ['vinte e uma', 21],
  ['vinte e duas', 22],
  ['vinte e tres', 23],
  ['dezesseis', 16],
  ['dezessete', 17],
  ['dezoito', 18],
  ['dezenove', 19],
  ['quatorze', 14],
  ['catorze', 14],
  ['quinze', 15],
  ['treze', 13],
  ['vinte', 20],
  ['doze', 12],
  ['onze', 11],
  ['dez', 10],
  ['nove', 9],
  ['oito', 8],
  ['sete', 7],
  ['seis', 6],
  ['cinco', 5],
  ['quatro', 4],
  ['tres', 3],
  ['duas', 2],
  ['uma', 1],
]

const LB = String.raw`(?<![\p{L}\p{N}])`
const LA = String.raw`(?![\p{L}\p{N}])`

export function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function flexWord(word: string): string {
  const letters: Record<string, string> = {
    a: '[aáàâã]',
    e: '[eéê]',
    i: '[ií]',
    o: '[oóôõ]',
    u: '[uúü]',
    c: '[cç]',
  }
  return word.split('').map((char) => letters[char] ?? char).join('')
}

function phrase(words: string): string {
  return words.split(' ').map(flexWord).join('\\s+')
}

function bounded(inner: string): string {
  return `${LB}(?:${inner})${LA}`
}

const DAY_WORDS = ['para amanha', 'pra amanha', 'para hoje', 'pra hoje', 'no dia de amanha', 'amanha', 'hoje']

const DAY_LEAD = new RegExp(`^(?:${DAY_WORDS.map(phrase).join('|')})${LA}[\\s,.:;-]*`, 'iu')

const OPENER = new RegExp(`^(?:${['entao', 'ai', 'dai', 'bom', 'olha', 'tipo'].map(phrase).join('|')})${LA}\\s+`, 'iu')

const SPLIT = new RegExp(
  [
    '[,;.]',
    bounded(`(?:${phrase('e depois')}|${phrase('depois')})(?!\\s+${phrase('do almoco')})`),
    bounded(phrase('e tambem')),
    bounded(phrase('tambem')),
    bounded(phrase('em seguida')),
    bounded(phrase('entao')),
    `${LB}e\\s+(?=(?:${[
      phrase('as'),
      phrase('a tarde'),
      phrase('de tarde'),
      phrase('a noite'),
      phrase('de noite'),
      phrase('de manha'),
      phrase('depois do almoco'),
      phrase('apos o almoco'),
      phrase('meio-dia'),
      phrase('meio dia'),
    ].join('|')}|\\d{1,2}\\s*h))`,
  ].join('|'),
  'giu',
)

const LEAD = new RegExp(
  `^(?:${[
    'eu', 'a gente', 'preciso', 'vou', 'vamos', 'tenho que', 'quero', 'que',
    'depois', 'entao', 'tambem', 'em seguida', 'ai', 'dai', 'e',
    'da manha', 'de manha', 'pela manha', 'da tarde', 'de tarde', 'a tarde',
    'da noite', 'de noite', 'a noite', 'as', 'amanha', 'hoje', 'para amanha', 'pra amanha',
  ].map(phrase).join('|')})${LA}\\s+`,
  'iu',
)

type Hit = { minutes: number; period: boolean }

function clockMinutes(hour: number, minute: number): number | null {
  if (hour > 23 || minute > 59) return null
  if (hour >= 1 && hour <= 6) hour += 12
  return hour * 60 + minute
}

function adjustPeriod(minutes: number, chunk: string): number {
  const text = plain(chunk)
  let hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const morning = /\b(?:da|de|pela) manha\b/.test(text)
  const afternoon = /\b(?:da|de|a) tarde\b/.test(text)
  const night = /\b(?:da|de|a) noite\b/.test(text)
  if (morning && hour >= 12 && hour < 24) hour -= 12
  else if ((afternoon || night) && hour < 12) hour += 12
  return hour * 60 + minute
}

function minuteTail(text: string, hourWord: string): number {
  const spoken = plain(text)
  const hour = plain(hourWord)
  if (spoken.includes('meia') && !hour.includes('meia')) return 30
  if (spoken.includes('quinze') && hour !== 'quinze') return 15
  return 0
}

function timeRules(): { re: RegExp; read: (match: RegExpMatchArray) => Hit | null }[] {
  const hourAlt = HOUR_WORDS.map(([word]) => `(?:${phrase(word)})`).join('|')
  return [
    { re: new RegExp(bounded(`${phrase('meio-dia')}|${phrase('meio dia')}`), 'iu'), read: () => ({ minutes: 12 * 60, period: true }) },
    { re: new RegExp(bounded(`${phrase('meia-noite')}|${phrase('meia noite')}`), 'iu'), read: () => ({ minutes: 0, period: true }) },
    { re: new RegExp(bounded(`${phrase('depois do almoco')}|${phrase('apos o almoco')}`), 'iu'), read: () => ({ minutes: 14 * 60, period: true }) },
    { re: new RegExp(bounded(`${phrase('de manha')}|${phrase('pela manha')}`), 'iu'), read: () => ({ minutes: 9 * 60, period: true }) },
    { re: new RegExp(bounded(`${phrase('a tarde')}|${phrase('de tarde')}`), 'iu'), read: () => ({ minutes: 15 * 60, period: true }) },
    { re: new RegExp(bounded(`${phrase('a noite')}|${phrase('de noite')}`), 'iu'), read: () => ({ minutes: 19 * 60, period: true }) },
    {
      re: new RegExp(`(?:${LB}${phrase('as')}\\s+)?${LB}(\\d{1,2})\\s*(?:h(?:oras?)?|:)\\s*(\\d{2})?(?:\\s+e\\s+${phrase('meia')}|\\s+e\\s+${phrase('quinze')})?`, 'iu'),
      read: (match) => {
        const minute = minuteTail(match[0], '') || (match[2] ? Number(match[2]) : 0)
        const minutes = clockMinutes(Number(match[1]), minute)
        return minutes === null ? null : { minutes, period: false }
      },
    },
    {
      re: new RegExp(`${LB}${phrase('as')}\\s+(\\d{1,2})(?:\\s+e\\s+${phrase('meia')}|\\s+e\\s+${phrase('quinze')})?${LA}`, 'iu'),
      read: (match) => {
        const minutes = clockMinutes(Number(match[1]), minuteTail(match[0], ''))
        return minutes === null ? null : { minutes, period: false }
      },
    },
    {
      re: new RegExp(`${LB}${phrase('as')}\\s+(${hourAlt})(?:\\s+e\\s+${phrase('meia')}|\\s+e\\s+${phrase('quinze')}|\\s+${phrase('horas')})?${LA}`, 'iu'),
      read: (match) => {
        const word = plain(match[1])
        const found = HOUR_WORDS.find(([name]) => plain(name) === word)
        if (!found) return null
        const minutes = clockMinutes(found[1], minuteTail(match[0], match[1]))
        return minutes === null ? null : { minutes, period: false }
      },
    },
  ]
}

function findTime(chunk: string): { hit: Hit; rest: string } | null {
  const found: { index: number; length: number; hit: Hit }[] = []
  for (const rule of timeRules()) {
    const match = chunk.match(rule.re)
    if (!match || match.index === undefined) continue
    const hit = rule.read(match)
    if (!hit) continue
    found.push({ index: match.index, length: match[0].length, hit })
  }
  if (!found.length) return null
  const specific = found.filter((item) => !item.hit.period)
  const pool = specific.length ? specific : found
  pool.sort((a, b) => a.index - b.index)
  const best = pool[0]
  const hit = best.hit.period ? best.hit : { ...best.hit, minutes: adjustPeriod(best.hit.minutes, chunk) }
  const rest = `${chunk.slice(0, best.index)} ${chunk.slice(best.index + best.length)}`.replace(/\s+/g, ' ').trim()
  return { hit, rest }
}

function stripLead(raw: string): string {
  let text = raw
  for (let i = 0; i < 6; i += 1) {
    const next = text.replace(LEAD, '')
    if (next === text) break
    text = next
  }
  return text.replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').replace(/\s+/g, ' ').trim()
}

function tidyTitle(raw: string): string {
  const text = stripLead(raw)
  if (!text) return ''
  const words = text.split(' ')
  const first = plain(words[0])
  if (VERBS[first]) words[0] = VERBS[first]
  else words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1)
  return words.join(' ')
}

function nextFree(cursor: number, used: Set<number>): number {
  let time = Math.max(cursor, 9 * 60)
  while (used.has(time) && time < 22 * 60) time += 60
  return Math.min(time, 21 * 60)
}

function stripOpeners(text: string): string {
  let next = text
  for (let i = 0; i < 4; i += 1) {
    const stripped = next.replace(OPENER, '')
    if (stripped === next) break
    next = stripped
  }
  return next.trim()
}

export function organizeDay(input: string): OrganizedDay {
  const cleaned = stripOpeners(input.replace(/\s+/g, ' ').trim())
  if (!cleaned) return { dayHint: null, items: [] }
  const lead = cleaned.match(DAY_LEAD)
  let dayHint: OrganizedDay['dayHint'] = null
  let body = cleaned
  if (lead) {
    dayHint = plain(lead[0]).includes('amanha') ? 'amanha' : 'hoje'
    body = cleaned.slice(lead[0].length).trim()
  }
  SPLIT.lastIndex = 0
  const chunks = body.split(SPLIT).map((part) => part.trim()).filter(Boolean)
  const parsed = chunks.map((chunk) => {
    const found = findTime(chunk)
    return {
      title: tidyTitle(found?.rest ?? chunk),
      minutes: found?.hit.minutes ?? null,
      period: found?.hit.period ?? false,
    }
  }).filter((item) => item.title.length > 1)

  const used = new Set<number>()
  let cursor = 9 * 60
  const items: OrganizedItem[] = parsed.map((item, index) => {
    let minutes = item.minutes
    let suggested = false
    if (minutes === null) {
      minutes = nextFree(cursor, used)
      suggested = true
    } else if (item.period && used.has(minutes)) {
      minutes = nextFree(minutes + 60, used)
      suggested = true
    }
    used.add(minutes)
    cursor = Math.max(cursor, minutes + 60)
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    return {
      id: `t${index + 1}`,
      title: item.title,
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      suggested,
    }
  })
  return { dayHint, items }
}

export function speakableTime(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  if (!minute) return `${hour}h`
  return `${hour}h${String(minute).padStart(2, '0')}`
}

export function taskTitle(item: Pick<OrganizedItem, 'time' | 'title'>): string {
  return `${speakableTime(item.time)} · ${item.title}`
}

export function timeSort(time: string, index: number): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute + index
}

export function addHour(time: string): string {
  const [hour, minute] = time.split(':').map(Number)
  const total = Math.min((Number.isFinite(hour) ? hour : 9) * 60 + (minute || 0) + 60, 21 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
