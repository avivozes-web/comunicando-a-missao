import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Icon } from './Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { asDate, todayISO } from '@/lib/dates'
import { aspectForFormat, defaultAssignees, defaultChecklist, isVideoFormat, needsCoverUpload, stepLabel as stepName } from '@/lib/logic'
import {
  ACCOUNTS,
  DEFAULT_ASSIGNEES,
  FORMATS,
  IDEA_COURSES,
  IDEA_FORMATS,
  IDEA_STAGES,
  STATUSES,
  ASSIGNEE_OPTIONS,
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
import { DayDictation } from './DayDictation'

const STEPS = ['Conta', 'Formato', 'Tema', 'Data', 'Quem faz', 'Confirmar'] as const

export function Editors() {
  const ui = useUi()
  return (
    <>
      <PostEditor />
      <IdeaEditor />
      <TaskEditor />
      <DayDictation />
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
  const [legenda, setLegenda] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [readyChecks, setReadyChecks] = useState<Post['ready_checks']>({})
  const [drive, setDrive] = useState('')
  const [note, setNote] = useState('')
  const [dateTag, setDateTag] = useState('')
  const [status, setStatus] = useState<PostStatus>('ideia')
  const [updatedBy, setUpdatedBy] = useState('Isabelle')
  const [checks, setChecks] = useState<CheckItem[]>([])
  const [checkText, setCheckText] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [who, setWho] = useState<Assignees>(DEFAULT_ASSIGNEES)
  const [factoryId, setFactoryId] = useState<string | null>(null)
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
      setLegenda(editing.legenda || '')
      setWhatsapp(editing.legenda_whatsapp || '')
      setReadyChecks(editing.ready_checks || {})
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
      setChecks(defaultChecklist('reel'))
      setLegenda('')
      setWhatsapp('')
      setReadyChecks({})
      setDrive('')
      setNote('')
      setDateTag('')
      setStatus('ideia')
      setUpdatedBy('Isabelle')
      setCoverUrl(null)
      setWho(DEFAULT_ASSIGNEES)
      setFactoryId(null)
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
      aspect: aspectForFormat(format),
      legenda: legenda.trim() || null,
      legenda_whatsapp: whatsapp.trim() || null,
      ready_checks: readyChecks,
      cover_url: coverUrl,
      cover_thumb_url: editing?.cover_thumb_url ?? null,
      drive_url: drive.trim() || null,
      checklist: checks.length ? checks : defaultChecklist(format, time || null),
      note: note.trim() || null,
      date_tag: dateTag.trim() || null,
      updated_by: updatedBy,
    }
  }

  async function save() {
    setBusy(true)
    try {
      const post = build()
      await data.savePost(post, editing ? undefined : who)
      if (!editing && factoryId) {
        const idea = data.bundle.ideas.find((item) => item.id === factoryId)
        if (idea) await data.saveIdea({ ...idea, post_id: post.id, suggested_date: idea.suggested_date || post.scheduled_date })
      }
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
          {!editing && (
            <label className="field">Já está na Fábrica?
              <select className="sel" value={factoryId || ''} onChange={(event) => {
                const id = event.target.value || null
                setFactoryId(id)
                const idea = data.bundle.ideas.find((item) => item.id === id)
                if (!idea) return
                setAccount(idea.account)
                setFormat(idea.format === 'carrossel' ? 'carrossel' : 'reel')
                setTitle(idea.title)
                if (idea.suggested_date) setDate(idea.suggested_date)
              }}>
                <option value="">Não, é um conteúdo novo</option>
                {data.bundle.ideas.filter((idea) => !idea.archived && !idea.post_id).map((idea) => (
                  <option key={idea.id} value={idea.id}>{idea.title}</option>
                ))}
              </select>
            </label>
          )}
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
                <button type="button" key={item.id} className={`choice-btn ${format === item.id ? 'on' : ''}`} onClick={() => {
                  setFormat(item.id)
                  if (!editing) {
                    setChecks(defaultChecklist(item.id, time || null))
                    setWho(defaultAssignees(item.id))
                  }
                }}>
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
              <label className="field">Proporção
                <input className="inp" value={aspectForFormat(format)} readOnly aria-readonly="true" />
              </label>
            </div>
          )}
          {!editing && step === 4 && (
            <div className="flow">
              {(Object.keys(who) as TaskStep[]).map((key, index) => (
                <div className="fr" key={key}>
                  <div className="num">{index + 1}</div>
                  <div />
                  <div className="who"><b>{stepName(key, format)}</b><span>antes de sair</span></div>
                  <select className="sel" value={who[key]} onChange={(event) => setWho({ ...who, [key]: event.target.value })}>
                    {ASSIGNEE_OPTIONS.map((name) => <option key={name}>{name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
          {(editing || step === 5) && (
            <div className="stack">
              <label className="field">Legenda do Instagram
                <textarea className="inp" value={legenda} onChange={(event) => setLegenda(event.target.value)} placeholder="Texto que vai no Instagram" />
              </label>
              <p className="src">{legenda.length} caracteres</p>
              <label className="field">Legenda do WhatsApp
                <textarea className="inp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="Texto para copiar e colar no WhatsApp" />
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
                      {isVideoFormat(format) && (
                        <button type="button" className="btn-rec" onClick={() => setStatus('gravado')}>
                          <Icon name="reel" /> Gravado, falta editar
                        </button>
                      )}
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
                  {needsCoverUpload(format) ? (
                    <div className="field">Capa
                      <div className="cover-preview-row">
                        {coverUrl || editing?.cover_thumb_url ? <img src={mediaUrl(coverUrl) || editing?.cover_thumb_url || ''} alt="Capa atual" /> : <span className="src">Sem capa ainda.</span>}
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
                  ) : (
                    <div className="field">Capa
                      <div className="cover-preview-row">
                        {editing?.cover_thumb_url || coverUrl ? <img src={editing?.cover_thumb_url || mediaUrl(coverUrl) || ''} alt="Primeiro slide" /> : <span className="src">A capa é o primeiro slide da pasta do Drive. Não precisa anexar de novo.</span>}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <div className="mf">
          <div className="hint">{editing ? (needsCoverUpload(format) ? 'A capa também pode ser trocada pelo celular.' : 'A capa do carrossel é o primeiro slide do Drive.') : (isVideoFormat(format) ? 'As tarefas gravar, editar, aprovar e postar nascem sozinhas.' : 'As tarefas plano slide por slide, confecção, aprovar e postar nascem sozinhas.')}</div>
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
      updated_by: ui.person || 'Isabelle',
      course: null,
      script_url: null,
      archived: false,
      post_id: null,
      record_date: null,
      edit_date: null,
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
            <div className="eb">Fábrica de Conteúdo</div>
            <DialogTitle className="dlg-title">{editing ? 'Editar ideia' : 'Nova ideia'}</DialogTitle>
            <DialogDescription className="dlg-desc">Coloque o cartão na etapa certa. Arquivar esconde, sem apagar.</DialogDescription>
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
                {IDEA_FORMATS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="field">Curso
              <select className="sel" value={draft.course || ''} onChange={(event) => setDraft({ ...draft, course: (event.target.value || null) as Idea['course'] })} disabled={draft.account !== 'escola'}>
                <option value="">{draft.account === 'escola' ? 'Sem curso' : 'Só na MJ Educação'}</option>
                {IDEA_COURSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </label>
            <label className="field">Etiquetas
              <input className="inp" value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} placeholder="FIMC, Portal, Campos" />
            </label>
            <label className="field">Data de postar
              <input className="inp" type="date" value={draft.suggested_date || ''} onChange={(event) => setDraft({ ...draft, suggested_date: event.target.value || null })} />
            </label>
            <label className="field">Dia de gravar
              <input className="inp" type="date" value={draft.record_date || ''} onChange={(event) => setDraft({ ...draft, record_date: event.target.value || null })} />
            </label>
            <label className="field">Dia de editar
              <input className="inp" type="date" value={draft.edit_date || ''} onChange={(event) => setDraft({ ...draft, edit_date: event.target.value || null })} />
            </label>
          </div>
          <p className="src">O dia de gravar e o dia de editar viram tarefa nesses dias, na aba Tarefas.</p>
          <label className="field">Link do roteiro (PDF)
            <input className="inp" value={draft.script_url || ''} onChange={(event) => setDraft({ ...draft, script_url: event.target.value || null })} placeholder="https://drive.google.com/..." />
          </label>
          <div className="status-row factory-status-row">
            {IDEA_STAGES.map((stage) => (
              <button type="button" key={stage.id} className={`st ${stage.cls} ${draft.status === stage.id ? 'on' : ''}`} onClick={() => setDraft({ ...draft, status: stage.id })}>{stage.label}</button>
            ))}
          </div>
        </div>
        <div className="mf">
          {editing ? <button type="button" className="btn" onClick={() => { void data.archiveIdea(editing.id, true); ui.closeIdea(); ui.toast('Ideia arquivada.') }}>Arquivar</button> : <span />}
          <div className="top-actions">
            {draft.suggested_date && !draft.post_id && (
              <button type="button" className="btn" onClick={() => void (async () => {
                const next = { ...draft, updated_by: ui.person || draft.updated_by, course: draft.account === 'escola' ? draft.course : null }
                await data.saveIdea(next)
                await data.launchIdea(next, next.suggested_date!)
                ui.closeIdea()
                ui.toast('Lançado na semana.')
              })()}>Lançar na semana</button>
            )}
            <button type="button" className="nx" onClick={() => void save({ ...draft, updated_by: ui.person || draft.updated_by, course: draft.account === 'escola' ? draft.course : null })}>Salvar</button>
          </div>
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
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!open) return
    setAsking(false)
    setDraft(editing || {
      id: uid(),
      title: '',
      assignee: ui.person,
      account: null,
      due_date: ui.taskDate || todayISO(),
      done: false,
      kind: 'adhoc',
      rolled_from: null,
      origin_date: ui.taskDate || todayISO(),
      post_id: null,
      idea_id: null,
      fixed_task_id: null,
      step: null,
      badge: null,
      note: null,
      sort: 60,
    })
  }, [open, editing, ui.taskDate, ui.person])

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
            <label className="field">Quem faz
              <select className="sel" value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}>
                {!ASSIGNEE_OPTIONS.includes(draft.assignee) && draft.assignee && <option value={draft.assignee}>{draft.assignee}</option>}
                {ASSIGNEE_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="field">Data
              <input className="inp" type="date" value={asDate(draft.due_date)} onChange={(event) => {
                const due = asDate(event.target.value)
                if (!due) return
                setDraft({
                  ...draft,
                  due_date: due,
                  origin_date: draft.rolled_from || draft.fixed_task_id ? draft.origin_date : due,
                })
              }} />
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
          {editing && !asking && (
            <button type="button" className="btn" onClick={() => {
              if (editing.fixed_task_id) { setAsking(true); return }
              void data.removeTask(editing.id)
              ui.closeTask()
            }}>Apagar</button>
          )}
          {editing && asking && (
            <div className="del-choice">
              <span>Tarefa que se repete:</span>
              <button type="button" className="btn" onClick={() => { void data.removeTask(editing.id); ui.closeTask(); ui.toast('Apagada só deste dia.') }}>Só este dia</button>
              <button type="button" className="btn" onClick={() => {
                if (!editing.fixed_task_id) return
                void data.stopFixedTask(editing.fixed_task_id, asDate(editing.origin_date || editing.due_date))
                ui.closeTask()
                ui.toast('Tarefa fixa apagada de vez.')
              }}>De vez</button>
              <button type="button" className="btn" onClick={() => setAsking(false)}>Cancelar</button>
            </div>
          )}
          {!editing && <span />}
          <button type="button" className="nx" onClick={() => { void data.saveTask(draft); ui.closeTask() }}>Salvar</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
