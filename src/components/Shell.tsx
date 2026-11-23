import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { hardRefresh, onNewVersion } from '@/lib/pwa'
import { Logos } from './Logos'
import { Icon } from './Icon'
import { Editors } from './Editors'
import { useAuth } from '@/context/AuthContext'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { todayISO } from '@/lib/dates'
import { postAlert } from '@/lib/logic'
import { ACCOUNTS, type Filter } from '@/lib/types'
import { Tarefas } from '@/pages/Tarefas'
import { Semana } from '@/pages/Semana'
import { Ano } from '@/pages/Ano'
import { Ideias } from '@/pages/Ideias'
import { Biblioteca } from '@/pages/Biblioteca'
import { Analises } from '@/pages/Analises'
import { Seguidores } from '@/pages/Seguidores'
import { Mil } from '@/pages/Mil'

const NAV = [
  {
    sec: 'Planejar',
    items: [
      { to: '/tarefas', label: 'Tarefas', icon: 'list' },
      { to: '/semana', label: 'Semana', icon: 'calx' },
      { to: '/ano', label: 'Ano 2027', icon: 'grid' },
      { to: '/ideias', label: 'Fábrica de Conteúdo', icon: 'bulb' },
    ],
  },
  {
    sec: 'Biblioteca',
    items: [
      { to: '/biblioteca', label: 'Biblioteca', icon: 'reel' },
    ],
  },
  {
    sec: 'Acompanhar',
    items: [
      { to: '/analises', label: 'Análises', icon: 'chart' },
      { to: '/seguidores', label: 'Painel de seguidores', icon: 'users' },
      { to: '/mil', label: 'Rumo aos Mil', icon: 'target' },
    ],
  },
]

const TITLES: Record<string, string> = {
  '/': 'Tarefas',
  '/tarefas': 'Tarefas',
  '/semana': 'Semana',
  '/ano': 'Ano 2027',
  '/ideias': 'Fábrica de Conteúdo',
  '/biblioteca': 'Biblioteca',
  '/analises': 'Análises',
  '/seguidores': 'Seguidores',
  '/mil': 'Rumo aos Mil',
}

