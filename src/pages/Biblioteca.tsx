import { useState } from 'react'
import { AccountChip, Byline, EditButton, FormatChip, StatusBadge } from '@/components/Bits'
import { AjusteDialog, authorFromEmail } from '@/components/AjusteDialog'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { dm } from '@/lib/dates'
import { matchesAccount } from '@/lib/logic'
import type { Post, PostStatus, ReadyChecks } from '@/lib/types'
import { uid } from '@/lib/utils'

type FormatFilter = 'todos' | 'reel' | 'carrossel' | 'stories'
type UseFilter = 'nao' | 'sim'

const READY: { key: keyof ReadyChecks; label: string; missaoOnly?: boolean }[] = [
  { key: 'tamanho', label: 'Tamanho certo' },
  { key: 'legenda', label: 'Legenda conferida e contada' },
  { key: 'conta', label: 'Conta certa' },
  { key: 'sem_hashtag', label: 'Sem hashtag e sem cruz' },
  { key: 'pix', label: 'PIX na legenda', missaoOnly: true },
]

const LIBRARY_STATUS: PostStatus[] = ['aprovado', 'pronto', 'postado']

export function Biblioteca() {
  const data = useData()
  const ui = useUi()
  const [format, setFormat] = useState<FormatFilter>('todos')
  const [used, setUsed] = useState<UseFilter>('nao')
  const posts = data.bundle.posts
    .filter((post) => LIBRARY_STATUS.includes(post.status) && matchesAccount(post.account, ui.filter) && matchFormat(post, format) && (used === 'sim' ? post.status === 'postado' : post.status !== 'postado'))
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date) || a.title.localeCompare(b.title, 'pt'))

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Biblioteca</div>
          <h1>Biblioteca</h1>
          <div className="sub">Reels, carrosséis e stories aprovados, com arte, legendas e o checklist para postar.</div>
        </div>
        <button type="button" className="btn pri" onClick={() => ui.openPost(null)}>Novo conteúdo</button>
      </div>
      <div className="lib-filters">
        <div className="filt" aria-label="Formato">
          <button type="button" className={format === 'todos' ? 'on' : ''} onClick={() => setFormat('todos')}>Todos</button>
          <button type="button" className={format === 'reel' ? 'on' : ''} onClick={() => setFormat('reel')}>Reels</button>
          <button type="button" className={format === 'carrossel' ? 'on' : ''} onClick={() => setFormat('carrossel')}>Carrossel</button>
          <button type="button" className={format === 'stories' ? 'on' : ''} onClick={() => setFormat('stories')}>Stories</button>
        </div>
        <div className="filt" aria-label="Uso">
          <button type="button" className={used === 'nao' ? 'on' : ''} onClick={() => setUsed('nao')}>Ainda não usei</button>
          <button type="button" className={used === 'sim' ? 'on' : ''} onClick={() => setUsed('sim')}>Já usei</button>
        </div>
      </div>
      {posts.length === 0 && <div className="card secbox"><div className="empty">Nenhum post aprovado neste filtro.</div></div>}
      <div className="lib-one">
        {posts.map((post) => <LibraryCard key={post.id} post={post} />)}
      </div>
    </>
  )
}

function thumbClass(post: Post): string {
  return post.format === 'carrossel' || post.format === 'post_leve' ? 'ratio-45' : 'ratio-916'
}

function Thumb({ post }: { post: Post }) {
  const src = post.cover_thumb_url
  const body = src
    ? <img src={src} alt="" />
    : <span>sem capa ainda</span>
  if (!src || !post.drive_url) return <div className={`lib-thumb ${thumbClass(post)}`}>{body}</div>
  return (
    <a className={`lib-thumb ${thumbClass(post)}`} href={post.drive_url} target="_blank" rel="noopener noreferrer">
      {body}
    </a>
  )
}

function matchFormat(post: Post, format: FormatFilter): boolean {
  if (format === 'todos') return post.format === 'reel' || post.format === 'video' || post.format === 'carrossel' || post.format === 'stories'
  if (format === 'reel') return post.format === 'reel' || post.format === 'video'
  return post.format === format
}

