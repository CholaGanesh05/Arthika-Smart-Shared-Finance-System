export function StatCard({ label, value, hint, tone = 'neutral' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <p className="stat-card__label">{label}</p>
      <strong className="stat-card__value">{value}</strong>
      {hint ? <p className="stat-card__hint">{hint}</p> : null}
    </article>
  )
}
