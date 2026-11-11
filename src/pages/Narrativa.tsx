import { useEffect, useState } from 'react'
import { useData } from '@/context/DataContext'
import { useUi } from '@/context/UiContext'

export function Narrativa() {
  const data = useData()
  const ui = useUi()
  const [body, setBody] = useState(data.bundle.narrative.body)
  useEffect(() => setBody(data.bundle.narrative.body), [data.bundle.narrative.body])

  return (
    <>
      <div className="top">
        <div>
          <div className="eyebrow">Planejar</div>
          <h1>Nossa narrativa</h1>
          <div className="sub">O texto que a equipe consulta antes de escrever legenda, ideia ou pauta.</div>
        </div>
        <button type="button" className="btn pri" onClick={() => { void data.saveNarrative(body); ui.toast('Narrativa salva.') }}>Salvar</button>
      </div>
      <div className="card secbox">
        <textarea className="inp" style={{ minHeight: 280 }} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Escreva aqui a narrativa das duas contas." />
      </div>
    </>
  )
}
