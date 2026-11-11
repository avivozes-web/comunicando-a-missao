import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Icon } from './Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { todayISO } from '@/lib/dates'
import {
  ACCOUNTS,
  DEFAULT_ASSIGNEES,
  FORMATS,
  STATUSES,
  TEAM,
  type Account,
  type Assignees,
  type CheckItem,
  type Idea,
  type Post,
  type PostFormat,
  type PostStatus,
  type Task,
  type TaskStep,
} from '@/lib/types'
import { mediaUrl, uid } from '@/lib/utils'

const STEPS = ['Conta', 'Formato', 'Tema', 'Data', 'Quem faz', 'Confirmar'] as const

export function Editors() {
  const ui = useUi()
  return (
    <>
      <PostEditor />
      <IdeaEditor />
      <TaskEditor />
      <Dialog open={ui.audio} onOpenChange={ui.setAudio}>
        <DialogContent>
          <div className="mh5">
            <div>
              <div className="eb">Tarefas</div>
              <DialogTitle className="dlg-title">Ditar o dia por áudio</DialogTitle>
              <DialogDescription className="dlg-desc">O microfone ainda não está ligado. Por enquanto, escreva a tarefa.</DialogDescription>
            </div>
            <button type="button" className="xb" onClick={() => ui.setAudio(false)} aria-label="Fechar"><Icon name="x" /></button>
          </div>
          <div className="mf">
            <span />
            <button type="button" className="nx" onClick={() => { ui.setAudio(false); ui.openTask(null, todayISO()) }}>
              <Icon name="plus" /> Tarefa
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PostEditor() {
  const ui = useUi()
  const data = useData()
  const open = ui.post !== null
  const editing = ui.post && ui.post !== 'new' ? ui.post : null
  const [step, setStep] = useState(0)
  const [account, setAccount] = useState<Account>('escola')
  const [format, setFormat] = useState<PostFormat>('reel')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [aspect, setAspect] = useState('')
  const [legenda, setLegenda] = useState('')
  const [drive, setDrive] = useState('')
  const [note, setNote] = useState('')
  const [dateTag, setDateTag] = useState('')
  const [status, setStatus] = useState<PostStatus>('ideia')
  const [updatedBy, setUpdatedBy] = useState('Isabelle')
  const [checks, setChecks] = useState<CheckItem[]>([])
  const [checkText, setCheckText] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [who, setWho] = useState<Assignees>(DEFAULT_ASSIGNEES)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(0)
    if (editing) {
      setAccount(editing.account)
      setFormat(editing.format)
      setTitle(editing.title)
      setDate(editing.scheduled_date)
      setTime(editing.scheduled_time?.slice(0, 5) || '')
      setAspect(editing.aspect || '')
      setLegenda(editing.legenda || '')
      setDrive(editing.drive_url || '')
      setNote(editing.note || '')
      setDateTag(editing.date_tag || '')
      setStatus(editing.status)
      setUpdatedBy(editing.updated_by || 'Isabelle')
      setChecks(editing.checklist || [])
      setCoverUrl(editing.cover_url)
    } else {
      setAccount('escola')
      setFormat('reel')
      setTitle('')
      setDate(ui.postDate || todayISO())
      setTime('')
      setAspect('')
      setLegenda('')
      setDrive('')
      setNote('')
      setDateTag('')
      setStatus('ideia')
      setUpdatedBy('Isabelle')
      setChecks([])
      setCoverUrl(null)
      setWho(DEFAULT_ASSIGNEES)
    }
  }, [open, editing, ui.postDate])

  function build(): Post {
    return {
      id: editing?.id || uid(),
      account,
      title: title.trim() || 'A definir',
      format,
      status,
      scheduled_date: date,
      scheduled_time: time || null,
      aspect: aspect.trim() || null,
      legenda: legenda.trim() || null,
      cover_url: coverUrl,
      drive_url: drive.trim() || null,
      checklist: checks,
      note: note.trim() || null,
      date_tag: dateTag.trim() || null,
      updated_by: updatedBy,
    }
  }

  async function save() {
    setBusy(true)
    try {
      await data.savePost(build(), editing ? undefined : who)
      ui.closePost()
      ui.toast('Conteúdo salvo.')
    } catch {
      ui.toast('Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!editing) return
    if (!window.confirm('Apagar este conteúdo? As tarefas geradas por ele também saem.')) return
    await data.removePost(editing.id)
    ui.closePost()
  }

  const stepLabel = editing ? 'Editar conteúdo' : `Novo conteúdo · passo ${step + 1} de 6`

  return (
    <Dialog open={open} onOpenChange={(value) => !value && ui.closePost()}>
      <DialogContent>
        <div className="mh5">
          <div>
            <div className="eb">{stepLabel}</div>
            <DialogTitle className="dlg-title">{editing ? editing.title : STEPS[step]}</DialogTitle>
            <DialogDescription className="dlg-desc">
              {editing ? 'Título, data, legenda, capa e status. A equipe inteira edita.' : 'Conta, formato, tema, data e quem faz cada etapa.'}
            </DialogDescription>
          </div>
          <button type="button" className="xb" onClick={ui.closePost} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        {!editing && (
          <div className="steps">
            {STEPS.map((label, index) => (
              <span key={label} style={{ display: 'contents' }}>
                {index > 0 && <div className={`sl ${index <= step ? 'done' : ''}`} />}
                <div className={`sp ${index < step ? 'done' : ''} ${index === step ? 'cur' : ''}`}>
                  <span className="n">{index < step ? <Icon name="check" /> : index + 1}</span>
                  <div>{label}</div>
                </div>
              </span>
            ))}
          </div>
        )}
        <div className="mb">
          {(editing || step === 0) && (
            <div className="choice">
              {ACCOUNTS.map((item) => (
                <button type="button" key={item.id} className={`choice-btn ${account === item.id ? 'on' : ''}`} onClick={() => setAccount(item.id)}>
                  <i className={`dot ${item.id === 'escola' ? 'd-mj' : 'd-mi'}`} />
                  {item.name}
                  <small>{item.handle}</small>
                </button>
              ))}
            </div>
          )}
          {(editing || step === 1) && (
            <div className="choice">
              {FORMATS.map((item) => (
                <button type="button" key={item.id} className={`choice-btn ${format === item.id ? 'on' : ''}`} onClick={() => setFormat(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {(editing || step === 2) && (
            <label className="field">Tema
              <input className="inp" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Título do post" />
            </label>
          )}
          {(editing || step === 3) && (
            <div className="form-grid">
              <label className="field">Data
                <input className="inp" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
              <label className="field">Hora
                <input className="inp" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
              {editing && (
                <label className="field">Proporção
                  <input className="inp" value={aspect} onChange={(event) => setAspect(event.target.value)} placeholder="4:5" />
                </label>
              )}
            </div>
          )}
          {!editing && step === 4 && (
            <div className="flow">
              {(Object.keys(who) as TaskStep[]).map((key, index) => (
                <div className="fr" key={key}>
                  <div className="num">{index + 1}</div>
                  <div />
                  <div className="who"><b>{{ gravar: 'Gravar', editar: 'Editar', aprovar: 'Aprovar', postar: 'Postar' }[key]}</b><span>antes de sair</span></div>
                  <select className="sel" value={who[key]} onChange={(event) => setWho({ ...who, [key]: event.target.value })}>
                    {TEAM.map((name) => <option key={name}>{name}</option>)}
                    <option>Lídia + Isabelle</option>
                    <option>Isabelle + Richard</option>
                    <option>Isabelle · Bezalel · Lídia</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {(editing || step === 5) && (
            <div className="stack">
              <label className="field">Legenda
                <textarea className="inp" value={legenda} onChange={(event) => setLegenda(event.target.value)} placeholder="Texto que vai no Instagram" />
              </label>
              <label className="field">Link do Drive
                <input className="inp" value={drive} onChange={(event) => setDrive(event.target.value)} placeholder="https://drive.google.com/..." />
              </label>
              <div className="form-grid">
                <label className="field">Nota
                  <input className="inp" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Vídeo da semana" />
                </label>
                <label className="field">Data do ano
                  <input className="inp" value={dateTag} onChange={(event) => setDateTag(event.target.value)} placeholder="Consciência Negra" />
                </label>
              </div>
              {editing && (
                <>
                  <div className="field">Status
                    <div className="status-row">
                      {STATUSES.map((item) => (
                        <button type="button" key={item.id} className={`st ${item.cls} ${status === item.id ? 'on' : ''}`} onClick={() => setStatus(item.id)}>{item.label}</button>
                      ))}
                      <button type="button" className="btn-rec" onClick={() => setStatus('gravado')}>
                        <Icon name="reel" /> Gravado, falta editar
                      </button>
                    </div>
                  </div>
                  <label className="field">Atualizado por
                    <select className="sel" value={updatedBy} onChange={(event) => setUpdatedBy(event.target.value)}>
                      {TEAM.map((name) => <option key={name}>{name}</option>)}
                    </select>
                  </label>
                  <div className="field">Checklist
                    {checks.map((item, index) => (
                      <label key={index} className="ck" style={{ marginBottom: 6 }}>
                        <input type="checkbox" checked={item.done} onChange={() => setChecks(checks.map((check, checkIndex) => checkIndex === index ? { ...check, done: !check.done } : check))} />
                        <input className="inp" style={{ margin: 0 }} value={item.label} onChange={(event) => setChecks(checks.map((check, checkIndex) => checkIndex === index ? { ...check, label: event.target.value } : check))} />
                        <button type="button" className="ed" onClick={() => setChecks(checks.filter((_, checkIndex) => checkIndex !== index))}><Icon name="x" /></button>
                      </label>
                    ))}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="inp" style={{ margin: 0 }} value={checkText} onChange={(event) => setCheckText(event.target.value)} placeholder="Novo item" />
                      <button type="button" className="btn" onClick={() => { if (!checkText.trim()) return; setChecks([...checks, { label: checkText.trim(), done: false }]); setCheckText('') }}>Adicionar</button>
                    </div>
                  </div>
                  <div className="field">Capa
                    <div className="cover-preview-row">
                      {coverUrl ? <img src={mediaUrl(coverUrl) || ''} alt="Capa atual" /> : <span className="src">Sem capa ainda.</span>}
                      <label className="btn">
                        Trocar capa
                        <input type="file" accept="image/*" hidden onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (!file || !editing) return
                          setBusy(true)
                          void data.setCover(editing.id, file).then((url) => {
                            setCoverUrl(url)
                            ui.toast('Capa atualizada.')
                          }).catch(() => ui.toast('Não foi possível enviar a capa.')).finally(() => setBusy(false))
                        }} />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div className="mf">
          <div className="hint">{editing ? 'A capa também pode ser trocada pelo celular.' : 'As tarefas gravar, editar, aprovar e postar nascem sozinhas.'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {editing && <button type="button" className="btn" onClick={() => void remove()}>Apagar</button>}
            {!editing && step > 0 && <button type="button" className="btn" onClick={() => setStep(step - 1)}>Voltar</button>}
            {!editing && step < 5 && <button type="button" className="nx" onClick={() => setStep(step + 1)}>Continuar <Icon name="chevron" /></button>}
            {(editing || step === 5) && <button type="button" className="nx" disabled={busy} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar'}</button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function IdeaEditor() {
  const ui = useUi()
  const data = useData()
  const editing = ui.idea && ui.idea !== 'new' ? ui.idea : null
  const open = ui.idea !== null
  const [draft, setDraft] = useState<Idea | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(editing || {
      id: uid(),
      account: 'escola',
      title: '',
      body: '',
      format: 'carrossel',
      tags: [],
      status: 'ideia',
      suggested_date: null,
      heart: false,
      updated_by: 'Isabelle',
    })
  }, [open, editing])

  if (!draft) return null
  async function save(next: Idea) {
    await data.saveIdea(next)
    ui.closeIdea()
    ui.toast('Ideia salva.')
  }
  return (
    <Dialog open={open} onOpenChange={(value) => !value && ui.closeIdea()}>
      <DialogContent>
        <div className="mh5">
          <div>
            <div className="eb">Banco de ideias</div>
            <DialogTitle className="dlg-title">{editing ? 'Editar ideia' : 'Nova ideia'}</DialogTitle>
            <DialogDescription className="dlg-desc">Ideia, aprovada ou publicada. O que não for aprovado sai do banco.</DialogDescription>
          </div>
          <button type="button" className="xb" onClick={ui.closeIdea} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="mb stack">
          <label className="field">Título
            <input className="inp" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <label className="field">Texto
            <textarea className="inp" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
          </label>
          <div className="form-grid">
            <label className="field">Conta
              <select className="sel" value={draft.account} onChange={(event) => setDraft({ ...draft, account: event.target.value as Account })}>
                {ACCOUNTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="field">Formato
              <select className="sel" value={draft.format} onChange={(event) => setDraft({ ...draft, format: event.target.value })}>
                {FORMATS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="field">Etiquetas
              <input className="inp" value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="FIMC, Portal" />
            </label>
            <label className="field">Data sugerida
              <input className="inp" type="date" value={draft.suggested_date || ''} onChange={(event) => setDraft({ ...draft, suggested_date: event.target.value || null })} />
            </label>
          </div>
          <div className="status-row">
            <button type="button" className={`st s-ideia ${draft.status === 'ideia' ? 'on' : ''}`} onClick={() => setDraft({ ...draft, status: 'ideia' })}>Ideia</button>
            <button type="button" className={`st s-aprovada ${draft.status === 'aprovada' ? 'on' : ''}`} onClick={() => setDraft({ ...draft, status: 'aprovada' })}>Aprovada</button>
            <button type="button" className={`st s-publicada ${draft.status === 'publicada' ? 'on' : ''}`} onClick={() => setDraft({ ...draft, status: 'publicada' })}>Publicada</button>
          </div>
        </div>
        <div className="mf">
          {editing ? <button type="button" className="btn" onClick={() => { void data.removeIdea(editing.id); ui.closeIdea() }}>Tirar do banco</button> : <span />}
          <button type="button" className="nx" onClick={() => void save(draft)}>Salvar</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TaskEditor() {
  const ui = useUi()
  const data = useData()
  const editing = ui.task && ui.task !== 'new' ? ui.task : null
  const open = ui.task !== null
  const [draft, setDraft] = useState<Task | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(editing || {
      id: uid(),
      title: '',
      assignee: 'Isabelle',
      account: null,
      due_date: ui.taskDate || todayISO(),
      done: false,
      kind: 'adhoc',
      rolled_from: null,
      origin_date: ui.taskDate || todayISO(),
      post_id: null,
      fixed_task_id: null,
      step: null,
      badge: null,
      sort: 60,
    })
  }, [open, editing, ui.taskDate])

  if (!draft) return null
  return (
    <Dialog open={open} onOpenChange={(value) => !value && ui.closeTask()}>
      <DialogContent>
        <div className="mh5">
          <div>
            <div className="eb">Tarefas</div>
            <DialogTitle className="dlg-title">{editing ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription className="dlg-desc">Se ficar em aberto, ela passa para o dia seguinte.</DialogDescription>
          </div>
          <button type="button" className="xb" onClick={ui.closeTask} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="mb stack">
          <label className="field">Tarefa
            <input className="inp" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          </label>
          <div className="form-grid">
            <label className="field">Quem
              <input className="inp" value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })} />
            </label>
            <label className="field">Data
              <input className="inp" type="date" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value, origin_date: draft.origin_date || event.target.value })} />
            </label>
            <label className="field">Conta
              <select className="sel" value={draft.account || ''} onChange={(event) => setDraft({ ...draft, account: (event.target.value || null) as Account | null })}>
                <option value="">As duas</option>
                {ACCOUNTS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="field">Tipo
              <select className="sel" value={draft.badge || ''} onChange={(event) => setDraft({ ...draft, badge: event.target.value || null })}>
                <option value="">Da rotina</option>
                <option value="eventual">Eventual</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mf">
          {editing ? <button type="button" className="btn" onClick={() => { void data.removeTask(editing.id); ui.closeTask() }}>Apagar</button> : <span />}
          <button type="button" className="nx" onClick={() => { void data.saveTask(draft); ui.closeTask() }}>Salvar</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
