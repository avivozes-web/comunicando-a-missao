import { useState, type FormEvent } from 'react'
import { Logos } from '@/components/Logos'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/context/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Preencha o e-mail e a senha.')
      return
    }
    setBusy(true)
    setError('')
    const message = await signIn(email, password)
    setBusy(false)
    if (message) setError(message)
  }

  return (
    <div className="login-screen">
      <div className="login-bg" />
      <div className="orb a" />
      <div className="orb b" />
      <div className="orb c" />
      <form className="login-stage" onSubmit={(event) => void submit(event)}>
        <div className="brandline">
          <Logos />
          <h1>Comunicando a Missão</h1>
          <div className="sub">A central da mídia da Escola e da Missão. Agenda, tarefas, ideias e análises, num lugar só.</div>
          <div className="icos">
            <span className="ico-c navy"><Icon name="book" /></span>
            <span className="ico-c navy"><Icon name="cap" /></span>
            <span className="ico-c navy"><Icon name="globe" /></span>
            <span className="ico-c navy"><Icon name="compass" /></span>
          </div>
        </div>
        <div className="box">
          <h2>Entrar</h2>
          <div className="sub">Login único da equipe. Só quem tem a senha entra.</div>
          <label className="lab" htmlFor="email">E-mail da equipe</label>
          <input id="email" className="inp" type="email" autoComplete="username" placeholder="e-mail da equipe" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label className="lab" htmlFor="senha">Senha</label>
          <input id="senha" className="inp" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <div className="err">{error}</div>}
          <button className="login-go" type="submit" disabled={busy}>
            <Icon name="lock" /> {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <div className="note"><Icon name="lock" /> Um login só, para você e o Richard.</div>
        </div>
        <div className="login-foot">@missaojosue.educacao · @missaojosue.ofc</div>
      </form>
    </div>
  )
}
