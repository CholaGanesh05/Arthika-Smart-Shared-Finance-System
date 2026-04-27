export function StatCard({ label, value, hint, tone = 'neutral' }) {
  const toneMap = {
    neutral: 'text-brand',
    positive: 'text-finance-positive',
    negative: 'text-finance-negative'
  };

  return (
    <article className="fin-card flex flex-col gap-2">
      <p className="text-xs font-bold text-brand tracking-widest uppercase">{label}</p>
      <strong className={`font-display text-3xl font-bold tabular-nums ${toneMap[tone]}`}>{value}</strong>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </article>
  )
}