function LibraryCard({ post }: { post: Post }) {
  const data = useData()
  const ui = useUi()
  const { email } = useAuth()
  const [ajuste, setAjuste] = useState(false)
  const checks = READY.filter((item) => !item.missaoOnly || post.account === 'missao')
  const comments = (data.bundle.comments || [])
    .filter((comment) => comment.post_id === post.id)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
  const instagram = post.legenda || ''
  const whatsapp = post.legenda_whatsapp || ''

  async function copy(text: string) {
    if (!text) {
      ui.toast('Não há texto para copiar.')
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      ui.toast('Copiado.')
    } catch {
      ui.toast('Não foi possível copiar.')
    }
  }

  async function toggleReady(key: keyof ReadyChecks) {
    const ready = { ...(post.ready_checks || {}), [key]: !post.ready_checks?.[key] }
    const complete = checks.every((item) => ready[item.key])
    let status = post.status
    if (complete) status = 'pronto'
    else if (post.status === 'pronto') status = 'aprovado'
    await data.savePost({ ...post, ready_checks: ready, status })
  }

  async function remove() {
    if (!window.confirm('Apagar este conteúdo? As tarefas geradas por ele também saem.')) return
    await data.removePost(post.id)
    ui.toast('Conteúdo apagado.')
  }

  return (
    <article className="card secbox lib-card">
      <div className="lib-top">
        <Thumb post={post} />
        <div className="lib-main">
          <div className="ih">
            <AccountChip account={post.account} />
            <FormatChip format={post.format} />
            <StatusBadge status={post.status} />
            <span className="chip c-gray">{dm(post.scheduled_date)}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <EditButton onClick={() => ui.openPost(post)} />
              <button type="button" className="btn" onClick={() => void remove()}>Apagar</button>
            </span>
          </div>
          <h3>{post.title}</h3>
          {post.drive_url ? (
            <a className="btn" href={post.drive_url} target="_blank" rel="noopener noreferrer"><Icon name="folder" /> Baixar no Drive</a>
          ) : <p className="src">Sem link do Drive para baixar a arte ou o vídeo.</p>}
          <Byline name={post.updated_by} />
        </div>
      </div>
      <div className="caption-box">
        <div className="ih">
          <b>Legenda do Instagram</b>
          <span className="src">{instagram.length} caracteres</span>
          <button type="button" className="btn" onClick={() => void copy(instagram)}>Copiar</button>
        </div>
        <p>{instagram || 'Sem legenda do Instagram.'}</p>
      </div>
      <div className="caption-box">
        <div className="ih">
          <b>Legenda do WhatsApp</b>
          <button type="button" className="btn" onClick={() => void copy(whatsapp)}>Copiar</button>
        </div>
        <p>{whatsapp || 'Sem legenda do WhatsApp.'}</p>
      </div>
      <div className="field">
        <b>Pronto para postar?</b>
        <div className="stack-sm" style={{ marginTop: 8 }}>
          {checks.map((item) => (
            <button type="button" key={item.key} className={`ck ${post.ready_checks?.[item.key] ? 'ok' : 'todo'}`} onClick={() => void toggleReady(item.key)}>
              <span className="bx">{post.ready_checks?.[item.key] && <Icon name="check" size={11} />}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="comment-list">
        <div className="ih">
          <b>Ajustes</b>
          <button type="button" className="btn" onClick={() => setAjuste(true)}>Pedir ajuste</button>
        </div>
        {comments.length === 0 && <p className="src">Nenhum recado ainda.</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <small>{comment.kind === 'resposta' ? 'Resposta' : comment.kind === 'nota' ? 'Nota' : 'Ajuste'} · {comment.author || 'Equipe'} · {stamp(comment.created_at)}</small>
            <p>{comment.body}</p>
          </div>
        ))}
      </div>
      <AjusteDialog open={ajuste} onClose={() => setAjuste(false)} onSave={async (body) => {
        await data.saveComment({
          id: uid(),
          post_id: post.id,
          idea_id: null,
          body,
          author: authorFromEmail(email),
          kind: 'ajuste',
        })
        ui.toast('Ajuste registrado.')
      }} />
    </article>
  )
}

function stamp(value: string | null | undefined): string {
  if (!value) return 'agora'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
