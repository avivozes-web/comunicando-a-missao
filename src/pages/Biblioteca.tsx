import { AccountChip, Byline, Cover, EditButton, StatusBadge } from '@/components/Bits'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { dm } from '@/lib/dates'
import { matchesAccount } from '@/lib/logic'
import type { PostFormat } from '@/lib/types'

export function Biblioteca({ format, title }: { format: PostFormat; title: string }) {
  const data = useData()
  const ui = useUi()
  const posts = data.bundle.posts
    .filter((post) => post.format === format && matchesAccount(post.account, ui.filter))
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Bibliotecas</div>
          <h1>{title}</h1>
          <div className="sub">Tudo que já está na grade neste formato. Dá para abrir, trocar a capa e editar.</div>
        </div>
        <button type="button" className="btn pri" onClick={() => ui.openPost(null)}>Novo conteúdo</button>
      </div>
      {posts.length === 0 && <div className="card secbox"><div className="empty">Nenhum {title.toLowerCase()} nesta conta.</div></div>}
      <div className="lib">
        {posts.map((post) => (
          <div key={post.id} className="card ic">
            <Cover post={post} onFile={(file) => void data.setCover(post.id, file)} />
            <div className="ih" style={{ marginTop: 8 }}>
              <AccountChip account={post.account} />
              <EditButton onClick={() => ui.openPost(post)} />
            </div>
            <h3>{post.title}</h3>
            <div className="tg">
              <StatusBadge status={post.status} />
              <span className="chip c-gray">{dm(post.scheduled_date)}</span>
            </div>
            <Byline name={post.updated_by} />
          </div>
        ))}
      </div>
    </>
  )
}
