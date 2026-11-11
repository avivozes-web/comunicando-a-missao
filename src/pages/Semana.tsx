import { useState } from 'react'
import { Byline, Cover, EditButton, StatusBadge } from '@/components/Bits'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, dayNumber, startOfWeek, weekdayShort } from '@/lib/dates'
import { todayISO } from '@/lib/dates'
import { isPlaceholder, matchesAccount, postAlert, timeLabel } from '@/lib/logic'
import { FORMATS, STATUSES, type Post } from '@/lib/types'

export function Semana() {
  const data = useData()
  const ui = useUi()
  const today = todayISO()
  const [offset, setOffset] = useState(1)
  const monday = addDays(startOfWeek(today), offset * 7)
  const days = [0, 1, 2, 3, 4, 5, 6].map((index) => addDays(monday, index))
  const posts = data.bundle.posts.filter((post) => matchesAccount(post.account, ui.filter))
  const eyebrow = offset === 1 ? 'Semana que vem' : offset === 0 ? 'Esta semana' : 'Semana'
  const sunday = days[6]

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>Semana {dayNumber(monday)}–{dayNumber(sunday)} {['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(sunday.slice(5, 7)) - 1]}</h1>
          <div className="sub">Tudo pronto com uma semana de antecedência.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="btn" onClick={() => setOffset(offset - 1)} aria-label="Semana anterior"><Icon name="chevronL" /></button>
          <button type="button" className="btn" onClick={() => setOffset(0)}>Esta semana</button>
          <button type="button" className="btn" onClick={() => setOffset(offset + 1)} aria-label="Próxima semana"><Icon name="chevron" /></button>
          <button type="button" className="btn pri" onClick={() => ui.openPost(null, monday)}><Icon name="plus" /> Novo conteúdo</button>
        </div>
      </div>
      <div className="legend">
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginRight: 4 }}>Status:</span>
        {STATUSES.map((status) => <span key={status.id} className={`st ${status.cls}`}>{status.label}</span>)}
      </div>
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
    </>
  )
}

function showAttach(post: Post): boolean {
  const title = post.title.trim()
  if (post.cover_url) return false
  if (post.format === 'stories' || post.format === 'post_leve') return false
  if (/^a definir$/i.test(title) || /^tema a definir$/i.test(title)) return false
  return true
}

function Lane({ account, date, posts, weekend }: { account: 'escola' | 'missao'; date: string; posts: Post[]; weekend: boolean }) {
  const ui = useUi()
  const data = useData()
  const list = posts.filter((post) => post.account === account && post.scheduled_date === date)
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
        const showBox = Boolean(post.cover_url) || showAttach(post)
        return (
          <div key={post.id} className={`pc ${account === 'escola' ? 'mj' : 'mi'} ${alert ? 'warn' : ''}`}>
            <div className="ty">
              <Icon name={post.format === 'carrossel' ? 'carousel' : post.format === 'stories' ? 'story' : post.format === 'post_leve' ? 'star' : 'reel'} />
              {label}
              <EditButton onClick={() => ui.openPost(post)} />
            </div>
            {showBox && (
              <Cover post={post} onFile={(file) => void data.setCover(post.id, file)} />
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
