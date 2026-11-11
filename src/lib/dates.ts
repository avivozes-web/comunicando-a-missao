const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Belem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(iso: string, days: number): string {
  const date = parseISO(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86400000)
}

export function weekdayIndex(iso: string): number {
  return parseISO(iso).getUTCDay()
}

export function isoWeekday(iso: string): number {
  const day = weekdayIndex(iso)
  return day === 0 ? 7 : day
}

export function startOfWeek(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso))
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[weekdayIndex(iso)]
}

export function dayNumber(iso: string): string {
  return String(parseISO(iso).getUTCDate())
}

export function monthShort(iso: string): string {
  return MONTHS[parseISO(iso).getUTCMonth()]
}

export function longDate(iso: string): string {
  const text = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(parseISO(iso))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function shortStamp(iso: string): string {
  const date = parseISO(iso)
  return `${weekdayShort(iso)} ${date.getUTCDate()}/${date.getUTCMonth() + 1}`
}

export function dm(iso: string): string {
  const date = parseISO(iso)
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`
}

export function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6)
  const a = parseISO(monday).getUTCDate()
  const b = parseISO(sunday).getUTCDate()
  const month = monthShort(sunday)
  return `Semana ${a}–${b} ${month}`
}

export function rangeLabel(start: string, end: string): string {
  return `${dm(start)}–${dm(end)}`
}
