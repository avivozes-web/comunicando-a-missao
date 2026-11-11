import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { daysBetween, dm } from '@/lib/dates'
import { todayISO } from '@/lib/dates'
import { fmt, pct, signed } from '@/lib/format'
import type { GoalConfig, GoalDay } from '@/lib/types'

const TABS = ['Meta', 'Seguidores', 'Calendário', 'Ranking', 'Funil', 'Ideias', 'Traga 1', 'Plano']

export function Mil() {
  const data = useData()
  const ui = useUi()
  const [tab, setTab] = useState('Meta')
  const [traga, setTraga] = useState(data.bundle.goal_config?.notes?.traga1 || '')
  const config = ui.filter === 'missao' ? null : data.bundle.goal_config
  const days = data.bundle.goal_days.filter((day) => day.account === 'escola')
  const today = todayISO()

  return (
    <div className="mil">
      <div className="top">
        <div>
          <div className="eyebrow">Acompanhar</div>
          <h1>Rumo aos Mil</h1>
          <div className="sub">
            {config ? `De ${fmt(config.base)} (${dm(config.base_data)}) a ${fmt(config.alvo)} até ${dm(config.data_alvo)} · @missaojosue.educacao` : 'Painel da meta de seguidores da Escola.'}
          </div>
        </div>
      </div>
      <p className="src" style={{ margin: '-8px 0 12px' }}>Números do controle diário e dos snapshots. Se um dia não foi lido, o campo fica em branco.</p>
      {!config ? (
        <div className="card secbox"><div className="empty">Ainda não há painel Rumo aos Mil desta conta.</div></div>
      ) : (
        <>
          <div className="rtabs">
            {TABS.map((item) => <button type="button" key={item} className={tab === item ? 'on' : ''} onClick={() => setTab(item)}>{item}</button>)}
          </div>
          {tab === 'Meta' && <Meta config={config} days={days} today={today} reports={data.bundle.reports} />}
          {tab === 'Seguidores' && <Daily days={days} />}
          {tab === 'Calendário' && <Ramp config={config} title="Semanas do plano" />}
          {tab === 'Ranking' && <Ranking config={config} />}
          {tab === 'Funil' && <Funil config={config} />}
          {tab === 'Ideias' && <GoalIdeas />}
          {tab === 'Traga 1' && (
            <div className="card secbox">
              <h3>Campanha Traga 1 para 2027</h3>
              <p className="src">Texto da equipe. Ainda não há um roteiro gravado nos dados de hoje.</p>
              <textarea className="inp" value={traga} onChange={(event) => setTraga(event.target.value)} placeholder="A Isabelle ainda não escreveu o roteiro da campanha." />
              <button type="button" className="btn pri" onClick={() => void data.saveTraga(traga)}>Salvar</button>
            </div>
          )}
          {tab === 'Plano' && <Ramp config={config} title="Plano até 31/12" />}
        </>
      )}
    </div>
  )
}

