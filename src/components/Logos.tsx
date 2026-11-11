export function LogoEscola() {
  return (
    <svg viewBox="0 0 78 32" role="img" aria-label="MJ Educação">
      <text x="0" y="18" fill="currentColor" fontFamily="Inter, sans-serif" fontWeight={800} fontSize="18">MJ</text>
      <text x="1" y="29" fill="currentColor" fontFamily="Inter, sans-serif" fontWeight={700} fontSize="6.4" letterSpacing="1.5">EDUCAÇÃO</text>
    </svg>
  )
}

export function LogoMissao() {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label="Missão Josué" fill="none" stroke="currentColor">
      <circle cx="16" cy="16" r="12.5" strokeWidth="1.7" />
      <ellipse cx="16" cy="16" rx="6" ry="12.5" strokeWidth="1.4" />
      <path d="M3.5 16h25M5.2 10.2h21.6M5.2 21.8h21.6" strokeWidth="1.3" />
      <path d="M16 5.2v5.2M13.4 7.8h5.2" strokeWidth="1.8" />
    </svg>
  )
}

export function Logos() {
  return (
    <div className="logos">
      <LogoEscola />
      <LogoMissao />
    </div>
  )
}
