export function SectionCard({
  title,
  subtitle,
  eyebrow,
  actions,
  icon: Icon,
  className = '',
  children,
}) {
  return (
    <section className={`fin-card ${className}`.trim()} style={{ padding: '1.5rem 1.75rem' }}>
      <div className="fin-card-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1, minWidth: 0 }}>
              {Icon && (
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: 'var(--primary-glow)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon color="var(--primary)" size={20} strokeWidth={1.8} />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                {eyebrow && (
                  <p style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.68rem', fontWeight: 500,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--primary)', marginBottom: '0.3rem',
                  }}>{eyebrow}</p>
                )}
                <h2 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '1.35rem', fontWeight: 700,
                  color: 'var(--text-primary)', lineHeight: 1.25,
                }}>{title}</h2>
                {subtitle && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem', lineHeight: 1.6 }}>{subtitle}</p>
                )}
              </div>
            </div>
            {actions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>{actions}</div>
            )}
          </div>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>{children}</div>
      </div>
    </section>
  )
}
