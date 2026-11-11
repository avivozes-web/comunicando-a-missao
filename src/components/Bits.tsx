import { Icon } from './Icon'
import { mediaUrl } from '@/lib/utils'
import { ACCOUNTS, FORMATS, STATUSES, type Account, type Post, type PostFormat, type PostStatus } from '@/lib/types'

export function AccountChip({ account }: { account: Account }) {
  const meta = ACCOUNTS.find((item) => item.id === account)!
  return (
    <span className={`chip ${account === 'escola' ? 'c-mj' : 'c-mi'}`}>
      <Icon name={account === 'escola' ? 'book' : 'globe'} size={11} />
      <i className={`dot ${account === 'escola' ? 'd-mj' : 'd-mi'}`} />
      {meta.name}
    </span>
  )
}

export function FormatChip({ format }: { format: string }) {
  const label = FORMATS.find((item) => item.id === format)?.label || format
  const icon = format === 'carrossel' ? 'carousel' : format === 'stories' ? 'story' : format === 'post_leve' ? 'star' : 'reel'
  return (
    <span className="chip c-gray">
      <Icon name={icon} size={12} />
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: PostStatus | string }) {
  const meta = STATUSES.find((item) => item.id === status)
  return <span className={`st ${meta?.cls || 's-ideia'}`}>{meta?.label || status}</span>
}

export function EditButton({ onClick, title = 'Editar' }: { onClick: () => void; title?: string }) {
  return (
    <button type="button" className="ed" title={title} onClick={onClick}>
      <Icon name="pencil" />
    </button>
  )
}

export function Byline({ name }: { name: string | null }) {
  if (!name) return null
  return <div className="by">atualizado por {name}</div>
}

export function Cover({
  post,
  variant = '',
  onFile,
}: {
  post: Post
  variant?: string
  onFile?: (file: File) => void
}) {
  const src = mediaUrl(post.cover_url)
  function openDrive() {
    if (post.drive_url) window.open(post.drive_url, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className={`thw ${variant}`.trim()} onClick={src && post.drive_url ? openDrive : undefined} style={{ cursor: post.drive_url ? 'pointer' : undefined }}>
      {src ? <img src={src} alt="" /> : null}
      {src && post.drive_url ? (
        <div className="drv">
          <Icon name="folder" />
          Abrir no Drive
        </div>
      ) : null}
      {!src && onFile ? (
        <label className="attach" onClick={(event) => event.stopPropagation()}>
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFile(file)
            }}
          />
          <Icon name="clip" />
          Anexar capa
        </label>
      ) : null}
    </div>
  )
}

export function formatIcon(format: PostFormat | string): string {
  if (format === 'carrossel') return 'carousel'
  if (format === 'stories') return 'story'
  if (format === 'post_leve') return 'star'
  return 'reel'
}

export function accountName(account: Account): string {
  return account === 'escola' ? 'Escola' : 'Missão'
}