function Meta({ config, days, today, reports }: { config: GoalConfig; days: GoalDay[]; today: string; reports: { payload: Record<string, unknown> | null; period_end: string }[] }) {
  const row = [...days].reverse().find((day) => day.day <= today) || null
  const total = row?.total ?? null
  const gained = total === null ? null : total - config.base
  const goalGap = config.alvo - config.base
  const progress = gained === null || goalGap === 0 ? null : gained / goalGap
  const left = total === null ? null : config.alvo - total
  const daysLeft = Math.max(daysBetween(today, config.data_alvo), 0)
  const perDay = left === null || daysLeft === 0 ? null : left / daysLeft
  const week = config.rampa.find((item) => today >= item[0] && today <= item[1])
  const before = week ? [...days].reverse().find((day) => day.day < week[0]) : null
  const weekGain = week && total !== null && before?.total !== null && before?.total !== undefined ? total - before.total : null
  const weekLeft = week && weekGain !== null ? week[2] - weekGain : null
  const weekDays = week ? daysBetween(today, week[1]) : null
  const weekPct = week && weekGain !== null ? Math.max(0, Math.min(1, weekGain / week[2])) : 0
  const chart = days.map((day) => ({
    dia: dm(day.day),
    real: day.total,
    plano: planoAt(day.day, config),
  }))
  const latestReport = [...reports].filter((item) => item.payload).sort((a, b) => b.period_end.localeCompare(a.period_end))[0]
  const funil = latestReport?.payload?.funil as { toques_link_bio?: number } | undefined
  const insight30 = [...config.link_insights].reverse().find((item) => (item.periodo || '').includes('30'))

  return (
    <>
      <div className="banner">
        <div>
          <div className="lb">Meta de hoje · {dm(today)}{week ? ` · semana ${dm(week[0])}–${dm(week[1])}` : ''}</div>
          <div className="big">{row?.meta_dia === null || row?.meta_dia === undefined ? '—' : `+${fmt(row.meta_dia)}`}</div>
        </div>
        <div className="tx">
          Hoje: saldo {row?.saldo === null || row?.saldo === undefined ? '—' : signed(row.saldo)}
          {row?.status && <span className="sttag">{row.status === 'em andamento' ? 'dia em andamento' : row.status}</span>}
          <small>{week ? `Semana: +${fmt(week[2])} (chegar a ${fmt(week[3])}) · foco: ${week[4]}` : 'Sem rampa para esta data.'}</small>
        </div>
      </div>
      <div className="card thermo">
        <div className="tube"><i style={{ height: `${weekPct * 100}%` }} /></div>
        <div style={{ flex: 1 }}>
          <div className="lb">Termômetro da semana{week ? ` · ${dm(week[0])}–${dm(week[1])}` : ''}</div>
          <div className="v">{weekGain === null ? '—' : weekGain === 0 ? '+0' : signed(weekGain)} <small>de {week ? signed(week[2]) : '—'}</small></div>
          <div className="faltam">{weekLeft === null ? '—' : `faltam ${fmt(weekLeft)} · ${weekDays ?? '—'} dias restantes depois de hoje`}</div>
          <div className="bar"><i style={{ width: `${weekPct * 100}%` }} /></div>
          <div className="src" style={{ marginTop: 6 }}>{pct((weekPct || 0) * 100, 0)} · foco: {week?.[4] || '—'}</div>
        </div>
      </div>
      <div className="card ringbox">
        <Ring value={total} progress={progress} />
        <div style={{ flex: 1 }}>
          <div className="k">{progress === null ? '—' : `${pct(progress * 100, 1)} da meta de +${fmt(goalGap)} · faltam ${fmt(left)} seguidores`}</div>
          <div className="checks">
            {config.checkpoints.map((point) => {
              const real = days.find((day) => day.day === point.data)?.total
              return <span key={point.data}>{dm(point.data)} · ≈{fmt(point.valor)}{real !== undefined ? <span style={{ color: 'var(--muted)', fontWeight: 600 }}> (real: {fmt(real)})</span> : null}</span>
            })}
          </div>
          <div className="src" style={{ marginTop: 10 }}>Progresso = (total − {fmt(config.base)}) ÷ {fmt(goalGap)}. Os marcos são os do plano.</div>
        </div>
      </div>
      <div className="r4">
        <div className="card"><div className="v or">{perDay === null ? '—' : `≈${fmt(Math.round(perDay))}`}</div><div className="k">necessários por dia</div></div>
        <div className="card"><div className="v or">{perDay === null ? '—' : `≈${fmt(Math.round(perDay * 7))}`}</div><div className="k">necessários por semana</div></div>
        <div className="card"><div className="v">{fmt(daysLeft)}</div><div className="k">dias até {dm(config.data_alvo)}</div></div>
        <div className="card"><div className="v">{gained === null ? '—' : signed(gained)}</div><div className="k">ganhos desde {dm(config.base_data)} (meta: +{fmt(goalGap)})</div></div>
      </div>
      <div className="card secbox">
        <h3>Projeção × real</h3>
        <p className="src">Linha laranja: snapshots. Linha tracejada: meta do plano.</p>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={chart}>
              <CartesianGrid stroke="#EEF0F3" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9AA1AC' }} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: '#9AA1AC' }} domain={[150, 1000]} />
              <Tooltip />
              <Line type="monotone" dataKey="plano" stroke="#8FA3C8" strokeDasharray="5 4" dot={false} name="Plano" />
              <Line type="monotone" dataKey="real" stroke="#F16623" strokeWidth={2.5} dot={false} name="Real" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card secbox">
        <h3>Toques no link da bio</h3>
        <p>
          No relatório mais recente: <b>{funil?.toques_link_bio ?? '—'}</b> toque(s) no link da bio.
          {insight30 ? <> Último dado de {insight30.periodo}: <b>{insight30.toques ?? '—'}</b> toques{insight30.lido_em ? `, lido em ${insight30.lido_em}` : ''}.</> : ' Sem leitura de 30 dias.'}
          {' '}Conversas no WhatsApp e matrículas 2027: ainda sem número neste painel.
        </p>
        <p className="src">O KPI oficial é o do Instagram Insights. Cliques de encurtador não entram aqui.</p>
      </div>
    </>
  )
}

