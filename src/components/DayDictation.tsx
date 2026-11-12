import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog'
import { Icon } from './Icon'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'
import { addDays, longDate, todayISO } from '@/lib/dates'
import { addHour, organizeDay, taskTitle, timeSort, type OrganizedItem } from '@/lib/dictate'
import { uid } from '@/lib/utils'

const UNSUPPORTED = 'Neste navegador o ditado por voz não está disponível. Escreva o dia aqui. No celular, o microfone do teclado também funciona.'

type SpeechResult = { isFinal: boolean; 0: { transcript: string } }
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> }
type SpeechErrorEvent = { error: string }
type SpeechSession = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechEvent) => void) | null
  onerror: ((event: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

function speechCtor(): (new () => SpeechSession) | null {
  if (typeof window === 'undefined') return null
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechSession
    webkitSpeechRecognition?: new () => SpeechSession
  }
  return host.SpeechRecognition || host.webkitSpeechRecognition || null
}

function micMessage(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return 'O microfone não foi permitido. Escreva o dia aqui, ou use o microfone do teclado.'
  }
  if (code === 'audio-capture') return 'Não encontrei um microfone neste aparelho. Escreva o dia aqui.'
  return 'O ditado não respondeu agora. Escreva o dia aqui, ou use o microfone do teclado.'
}

