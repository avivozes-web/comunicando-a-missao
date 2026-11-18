import { Byline, Cover, EditButton, StatusBadge } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, dayNumber, startOfWeek, todayISO, weekdayShort, weekTitle } from '@/lib/dates'
import { isPlaceholder, matchesAccount, needsCoverUpload, postAlert, postsOnDay, timeLabel } from '@/lib/logic'
import { FORMATS, STATUSES, type Post } from '@/lib/types'

const WEEK_COUNT = 5

export function Semana() {
  const data = useData()
  const ui = useUi()
  const today = todayISO()
  const firstMonday = startOfWeek(today)
  const weeks = Array.from({ length: WEEK_COUNT }, (_, index) => addDays(firstMonday, index * 7))
  const posts = data.bundle.posts.filter((post) => matchesAccount(post.account, ui.filter))

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Esta semana e as próximas</div>
          <h1>Semana</h1>
          <div className="sub">Os posts que saem, da semana de {weekTitle(firstMonday).replace('Semana ', '')} em diante. Inclui o que já foi postado.</div>
        </div>
        <button type="button" className="btn pri" onClick={() => ui.openPost(null, firstMonday)}><Icon name="plus" /> Novo conteúdo</button>
      </div>
      <div className="legend">
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginRight: 4 }}>Status:</span>
        {STATUSES.map((status) => <span key={status.id} className={`st ${status.cls}`}>{status.label}</span>)}
      </div>
      <div className="week-cal">
        {weeks.map((monday) => {
          const days = [0, 1, 2, 3, 4, 5, 6].map((index) => addDays(monday, index))
          return (
            <section key={monday}>
              <h2>{weekTitle(monday)}</h2>
              <div className="scrollx">
                <div className="wk">
                  <div className="lane-l">
                    <div><i className="dot d-mj" style={{ width: 10, height: 10 }} />Escola<small>@missaojosue.educacao</small></div>
                    <div><i className="dot d-mi" style={{ width: 10, height: 10 }} />Missão<small>@missaojosue.ofc</small></div>
                  </div>
                  {days.map((date) => {
                    const weekend = weekdayShort(date) === 'sáb' || weekdayShort(date) === 'dom'
                    return (
                      <div className="day" key={date}>
                        <div className={`dh ${weekend ? 'off' : ''}`}><b>{dayNumber(date)}</b><span>{weekdayShort(date)}</span></div>
                        <Lane account="escola" date={date} posts={posts} weekend={weekend} />
                        <Lane account="missao" date={date} posts={posts} weekend={weekend} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

function showAttach(post: Post): boolean {
  const title = post.title.trim()
  if (post.cover_url || post.cover_thumb_url) return false
  if (!needsCoverUpload(post.format)) return false
  if (/^a definir$/i.test(title) || /^tema a definir$/i.test(title)) return false
  return true
}

function showCoverBox(post: Post): boolean {
  if (post.cover_url || post.cover_thumb_url) return true
  if (showAttach(post)) return true
  if (post.drive_url && (post.format === 'carrossel' || post.format === 'post_leve')) return true
  return false
}

function Lane({ account, date, posts, weekend }: { account: 'escola' | 'missao'; date: string; posts: Post[]; weekend: boolean }) {
  const ui = useUi()
  const data = useData()
  const list = postsOnDay(posts, date, account)
  if (weekend && list.length === 0) {
    return <div className="lane off"><div className="offl">Folga</div></div>
  }
  const tag = list.find((post) => post.date_tag)?.date_tag
  return (
    <div className={`lane ${account === 'escola' ? 'mj' : 'mi'}`}>
      {tag && <div className="tag-date"><Icon name="flag" size={11} />{tag}</div>}
      {list.map((post) => {
        const alert = postAlert(post, todayISO())
        const vague = isPlaceholder(post.title)
        const label = FORMATS.find((item) => item.id === post.format)?.label || post.format
        const showBox = showCoverBox(post)
        return (
          <div key={post.id} className={`pc ${account === 'escola' ? 'mj' : 'mi'} ${alert ? 'warn' : ''}`}>
            <div className="ty">
              <Icon name={post.format === 'carrossel' ? 'carousel' : post.format === 'stories' ? 'story' : post.format === 'post_leve' ? 'star' : 'reel'} />
              {label}
              <EditButton onClick={() => ui.openPost(post)} />
            </div>
            {showBox && (
              <Cover post={post} onFile={showAttach(post) ? (file) => void data.setCover(post.id, file) : undefined} />
            )}
            <h4 className={vague ? 'tbd' : ''}>{post.title}</h4>
            <div className="ft">
              <StatusBadge status={post.status} />
              {timeLabel(post.scheduled_time) && <span className="tm"><Icon name="clock" />{timeLabel(post.scheduled_time)}</span>}
            </div>
            {alert && <div className="ared"><span>{alert.when}</span><span>{alert.miss}</span></div>}
            {(post.status === 'ideia' || post.status === 'roteiro') && (post.format === 'reel' || post.format === 'video') && (
              <div style={{ marginTop: 6 }}>
                <button type="button" className="btn-rec" onClick={() => void data.savePost({ ...post, status: 'gravado' })}>Gravado,<br />falta editar</button>
              </div>
            )}
            <Byline name={post.updated_by} />
          </div>
        )
      })}
    </div>
  )
}