function Ring({ value, progress }: { value: number | null; progress: number | null }) {
  const radius = 54
  const circ = 2 * Math.PI * radius
  const dash = progress === null ? 0 : Math.max(0, Math.min(1, progress)) * circ
  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r={radius} stroke="#EEF0F3" strokeWidth="12" fill="none" />
      <circle cx="80" cy="80" r={radius} stroke="#F16623" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${circ - dash}`} transform="rotate(-90 80 80)" />
      <text x="80" y="76" textAnchor="middle" fontSize="28" fontWeight="700" fill="#0A1F3D">{value ?? '—'}</text>
      <text x="80" y="96" textAnchor="middle" fontSize="11" fontWeight="600" fill="#6B7280">seguidores</text>
    </svg>
  )
}

function Daily({ days }: { days: GoalDay[] }) {
  const rows = [...days].reverse()
  return (
    <div className="card secbox">
      <h3>Controle diário</h3>
      <table className="tbl">
        <thead><tr><th>Dia</th><th className="n">Total</th><th className="n">Entraram</th><th className="n">Saíram</th><th className="n">Saldo</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((day) => (
            <tr key={day.day}>
              <td>{dm(day.day)}</td>
              <td className="n">{fmt(day.total)}</td>
              <td className="n">{fmt(day.entraram)}</td>
              <td className="n">{fmt(day.sairam)}</td>
              <td className="n">{signed(day.saldo)}</td>
              <td>{day.status || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ramp({ config, title }: { config: GoalConfig; title: string }) {
  return (
    <div className="card secbox">
      <h3>{title}</h3>
      <p className="src">Cada linha é uma semana do plano, de terça a segunda. Não é um calendário de datas soltas.</p>
      <table className="tbl">
        <thead><tr><th>Semana</th><th className="n">Novos</th><th className="n">Acumulado</th><th>Foco</th></tr></thead>
        <tbody>
          {config.rampa.map((week) => (
            <tr key={week[0]}>
              <td>{dm(week[0])}–{dm(week[1])}</td>
              <td className="n">+{fmt(week[2])}</td>
              <td className="n">{fmt(week[3])}</td>
              <td>{week[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Ranking({ config }: { config: GoalConfig }) {
  const rows = [...config.posts_metricas].sort((a, b) => (b.engajamento || 0) - (a.engajamento || 0))
  if (rows.length === 0) return <div className="card secbox"><div className="empty">Sem posts medidos.</div></div>
  return (
    <div className="card secbox">
      <h3>Ranking dos posts</h3>
      <table className="tbl">
        <thead><tr><th>Post</th><th>Data</th><th className="n">Curtidas</th><th className="n">Comentários</th><th className="n">Engajamento</th></tr></thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.url || post.titulo}>
              <td>{post.url ? <a href={post.url} target="_blank" rel="noreferrer">{post.titulo || post.url}</a> : post.titulo || '—'}</td>
              <td>{post.data || '—'}</td>
              <td className="n">{fmt(post.curtidas)}</td>
              <td className="n">{fmt(post.comentarios)}</td>
              <td className="n">{fmt(post.engajamento)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Funil({ config }: { config: GoalConfig }) {
  const steps = config.funil?.etapas || []
  if (steps.length === 0) return <div className="card secbox"><div className="empty">Sem funil carregado.</div></div>
  return (
    <div className="card secbox">
      <h3>Funil</h3>
      {steps.map((step) => (
        <div className="mv" key={step.k}>
          <span className="at">{step.l}</span>
          <span className="dt">{step.v === null || step.v === undefined ? '—' : fmt(step.v)}</span>
        </div>
      ))}
    </div>
  )
}

function GoalIdeas() {
  const data = useData()
  const ideas = data.bundle.ideas.filter((idea) => idea.account === 'escola' && idea.status !== 'rejeitada').slice(0, 6)
  return (
    <div className="card secbox">
      <h3>Ideias da Escola</h3>
      {ideas.length === 0 && <div className="empty">Nenhuma ideia da Escola no banco.</div>}
      {ideas.map((idea) => <div className="mv" key={idea.id}><span className="at">{idea.title}</span><span className="dt">{idea.status}</span></div>)}
    </div>
  )
}

function planoAt(day: string, config: GoalConfig): number | null {
  if (day <= config.base_data) return config.base
  let prevDate = config.base_data
  let prevValue = config.base
  for (const week of config.rampa) {
    if (day <= week[1]) {
      const span = Math.max(daysBetween(prevDate, week[1]), 1)
      const into = daysBetween(prevDate, day)
      return Math.round(prevValue + ((week[3] - prevValue) * into) / span)
    }
    prevDate = week[1]
    prevValue = week[3]
  }
  return config.rampa.length ? config.rampa[config.rampa.length - 1][3] : null
}