export function Shell() {
  const { signOut } = useAuth()
  const data = useData()
  const ui = useUi()
  const location = useLocation()
  const [bell, setBell] = useState(false)
  const [fresh, setFresh] = useState(false)
  useEffect(() => {
    const stop = onNewVersion(setFresh)
    return () => { stop() }
  }, [])
  const title = TITLES[location.pathname] || 'Tarefas'
  const today = todayISO()
  const alerts = data.bundle.posts.filter((post) => postAlert(post, today))

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <Logos />
          <div>
            <div className="bt">Comunicando</div>
            <div className="bs">a Missão</div>
          </div>
        </div>
        <button type="button" className="newbtn" onClick={() => ui.openPost(null)}>
          <Icon name="plus" /> Novo conteúdo
        </button>
        <div className="nav">
          {NAV.map((group) => (
            <div key={group.sec}>
              <div className="sec">{group.sec}</div>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'on' : '')}>
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div className="foot">
          <div className="team">
            <span className="tl">Equipe</span>
            <span className="av" style={{ background: '#5B6CF0' }}>E</span>
            <span className="av" style={{ background: '#0EA5A4' }}>R</span>
            <span className="av" style={{ background: '#E0518A' }}>B</span>
            <span className="av" style={{ background: '#F16623' }}>L</span>
          </div>
          <AccountSwitch filter={ui.filter} onChange={ui.setFilter} />
          <button type="button" className="logout" onClick={() => void hardRefresh()}>Atualizar app</button>
          <button type="button" className="logout" onClick={() => void signOut()}>Sair</button>
        </div>
      </aside>
      <div className="mobile-top topg only-mobile">
        <div className="hd">
          <div className="l">
            <Logos />
            <div>
              <div className="eb">Comunicando a Missão</div>
              <h1>{title}</h1>
            </div>
          </div>
          <button type="button" className="bell" onClick={() => setBell((value) => !value)} aria-label="Alertas">
            <Icon name="bell" />
          </button>
        </div>
      </div>
      {bell && (
        <div className="bell-panel only-mobile">
          {alerts.length === 0 && <p>Nenhum alerta de capa ou legenda.</p>}
          {alerts.map((post) => (
            <button type="button" key={post.id} onClick={() => { ui.openPost(post); setBell(false) }}>
              {post.title}
              <small>{postAlert(post, today)?.line}</small>
            </button>
          ))}
        </div>
      )}
      <main className="main">
        {fresh && (
          <div className="update-bar" role="status">
            <span>Nova versão da Central.</span>
            <button type="button" className="nx" onClick={() => void hardRefresh()}>Atualizar agora</button>
          </div>
        )}
        <PersonSwitch />
        {data.loading && <p className="src">Carregando a central…</p>}
        {data.error && <p className="err">{data.error}</p>}
        {!data.loading && (
          <Routes>
            <Route path="/" element={<Navigate to="/tarefas" replace />} />
            <Route path="/hoje" element={<Navigate to="/tarefas" replace />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/semana" element={<Semana />} />
            <Route path="/ano" element={<Ano />} />
            <Route path="/ideias" element={<Ideias />} />
            <Route path="/narrativa" element={<Navigate to="/tarefas" replace />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/reels" element={<Navigate to="/biblioteca" replace />} />
            <Route path="/carrosseis" element={<Navigate to="/biblioteca" replace />} />
            <Route path="/stories" element={<Navigate to="/biblioteca" replace />} />
            <Route path="/analises" element={<Analises />} />
            <Route path="/seguidores" element={<Seguidores />} />
            <Route path="/mil" element={<Mil />} />
          </Routes>
        )}
      </main>
      <nav className="mobile-tab only-mobile">
        <NavLink to="/tarefas" className={({ isActive }) => (isActive ? 'on' : '')}><Icon name="list" /><span>Tarefas</span></NavLink>
        <button type="button" className="fab" onClick={() => ui.openPost(null)} aria-label="Novo conteúdo"><Icon name="plus" /></button>
        <NavLink to="/semana" className={({ isActive }) => (isActive ? 'on' : '')}><Icon name="calx" /><span>Semana</span></NavLink>
        <button type="button" className={ui.more ? 'on' : ''} onClick={() => ui.setMore(true)}><Icon name="menu" /><span>Mais</span></button>
      </nav>
      {ui.more && (
        <div className="more-sheet only-mobile">
          <div className="more-card">
            <div className="bh"><h2>Mais</h2><button type="button" className="xb" onClick={() => ui.setMore(false)}><Icon name="x" /></button></div>
            {NAV.flatMap((group) => group.items).map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => ui.setMore(false)}>
                <Icon name={item.icon} /> {item.label}
              </NavLink>
            ))}
            <AccountSwitch filter={ui.filter} onChange={ui.setFilter} />
            <button type="button" className="logout" onClick={() => void hardRefresh()}>Atualizar app</button>
            <button type="button" className="logout" onClick={() => void signOut()}>Sair</button>
          </div>
        </div>
      )}
      <Editors />
      {ui.notice && <div className="toast">{ui.notice}</div>}
    </div>
  )
}

export function AccountSwitch({ filter, onChange }: { filter: Filter; onChange: (filter: Filter) => void }) {
  return (
    <div className="acc">
      <div className="lbl">Conta</div>
      <div className="seg">
        <button type="button" className={filter === 'todas' ? 'on' : ''} onClick={() => onChange('todas')}>
          <i className="dot" style={{ background: 'linear-gradient(90deg,#F16623 50%,#C9A227 50%)' }} />
          <span className="lab">Todas</span>
          <i className="radio" />
        </button>
        {ACCOUNTS.map((item) => (
          <button type="button" key={item.id} className={filter === item.id ? 'on' : ''} onClick={() => onChange(item.id)}>
            <i className={`dot ${item.id === 'escola' ? 'd-mj' : 'd-mi'}`} />
            <span className="lab">{item.name}<small>{item.handle}</small></span>
            <i className="radio" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function PersonSwitch() {
  const ui = useUi()
  return (
    <div className="person-switch" role="group" aria-label="Ver tarefas de">
      {(['Isabelle', 'Richard'] as const).map((name) => (
        <button type="button" key={name} className={ui.person === name ? 'on' : ''} onClick={() => ui.setPerson(name)}>{name}</button>
      ))}
    </div>
  )
}
