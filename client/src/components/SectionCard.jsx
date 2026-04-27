export function SectionCard({
  title,
  subtitle,
  eyebrow,
  actions,
  className = '',
  children,
}) {
  return (
    <section className={`fin-card flex flex-col gap-6 ${className}`.trim()}>
      <header className="flex justify-between items-start gap-4">
        <div>
          {eyebrow ? <p className="text-xs font-bold text-accent tracking-widest uppercase mb-1">{eyebrow}</p> : null}
          <h2 className="text-2xl font-display font-bold text-brand m-0">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
