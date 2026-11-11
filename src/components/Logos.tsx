const base = import.meta.env.BASE_URL

export function Logos({ tone = 'white' }: { tone?: 'white' | 'navy' }) {
  return (
    <div className="logos">
      <img src={`${base}logos/logo-mj-${tone}.png`} alt="MJ Educação" />
      <img src={`${base}logos/logo-missao-${tone}.png`} alt="Missão Josué" />
    </div>
  )
}