export function DayDictation() {
  const ui = useUi()
  const data = useData()
  const open = ui.audio
  const supported = speechCtor() !== null
  const today = todayISO()
  const tomorrow = addDays(today, 1)
  const [step, setStep] = useState<'speak' | 'review'>('speak')
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [note, setNote] = useState('')
  const [hint, setHint] = useState('')
  const [date, setDate] = useState(today)
  const [touched, setTouched] = useState(false)
  const [items, setItems] = useState<OrganizedItem[]>([])
  const [busy, setBusy] = useState(false)
  const keepRef = useRef(false)
  const recRef = useRef<SpeechSession | null>(null)
  const textRef = useRef('')

  useEffect(() => {
    textRef.current = text
  }, [text])

  useEffect(() => {
    if (!open) {
      keepRef.current = false
      try { recRef.current?.stop() } catch { /* already stopped */ }
      setListening(false)
      return
    }
    setText('')
    setInterim('')
    setItems([])
    setDate(todayISO())
    setTouched(false)
    setNote(speechCtor() ? '' : UNSUPPORTED)
    setHint('')
    setStep('speak')
    setBusy(false)
  }, [open])

  function stopMic() {
    keepRef.current = false
    try { recRef.current?.stop() } catch { /* already stopped */ }
    setListening(false)
    setInterim('')
  }

  function startMic() {
    const Ctor = speechCtor()
    if (!Ctor) {
      setNote(UNSUPPORTED)
      return
    }
    stopMic()
    const rec = new Ctor()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true
    keepRef.current = true
    rec.onresult = (event) => {
      let finalChunk = ''
      let live = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const piece = event.results[index][0]?.transcript || ''
        if (event.results[index].isFinal) finalChunk += piece
        else live += piece
      }
      if (finalChunk) {
        setText((current) => `${current} ${finalChunk}`.replace(/\s+/g, ' ').trim())
      }
      setInterim(live.replace(/\s+/g, ' ').trim())
    }
    rec.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return
      keepRef.current = false
      setListening(false)
      setInterim('')
      setNote(micMessage(event.error))
    }
    rec.onend = () => {
      if (!keepRef.current) {
        setListening(false)
        return
      }
      window.setTimeout(() => {
        if (!keepRef.current) return
        try {
          rec.start()
        } catch {
          keepRef.current = false
          setListening(false)
        }
      }, 300)
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
      setNote('')
    } catch {
      keepRef.current = false
      setListening(false)
      setNote('Não consegui abrir o microfone. Escreva o dia aqui, ou use o microfone do teclado.')
    }
  }

  function organize() {
    stopMic()
    const spoken = `${textRef.current} ${interim}`.replace(/\s+/g, ' ').trim()
    setText(spoken)
    const organized = organizeDay(spoken)
    if (!organized.items.length) {
      setNote('Não consegui separar tarefas nessa frase. Tente algo como: às 9 gravo o vídeo, depois do almoço edito.')
      return
    }
    setItems(organized.items)
    if (!touched && organized.dayHint === 'amanha') {
      setDate(addDays(todayISO(), 1))
      setHint('Pelo que você falou, deixei para amanhã. Dá para trocar o dia.')
    } else if (!touched && organized.dayHint === 'hoje') {
      setDate(todayISO())
      setHint('')
    } else {
      setHint('')
    }
    setNote('')
    setStep('review')
  }

  function pick(next: string) {
    setTouched(true)
    setDate(next)
    setHint('')
  }

  function update(id: string, patch: Partial<OrganizedItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  async function confirm() {
    const ready = items.map((item) => ({ ...item, title: item.title.trim() })).filter((item) => item.title)
    if (!ready.length) {
      setNote('Inclua pelo menos uma tarefa.')
      return
    }
    setBusy(true)
    setNote('')
    try {
      await data.saveTasks(ready.map((item) => ({
        id: uid(),
        title: taskTitle(item),
        assignee: 'Isabelle',
        account: null,
        due_date: date,
        done: false,
        kind: 'adhoc',
        rolled_from: null,
        origin_date: date,
        post_id: null,
        fixed_task_id: null,
        step: null,
        badge: null,
        sort: timeSort(item.time, 0),
      })))
      ui.setAudio(false)
      ui.toast(ready.length === 1 ? '1 tarefa salva.' : `${ready.length} tarefas salvas.`)
    } catch {
      setNote('Não foi possível salvar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const readyCount = items.filter((item) => item.title.trim()).length

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value && busy) return; if (!value) stopMic(); ui.setAudio(value) }}>
      <DialogContent className="dictate-dlg">
        <div className="mh5">
          <div>
            <div className="eb">Tarefas</div>
            <DialogTitle className="dlg-title">Ditar o dia por áudio</DialogTitle>
            <DialogDescription className="dlg-desc">
              {step === 'speak'
                ? 'Fale o dia em português, ou escreva. A gente separa as tarefas e os horários para você conferir.'
                : 'Confira a lista. Dá para mudar o horário, o texto, tirar ou incluir uma tarefa.'}
            </DialogDescription>
          </div>
          <button type="button" className="xb" onClick={() => { stopMic(); ui.setAudio(false) }} aria-label="Fechar"><Icon name="x" /></button>
        </div>
        <div className="mb dictate">
          <div className="dictate-days" role="group" aria-label="Dia das tarefas">
            <button type="button" className={date === today ? 'on' : ''} onClick={() => pick(today)}>Hoje</button>
            <button type="button" className={date === tomorrow ? 'on' : ''} onClick={() => pick(tomorrow)}>Amanhã</button>
            <label className="dictate-date">
              Outro dia
              <input className="inp" type="date" value={date} onChange={(event) => pick(event.target.value || today)} />
            </label>
          </div>
          <p className="dictate-when">{longDate(date)}</p>
          {hint && <p className="dictate-note" role="status">{hint}</p>}
          {step === 'speak' ? (
            <>
              {supported && (
                <button type="button" className={listening ? 'dictate-mic on' : 'dictate-mic'} onClick={() => (listening ? stopMic() : startMic())}>
                  <Icon name="mic" />
                  {listening ? 'Ouvindo… toque para parar' : 'Falar o dia'}
                </button>
              )}
              {listening && <p className="dictate-live" aria-live="polite">{interim || 'Pode falar…'}</p>}
              {note && <p className="dictate-note" role="status">{note}</p>}
              <label className="field">O que entra no dia
                <textarea
                  className="inp dictate-box"
                  rows={4}
                  value={text}
                  placeholder="amanhã às 9 gravo o vídeo, depois do almoço edito, às 16h atualizo o orçamento"
                  onChange={(event) => setText(event.target.value)}
                  autoFocus={!supported}
                />
              </label>
            </>
          ) : (
            <>
              {note && <p className="dictate-note" role="status">{note}</p>}
              <div className="dictate-list">
                {items.map((item, index) => (
                  <div className="dictate-row" key={item.id}>
                    <label className="dictate-time">
                      <span className="sr">Horário da tarefa {index + 1}</span>
                      <input
                        className="inp"
                        type="time"
                        value={item.time}
                        onChange={(event) => {
                          if (!event.target.value) return
                          update(item.id, { time: event.target.value, suggested: false })
                        }}
                      />
                      {item.suggested && <em>sugerido</em>}
                    </label>
                    <input
                      className="inp"
                      aria-label={`Tarefa ${index + 1}`}
                      value={item.title}
                      placeholder="O que fazer"
                      onChange={(event) => update(item.id, { title: event.target.value })}
                    />
                    <button type="button" className="xb" aria-label="Tirar esta tarefa" onClick={() => setItems(items.filter((row) => row.id !== item.id))}>
                      <Icon name="x" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => setItems([...items, {
                  id: uid(),
                  title: '',
                  time: items.length ? addHour(items[items.length - 1].time) : '09:00',
                  suggested: true,
                }])}
              >
                <Icon name="plus" /> Incluir tarefa
              </button>
            </>
          )}
        </div>
        <div className="mf dictate-foot">
          {step === 'review'
            ? <button type="button" className="btn" onClick={() => { setStep('speak'); setNote('') }}>Voltar</button>
            : <span className="hint">O horário sugerido dá para mudar antes de salvar.</span>}
          {step === 'speak'
            ? <button type="button" className="nx" disabled={!`${text} ${interim}`.trim()} onClick={organize}>Organizar o dia</button>
            : <button type="button" className="nx" disabled={busy || readyCount === 0} onClick={() => void confirm()}>{busy ? 'Salvando…' : readyCount === 1 ? 'Salvar 1 tarefa' : `Salvar ${readyCount} tarefas`}</button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
