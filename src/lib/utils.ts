import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const PREVIEW = import.meta.env.VITE_PREVIEW === 'true'

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://lmycoesvfulfrtrehayn.supabase.co'

export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OSFMAzJhomuj7lRk5-ZXDg_0diIHs-M'

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url
  const base = import.meta.env.BASE_URL || '/'
  return base + url.replace(/^\//, '')
}

export function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function uid(): string {
  return crypto.randomUUID()
}
