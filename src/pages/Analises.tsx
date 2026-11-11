import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts'
import { Icon } from '@/components/Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { dm } from '@/lib/dates'
import { fmt, pct, signed } from '@/lib/format'
import { stripHtml } from '@/lib/utils'
import type { Account, FollowerEvent, Report } from '@/lib/types'

type Obj = Record<string, unknown>

const COLORS = ['#F16623', '#C9A227', '#A5B4FC', '#86EFAC']

export function Analises() {
  const data = useData()
  const ui = useUi()
  const [account, setAccount] = useState<Account>(ui.filter === 'missao' ? 'missao' : 'escola')
  const [mode, setMode] = useState<'semana' | 'mes' | 'datas'>('semana')
  const [from, setFrom] = useState('2026-10-26')
  const [to, setTo] = useState('2026-11-09')
  const [picked, setPicked] = useState<string | null>(null)
  const reports = data.bundle.reports.filter((report) => report.account === account)
  const selected = useMemo(() => choose(reports, mode, from, to, picked), [reports, mode, from, to, picked])
  const previous = useMemo(() => previousOf(reports, selected), [reports, selected])

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Acompanhar</div>
          <h1>Análises</h1>
          <div className="sub">{selected ? `${selected.title} · ${handle(account)}` : `${handle(account)} · sem relatório neste recorte`}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tabsacc">
            <button type="button" className={account === 'escola' ? 'on' : ''} onClick={() => { setAccount('escola'); setPicked(null) }}><i className="dot d-mj" />Escola</button>
            <button type="button" className={account === 'missao' ? 'on' : ''} onClick={() => { setAccount('missao'); setPicked(null) }}><i className="dot d-mi" />Missão</button>
          </div>
          <div className="filt">
            <button type="button" className={mode === 'semana' ? 'on' : ''} onClick={() => { setMode('semana'); setPicked(null) }}>Semana</button>
            <button type="button" className={mode === 'mes' ? 'on' : ''} onClick={() => { setMode('mes'); setPicked(null) }}>Mês</button>
            <button type="button" className={mode === 'datas' ? 'on' : ''} onClick={() => setMode('datas')}>Datas</button>
          </div>
        </div>
      </div>
      {mode === 'datas' && (
        <div className="date-range">
          <label>De <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPicked(null) }} /></label>
          <label>Até <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPicked(null) }} /></label>
        </div>
      )}
      <p className="src" style={{ margin: '-8px 0 14px' }}>
        {selected?.payload
          ? `Fonte: ${selected.subtitle || selected.title}${previous ? `, comparado com ${previous.title}` : ''}.`
          : 'A aba fica pronta, sem números, até haver um relatório com dados desta conta.'}
      </p>
      {!selected?.payload ? (
        <div className="card secbox"><div className="empty">Não há números para este recorte. Quando um relatório chegar, os gráficos aparecem aqui.</div></div>
      ) : (
        <ReportBody report={selected} previous={previous} events={data.bundle.events} />
      )}
      <div className="card pdfs">
        <h3>Relatórios em PDF</h3>
        <p className="src">A lista mostra o que está no banco. Sem arquivo, o botão avisa em vez de abrir um link vazio.</p>
        {reports.length === 0 && <div className="empty">Nenhum relatório desta conta.</div>}
        {reports.map((report) => (
          <div className="pr" key={report.id}>
            <div className="icn"><Icon name="book" /></div>
            <div style={{ flex: 1 }}>
              <b>{report.title}</b>
              <span>{report.subtitle || `${dm(report.period_start)} a ${dm(report.period_end)}`}</span>
            </div>
            <button type="button" className="btn" onClick={() => openReport(report, setPicked, uiToast)}>
              <Icon name="external" /> {report.pdf_url ? 'Abrir' : report.payload ? 'Ver' : 'Sem arquivo'}
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

function uiToast() {
  window.alert('Este relatório ainda não tem PDF anexado.')
}

function openReport(report: Report, pick: (id: string) => void, warn: () => void) {
  if (report.pdf_url) {
    window.open(report.pdf_url, '_blank', 'noopener,noreferrer')
    return
  }
  if (report.payload) {
    pick(report.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  warn()
}

function ReportBody({ report, previous, events }: { report: Report; previous: Report | null; events: FollowerEvent[] }) {
  const conta = obj(report.payload?.conta)
  const prev = obj(previous?.payload?.conta)
  const mix = record(conta?.vis_por_tipo_pct)
  const slices = Object.entries(mix).map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] }))
  const who = [
    { name: 'Não seguidores', value: num(conta, 'vis_nao_seguidores_pct') || 0, color: '#F16623' },
    { name: 'Seguidores', value: num(conta, 'vis_seguidores_pct') || 0, color: '#A5B4FC' },
  ].filter((item) => item.value > 0)
  const radar = radarRows(conta, prev)
  const conclusoes = strings(report.payload?.conclusoes)
  const aprendizados = strings(report.payload?.aprendizados)
  const aplicar = pairs(report.payload?.aplicar)
  const estrategia = obj(report.payload?.estrategia)
  const temas = [...strings(estrategia?.continuar), ...strings(estrategia?.parar)]
  const posts = list(report.payload?.posts)
  const analise = list(report.payload?.analise_posts)[0]
  const stories = obj(report.payload?.stories)
  const semana = obj(report.payload?.seguidores_semana)
  const horas = obj(conta?.horarios_semana)
  const horasRef = emptyHours(horas) ? obj(obj(previous?.payload?.conta)?.horarios_semana) : null
  const grade = horasRef || horas

  return (
    <>
      <div className="kpis">
        <Kpi label="Seguidores" value={fmt(num(conta, 'seguidores'))} note={semanaNote(semana)} />
        <Kpi label="Visualizações" value={fmt(num(conta, 'visualizacoes'))} delta={delta(num(conta, 'visualizacoes'), num(prev, 'visualizacoes'))} />
        <Kpi label="Contas alcançadas" value={fmt(num(conta, 'contas_visualizaram'))} delta={delta(num(conta, 'contas_visualizaram'), num(prev, 'contas_visualizaram'))} />
        <Kpi label="Interações" value={fmt(num(conta, 'interacoes'))} delta={delta(num(conta, 'interacoes'), num(prev, 'interacoes'))} />
        <Kpi label="Visitas ao perfil" value={fmt(num(conta, 'visitas_perfil'))} delta={delta(num(conta, 'visitas_perfil'), num(prev, 'visitas_perfil'))} />
        <Kpi label="Toques no link" value={fmt(num(conta, 'toques_links'))} delta={delta(num(conta, 'toques_links'), num(prev, 'toques_links'))} />
      </div>
      <div className="charts3">
        <div className="card card-dark">
          <h3>Visualizações por formato</h3>
          <p className="src">Mix do relatório selecionado.</p>
          {slices.length === 0 ? <p>—</p> : (
            <div className="donut-wrap">
              <PieChart width={148} height={148}>
                <Pie data={slices} dataKey="value" innerRadius={46} outerRadius={68} stroke="none" startAngle={90} endAngle={-270}>
                  {slices.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                </Pie>
              </PieChart>
              <div className="dleg">
                {slices.map((slice) => <span key={slice.name}><i style={{ background: slice.color }} />{slice.name}<b>{pct(slice.value)}</b></span>)}
              </div>
            </div>
          )}
        </div>
        <div className="card card-dark">
          <h3>Quem viu a conta</h3>
          <p className="src">{pct(num(conta, 'vis_seguidores_pct'))} seguidores · {pct(num(conta, 'vis_nao_seguidores_pct'))} não seguidores.</p>
          {who.length === 0 ? <p>—</p> : (
            <div className="donut-wrap">
              <PieChart width={148} height={148}>
                <Pie data={who} dataKey="value" innerRadius={46} outerRadius={68} stroke="none" startAngle={90} endAngle={-270}>
                  {who.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
                </Pie>
              </PieChart>
              <div className="dleg">
                {who.map((slice) => <span key={slice.name}><i style={{ background: slice.color }} />{slice.name}<b>{pct(slice.value)}</b></span>)}
              </div>
            </div>
          )}
        </div>
        <div className="card card-dark">
          <h3>Esta semana vs. a anterior</h3>
          <p className="src">Cada eixo é esta semana como % da anterior.</p>
          {radar.length === 0 ? <p className="src">Sem semana anterior para comparar.</p> : (
            <div className="radar-wrap">
              <RadarChart width={248} height={220} data={radar} outerRadius={72}>
                <PolarGrid stroke="rgba(255,255,255,.2)" />
                <PolarAngleAxis dataKey="k" tick={{ fill: '#E8E6F8', fontSize: 10 }} />
                <Radar dataKey="v" stroke="#F16623" fill="#F16623" fillOpacity={0.38} />
              </RadarChart>
            </div>
          )}
        </div>
      </div>
      <div className="card going card-mid">
        <div className="mark" />
        <div>
          <h3>Como está indo</h3>
          {conclusoes.length === 0 ? <p>—</p> : conclusoes.map((line) => <p key={line}>{stripHtml(line)}</p>)}
        </div>
      </div>
      {prev && (
        <div className="card secbox">
          <h3>Comparação com a semana anterior</h3>
          <p className="src">{report.title} contra {previous?.title}. Laranja = este relatório · navy = o anterior.</p>
          <div className="legmini"><span><i style={{ background: '#F16623' }} />Este</span><span><i style={{ background: '#0A1F3D' }} />Anterior</span></div>
          <div className="cbars">
            {compareRows(conta, prev).map((row) => (
              <div className="cbar" key={row.label}>
                <div className="cl">{row.label}</div>
                <div className="rows">
                  <div className="row"><i style={{ width: `${row.aPct}%`, background: '#F16623' }} /><span>{fmt(row.a)}</span></div>
                  <div className="row mut"><i style={{ width: `${row.bPct}%`, background: '#0A1F3D' }} /><span>{fmt(row.b)}</span></div>
                </div>
                <div className="cd"><Delta value={row.a !== null && row.b !== null ? row.a - row.b : null} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card secbox">
        <h3>Desempenho por post</h3>
        {posts.length === 0 ? <p>—</p> : (
          <table className="tbl">
            <thead>
              <tr><th>Post</th><th>Data</th><th className="n">Alcance</th><th className="n">Vis.</th><th className="n">Curtidas</th><th className="n">Coment.</th><th className="n">Salvam.</th><th className="n">Compart.</th><th className="n">Interações</th></tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={String(post.url || post.titulo)}>
                  <td><b>{String(post.titulo || post.nome || '—')}</b></td>
                  <td>{String(post.data || '—')}</td>
                  <td className="n">{fmt(asNum(post.contas))}</td>
                  <td className="n">{fmt(asNum(post.visualizacoes))}</td>
                  <td className="n">{fmt(asNum(post.curtidas))}</td>
                  <td className="n">{fmt(asNum(post.comentarios))}</td>
                  <td className="n">{fmt(asNum(post.salvamentos))}</td>
                  <td className="n">{fmt(asNum(post.compartilhamentos))}</td>
                  <td className="n">{fmt(asNum(post.interacoes))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {analise && (
          <div className="best">
            <h4>{String(analise.titulo || analise.nome || 'Post da semana')}</h4>
            {typeof analise.como === 'string' && <p>{stripHtml(analise.como)}</p>}
            {Array.isArray(analise.dados) && analise.dados.map((line) => <p key={String(line)} className="src">{stripHtml(String(line))}</p>)}
          </div>
        )}
      </div>
      <div className="cols2">
        <div className="card secbox" style={{ margin: 0 }}>
          <h3>Stories</h3>
          <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div><div className="k">Visualizações</div><div className="v">{fmt(num(stories, 'visualizacoes'))}</div></div>
            <div><div className="k">Alcance</div><div className="v">{fmt(num(stories, 'alcance'))}</div></div>
          </div>
          <p>{stories ? `${fmt(num(stories, 'quantidade'))} story(s) · ${fmt(num(stories, 'interacoes'))} interações · ${fmt(num(stories, 'curtidas'))} curtidas · ${fmt(num(stories, 'compartilhamentos'))} compartilhamentos · ${fmt(num(stories, 'respostas'))} respostas.` : '—'}</p>
          {typeof stories?.leitura === 'string' && <p className="src">{stripHtml(stories.leitura)}</p>}
        </div>
        <div className="card secbox" style={{ margin: 0 }}>
          <h3>Crescimento no relatório</h3>
          <p className="src">{typeof semana?.nota === 'string' ? stripHtml(semana.nota) : 'Sem nota de seguidores neste relatório.'}</p>
          <div className="daysg">
            {growthDays(semana, events, report.period_start).map((day) => (
              <div className="dg" key={day.label}>
                <div className="dd">{day.label}</div>
                <div className={`dv ${day.saldo !== null && day.saldo < 0 ? 'neg' : ''}`}>{day.saldo === null ? '—' : signed(day.saldo)}</div>
                <div className="dn">{day.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card secbox">
        <h3>Horários mais ativos</h3>
        {typeof horas?.leitura === 'string' && <p>{stripHtml(horas.leitura)}</p>}
        {horasRef && <p className="src">A grade abaixo é do relatório anterior, porque este não trouxe horário de pico.</p>}
        <Heat grade={grade} />
      </div>
      <div className="cols2">
        <div className="card secbox" style={{ margin: 0 }}>
          <h3>Temas que funcionaram</h3>
          {temas.length === 0 ? <p>—</p> : temas.map((item) => <div className="li" key={item}><div>{stripHtml(item)}</div></div>)}
        </div>
        <div className="card secbox" style={{ margin: 0 }}>
          <h3>Aprendizados</h3>
          {aprendizados.length === 0 ? <p>—</p> : aprendizados.map((item) => <div className="li" key={item}><div><Rich text={item} /></div></div>)}
        </div>
      </div>
      <div className="card secbox">
        <h3>Próximos passos</h3>
        {aplicar.length === 0 ? <p>—</p> : aplicar.map(([level, text]) => (
          <div className="li" key={text}>
            <span className={`pri ${priorityClass(level)}`}>{priorityLabel(level)}</span>
            <div><Rich text={text} /></div>
          </div>
        ))}
      </div>
    </>
  )
}

function Kpi({ label, value, note, delta: change }: { label: string; value: string; note?: string; delta?: number | null }) {
  return (
    <div className="card kpi card-dark">
      <div className="k">{label}</div>
      <div className="v glow">{value}</div>
      <div className="s">{note || (change === undefined ? '' : <Delta value={change ?? null} />)}{change !== undefined && change !== null ? ' vs semana anterior' : ''}</div>
    </div>
  )
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span>—</span>
  const cls = value > 0 ? 'delta-up' : value < 0 ? 'delta-dn' : 'delta-eq'
  return <span className={cls}>{signed(value)}</span>
}

function Heat({ grade }: { grade: Obj | null }) {
  const faixas = Array.isArray(grade?.faixas) ? grade.faixas.map(String) : []
  const dias = grade?.dias && typeof grade.dias === 'object' ? grade.dias as Record<string, unknown> : null
  if (!dias || faixas.length === 0) return <p className="src">Sem grade de horários neste relatório.</p>
  const values = Object.values(dias).flatMap((row) => Array.isArray(row) ? row.map(asNum).filter((n): n is number => n !== null) : [])
  const max = Math.max(1, ...values)
  return (
    <table className="tbl heat">
      <thead><tr><th />{faixas.map((faixa) => <th key={faixa} className="n">{faixa}</th>)}</tr></thead>
      <tbody>
        {Object.entries(dias).map(([day, row]) => (
          <tr key={day}>
            <th>{day.slice(0, 3)}</th>
            {Array.isArray(row) && row.map((cell, index) => {
              const value = asNum(cell)
              const alpha = value === null ? 0 : Math.max(0.12, value / max)
              return <td key={index} className="hcell" style={{ background: `rgba(241,102,35,${alpha})` }}><b>{value === null ? '—' : value}</b></td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Rich({ text }: { text: string }) {
  const clean = text.replace(/<\/?font[^>]*>/gi, '')
  const parts = clean.split(/(<\/?b>)/i)
  let bold = false
  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === '<b>') { bold = true; return null }
        if (part.toLowerCase() === '</b>') { bold = false; return null }
        const plain = stripHtml(part)
        return bold ? <b key={index}>{plain}</b> : <span key={index}>{plain}</span>
      })}
    </>
  )
}

function choose(reports: Report[], mode: 'semana' | 'mes' | 'datas', from: string, to: string, picked: string | null): Report | null {
  if (picked) return reports.find((report) => report.id === picked) || null
  const kind = mode === 'mes' ? 'mensal' : 'semanal'
  let rows = reports.filter((report) => (mode === 'datas' ? true : report.kind === kind))
  if (mode === 'datas') rows = rows.filter((report) => report.period_end >= from && report.period_start <= to)
  const withData = rows.filter((report) => report.payload)
  const pool = withData.length ? withData : rows
  return pool.sort((a, b) => b.period_end.localeCompare(a.period_end))[0] || null
}

function previousOf(reports: Report[], current: Report | null): Report | null {
  if (!current) return null
  return reports
    .filter((report) => report.kind === current.kind && report.payload && report.period_end < current.period_start)
    .sort((a, b) => b.period_end.localeCompare(a.period_end))[0] || null
}

function handle(account: Account) {
  return account === 'escola' ? '@missaojosue.educacao' : '@missaojosue.ofc'
}

function obj(value: unknown): Obj | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Obj : null
}
function list(value: unknown): Obj[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Obj[] : []
}
function num(source: Obj | null, key: string): number | null {
  const value = source?.[key]
  return typeof value === 'number' ? value : null
}
function asNum(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}
function record(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'))
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}
function pairs(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => Array.isArray(item) && item.length >= 2 ? [[String(item[0]), String(item[1])]] as [string, string][] : [])
}
function delta(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null
  return current - previous
}
function semanaNote(semana: Obj | null): string {
  if (!semana) return '—'
  const inicio = num(semana, 'inicio')
  const fim = num(semana, 'fim')
  const ganho = num(semana, 'ganho')
  const meta = num(semana, 'meta')
  return `${fmt(inicio)} → ${fmt(fim)} · saldo ${signed(ganho)} · meta ${signed(meta)}`
}
function radarRows(conta: Obj | null, prev: Obj | null) {
  if (!conta || !prev) return []
  const keys: [string, string][] = [['Vis.', 'visualizacoes'], ['Alcance', 'contas_visualizaram'], ['Interaç.', 'interacoes'], ['Engajadas', 'contas_engajamento'], ['Visitas', 'visitas_perfil'], ['Toques', 'toques_links']]
  return keys.map(([k, key]) => {
    const a = num(conta, key)
    const b = num(prev, key)
    const v = a === null || b === null || b === 0 ? 0 : Math.min(1, a / b)
    return { k, v }
  })
}
function compareRows(conta: Obj | null, prev: Obj | null) {
  const keys: [string, string][] = [['Visualizações', 'visualizacoes'], ['Contas alcançadas', 'contas_visualizaram'], ['Interações', 'interacoes'], ['Contas com engajamento', 'contas_engajamento'], ['Visitas ao perfil', 'visitas_perfil'], ['Toques no link da bio', 'toques_links']]
  return keys.map(([label, key]) => {
    const a = num(conta, key)
    const b = num(prev, key)
    const max = Math.max(a || 0, b || 0, 1)
    return { label, a, b, aPct: Math.round(((a || 0) / max) * 100), bPct: Math.round(((b || 0) / max) * 100) }
  })
}
function emptyHours(horas: Obj | null): boolean {
  const dias = horas?.dias
  return !dias || typeof dias !== 'object' || Object.keys(dias).length === 0
}
function growthDays(semana: Obj | null, events: FollowerEvent[], periodStart: string) {
  const rows = Array.isArray(semana?.dias) ? semana.dias : []
  const year = Number(periodStart.slice(0, 4))
  return rows.map((row) => {
    const label = Array.isArray(row) ? String(row[0]) : '—'
    const saldo = Array.isArray(row) ? asNum(row[1]) : null
    let note = Array.isArray(row) && row[2] ? String(row[2]) : ''
    const match = label.match(/(\d{1,2})\/(\d{1,2})/)
    const iso = match ? `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : null
    if (!note && iso) {
      const dayEvents = events.filter((event) => event.event_date === iso)
      if ((saldo || 0) < 0) note = dayEvents.filter((event) => event.kind === 'saiu' && event.arroba).map((event) => `saiu @${event.arroba}`).join(', ')
      if ((saldo || 0) > 0) {
        note = dayEvents.filter((event) => event.kind === 'entrou' && event.arroba).map((event) => {
          const back = events.some((other) => other.kind === 'saiu' && other.arroba === event.arroba && other.event_date < event.event_date)
          return `${back ? 'voltou' : 'entrou'} @${event.arroba}`
        }).join(', ')
      }
    }
    return { label, saldo, note: note || 'saldo' }
  })
}
function priorityLabel(raw: string): string {
  const text = stripHtml(raw).toLowerCase()
  if (text.includes('alta')) return 'Alta'
  if (text.includes('baixa')) return 'Baixa'
  if (text.includes('média') || text.includes('media')) return 'Média'
  return stripHtml(raw) || 'Nota'
}
function priorityClass(raw: string): string {
  const label = priorityLabel(raw)
  if (label === 'Alta') return 'alta'
  if (label === 'Baixa') return 'baixa'
  return 'media'
}
