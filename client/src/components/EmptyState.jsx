import { Wallet } from 'lucide-react'

export function EmptyState({ title, description, action, icon: Icon = Wallet }) {
  return (
    <div className="fin-card p-6">
      <div className="fin-card-inner empty-state">
        <div className="empty-state-icon">
          <Icon size={30} strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-display font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="fin-copy max-w-md text-sm">{description}</p>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    </div>
  )
}
