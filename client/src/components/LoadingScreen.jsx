import { IndianRupee } from 'lucide-react'

export function LoadingScreen({ label = 'Smart Shared Finance', compact = false }) {
  const particles = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    left: `${(index * 17) % 100}%`,
    duration: `${7 + (index % 6)}s`,
    delay: `${(index % 5) * 0.35}s`,
  }))

  return (
    <div className={`loading-screen ${compact ? 'loading-screen--compact' : ''}`}>
      {particles.map((particle) => (
        <span
          className="loading-particle"
          key={particle.id}
          style={{
            left: particle.left,
            animationDuration: particle.duration,
            animationDelay: particle.delay,
          }}
        />
      ))}

      <div className="loading-inner">
        <div className="loading-brand">
          <IndianRupee color="var(--accent-light)" size={compact ? 34 : 44} strokeWidth={1.5} />
          <span className="loading-brand-word">Arthika</span>
        </div>
        <p className="section-eyebrow">Smart Shared Finance</p>
        <p className="fin-copy text-sm">{label}</p>
        <div aria-hidden="true" className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
