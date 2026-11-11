import { useNavigate } from 'react-router-dom'
import { AccountChip, Byline, Cover, EditButton, FormatChip, StatusBadge, accountName, formatIcon } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, dayNumber, longDate, startOfWeek, weekdayShort } from '@/lib/dates'
import { todayISO } from '@/lib/dates'
import { isPlaceholder, matchesAccount, pendencias, postAlert, resumoDoDia, timeLabel } from '@/lib/logic'
import type { Account, Post } from '@/lib/types'

export function Hoje() {
  const data = useData()
  const ui = useUi()
  const navigate = useNavigate()
  const today = todayISO()
  const tomorrow = addDays(today, 1)
  const posts = data.bundle.posts.filter((post) => matchesAccount(post.account, ui.filter))
  const tasks = data.bundle.tasks.filter((task) => matchesAccount(task.account, ui.filter))
  const summary = resumoDoDia(tasks, posts, today)
  const sunday = addDays(startOfWeek(today), 6)
  const later = posts.filter((post) => post.scheduled_date > tomorrow && post.scheduled_date <= sunday)
  const next = pendencias(data.bundle.posts.filter((post) => matchesAccount(post.account, ui.filter)), today)

  async function gravado(post?: Post) {
    const target = post || posts
      .filter((item) => (item.format === 'reel' || item.format === 'video') && (item.status === 'ideia' || item.status === 'roteiro'))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0]
    if (!target) {
      ui.toast('Não há vídeo esperando gravação.')
      return
    }
    await data.savePost({ ...target, status: 'gravado' })
    ui.toast('Marcado: gravado, falta editar.')
  }

  return (
    <>
      <div className="only-desktop">
        <div className="hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="eyebrow">{longDate(today)}</div>
            <h1>Olá, Isabelle</h1>
            <div className="sub">O que precisa sair hoje e amanhã, nas duas contas.</div>
            <div className="resumo">{summary}</div>
            <div className="ico-row">
              <span className="ico-c navy"><Icon name="book" /></span>
              <span className="ico-c navy"><Icon name="cap" /></span>
              <span className="ico-c navy"><Icon name="globe" /></span>
              <span className="ico-c navy"><Icon name="compass" /></span>
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn-rec" onClick={() => void gravado()}><Icon name="reel" /> Gravado, falta editar</button>
            <button type="button" className="btn" onClick={() => navigate('/semana')}><Icon name="calx" /> Ver semana</button>
            <button type="button" className="btn pri" onClick={() => ui.openPost(null)}><Icon name="plus" /> Novo conteúdo</button>
          </div>
        </div>
        <div className="cols">
          <DayCard label="Hoje" date={today} posts={posts} onGravado={gravado} />
          <DayCard label="Amanhã" date={tomorrow} posts={posts} onGravado={gravado} />
        </div>
        <div className="card pend" style={{ marginBottom: 10 }}>
          <div className="bh">
            <h2><Icon name="calx" /> Resto desta semana{later[0] ? ` · ${weekdayShort(later[0].scheduled_date)} ${dayNumber(later[0].scheduled_date)}/${Number(later[0].scheduled_date.slice(5, 7))}` : ''}</h2>
            <span className="pill">{later.length} {later.length === 1 ? 'lugar na grade' : 'lugares na grade'}</span>
          </div>
          {later.length === 0 && <div className="empty">Nada mais nesta semana.</div>}
          <div className="pl">
            {later.map((post) => <LaterCard key={post.id} post={post} onGravado={gravado} />)}
          </div>
        </div>
        <div className="card pend">
          <div className="bh">
            <h2><Icon name="flag" /> Pendências da semana que vem</h2>
            <span className="alertb"><Icon name="alert" /> Deixar a semana pronta antes</span>
          </div>
          <div className="pl">
            {next.length === 0 && <div className="empty">A semana que vem ainda não tem posts.</div>}
            {next.map((item) => (
              <button type="button" key={item.postId + item.title} className={`pi ${item.alert ? 'warn' : ''}`} onClick={() => {
                const post = data.bundle.posts.find((row) => row.id === item.postId)
                if (post) ui.openPost(post)
              }}>
                <div className="dt"><small>{weekdayShort(item.date)}</small><b>{dayNumber(item.date)}</b></div>
                <div className="tx">
                  {item.title}
                  <small style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                    {item.accounts.map((account) => <AccountChip key={account} account={account} />)}
                    {item.alert && <span className="ared"><Icon name="alert" />{item.alert}</span>}
                  </small>
                </div>
                <span className="go"><Icon name="chevron" /></span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="only-mobile">
        <div className="resumo mobile-resumo">{summary}</div>
        <div className="seg2">
          <button type="button" className={ui.filter === 'todas' ? 'on' : ''} onClick={() => ui.setFilter('todas')}>Todas</button>
          <button type="button" className={ui.filter === 'escola' ? 'on' : ''} onClick={() => ui.setFilter('escola')}><i className="dot d-mj" /> Escola</button>
          <button type="button" className={ui.filter === 'missao' ? 'on' : ''} onClick={() => ui.setFilter('missao')}><i className="dot d-mi" /> Missão</button>
        </div>
        <MobileDay label="Hoje" date={today} posts={posts} />
        <MobileDay label="Amanhã" date={tomorrow} posts={posts} />
        <div className="lb">Pendências da semana que vem<span>{next.length}</span></div>
        <div className="card p">
          {next.map((item) => (
            <button type="button" className="mpr" key={item.postId + item.title} onClick={() => {
              const post = data.bundle.posts.find((row) => row.id === item.postId)
              if (post) ui.openPost(post)
            }}>
              <span className="d">{weekdayShort(item.date)}<b>{dayNumber(item.date)}</b></span>
              <div className="tx">{item.title}{item.alert && <small className="ared"><Icon name="alert" />{item.alert}</small>}</div>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {item.accounts.map((account) => <i key={account} className={`dot ${account === 'escola' ? 'd-mj' : 'd-mi'}`} />)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function DayCard({ label, date, posts, onGravado }: { label: string; date: string; posts: Post[]; onGravado: (post: Post) => void }) {
  const ui = useUi()
  const data = useData()
  const dayPosts = posts.filter((post) => post.scheduled_date === date)
  const accounts: Account[] = ui.filter === 'todas' ? ['escola', 'missao'] : [ui.filter]
  const empty = accounts.filter((account) => !dayPosts.some((post) => post.account === account))
  return (
    <div className="card blk">
      <div className="bh">
        <h2><Icon name={label === 'Hoje' ? 'sun' : 'cal'} /> {label} · {weekdayShort(date)} {dayNumber(date)}/{Number(date.slice(5, 7))}</h2>
        <span className="pill">{dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}</span>
      </div>
      <div className="stack-sm">
        {dayPosts.map((post) => {
          const alert = postAlert(post, todayISO())
          return (
            <div key={post.id} className={`task ${post.account === 'escola' ? 'mj' : 'mi'} ${alert ? 'warn' : ''}`}>
              <Cover post={post} variant={post.format === 'carrossel' ? 'h' : 'v'} onFile={(file) => void data.setCover(post.id, file)} />
              <div className="tk">
                <div className="row">
                  <AccountChip account={post.account} />
                  <FormatChip format={post.format} />
                  <StatusBadge status={post.status} />
                  <span style={{ marginLeft: 'auto' }}><EditButton onClick={() => ui.openPost(post)} /></span>
                </div>
                <h3>{post.title}</h3>
                <div className="meta">
                  {timeLabel(post.scheduled_time) && <span><Icon name="clock" />{timeLabel(post.scheduled_time)}</span>}
                  {post.aspect && <span>{post.aspect}</span>}
                  {post.note && <span><Icon name="user" />{post.note}</span>}
                </div>
                {post.checklist.length > 0 && (
                  <div className="checks">
                    {post.checklist.map((item, index) => (
                      <button type="button" key={item.label} className={`ck ${item.done ? 'ok' : 'todo'}`} onClick={() => void data.toggleCheck(post.id, index)}>
                        <span className="bx">{item.done && <Icon name="check" />}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="acts">
                  {(post.status === 'ideia' || post.status === 'roteiro') && (post.format === 'reel' || post.format === 'video') && (
                    <button type="button" className="btn-rec" onClick={() => void onGravado(post)}><Icon name="reel" /> Gravado, falta editar</button>
                  )}
                  {alert && <span className="ared"><Icon name="alert" />{alert.line}</span>}
                </div>
                <Byline name={post.updated_by} />
              </div>
            </div>
          )
        })}
        {empty.map((account) => (
          <div className="empty" key={account}>
            <Icon name="check" size={15} />
            {accountName(account)}: nada programado para {label === 'Hoje' ? 'hoje' : 'amanhã'}.
          </div>
        ))}
      </div>
    </div>
  )
}

function LaterCard({ post, onGravado }: { post: Post; onGravado: (post: Post) => void }) {
  const ui = useUi()
  const data = useData()
  const vague = isPlaceholder(post.title)
  return (
    <div className="pi">
      <div className="dt"><small>{weekdayShort(post.scheduled_date)}</small><b>{dayNumber(post.scheduled_date)}</b></div>
      <div className="tx">
        {vague ? `${post.format === 'carrossel' ? 'Carrossel' : 'Vídeo'} · ${post.title.replace(/^Vídeo · |^Carrossel · /, '')}` : post.title}
        <small style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <AccountChip account={post.account} />
          {post.note && <span style={{ fontWeight: 500 }}>{post.note}</span>}
        </small>
        <div className="acts">
          {!post.cover_url && <Cover post={post} onFile={(file) => void data.setCover(post.id, file)} />}
          {(post.status === 'ideia' || post.status === 'roteiro') && <button type="button" className="btn-rec" onClick={() => void onGravado(post)}><Icon name="reel" /> Gravado, falta editar</button>}
          <EditButton onClick={() => ui.openPost(post)} />
        </div>
      </div>
      <StatusBadge status={post.status} />
    </div>
  )
}

function MobileDay({ label, date, posts }: { label: string; date: string; posts: Post[] }) {
  const ui = useUi()
  const dayPosts = posts.filter((post) => post.scheduled_date === date)
  return (
    <>
      <div className="lb">{label} · {weekdayShort(date)} {dayNumber(date)}/{Number(date.slice(5, 7))}<span>{dayPosts.length} {dayPosts.length === 1 ? 'post' : 'posts'}</span></div>
      {dayPosts.map((post) => (
        <div key={post.id} className={`card t ${post.account === 'escola' ? 'mj' : 'mi'}`}>
          <Cover post={post} />
          <div>
            <div className="r">
              <AccountChip account={post.account} />
              <StatusBadge status={post.status} />
              <EditButton onClick={() => ui.openPost(post)} />
            </div>
            <h3>{post.title}</h3>
            <div className="m">
              <span><Icon name={formatIcon(post.format)} /> {FORMAT_LABEL[post.format] || post.format}</span>
              {timeLabel(post.scheduled_time) && <span><Icon name="clock" />{timeLabel(post.scheduled_time)}</span>}
              {post.aspect && <span>{post.aspect}</span>}
            </div>
            <Byline name={post.updated_by} />
          </div>
        </div>
      ))}
    </>
  )
}

const FORMAT_LABEL: Record<string, string> = {
  reel: 'Reel',
  carrossel: 'Carrossel',
  stories: 'Stories',
  post_leve: 'Post leve',
  video: 'Vídeo',
}
