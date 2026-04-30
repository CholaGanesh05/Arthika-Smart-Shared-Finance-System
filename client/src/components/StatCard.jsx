import { CountUpNumber } from './CountUpNumber'

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon: Icon,
  format = 'auto',
}) {
  const toneColors = {
    neutral: 'var(--text-primary)',
    positive: 'var(--success)',
    negative: 'var(--danger)',
  }

  const toneIconBg = {
    neutral: 'var(--primary-glow)',
    positive: 'rgba(5, 150, 105, 0.10)',
    negative: 'rgba(220, 38, 38, 0.10)',
  }

  const toneIconColor = {
    neutral: 'var(--primary)',
    positive: 'var(--success)',
    negative: 'var(--danger)',
  }

  const numericValue = typeof value === 'number' ? value : null
  const shouldAnimate = numericValue !== null && format !== 'text'

  return (
    <article className="fin-card" style={{ padding: '1.25rem 1.5rem' }}>
      <div className="fin-card-inner" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.67rem', fontWeight: 500,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}>{label}</p>
          {Icon && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: toneIconBg[tone],
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Icon color={toneIconColor[tone]} size={17} strokeWidth={1.8} />
            </div>
          )}
        </div>

        <strong style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.85rem', fontWeight: 800,
          color: toneColors[tone], lineHeight: 1,
          display: 'block',
        }}>
          {shouldAnimate
            ? <CountUpNumber format={format === 'number' ? 'number' : 'currency'} value={numericValue} />
            : value}
        </strong>

        {hint && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{hint}</p>
        )}
      </div>
    </article>
  )
}
