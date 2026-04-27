export function EmptyState({ title, description, action }) {
  return (
    <div className="fin-card flex flex-col items-center justify-center text-center py-12 px-6 gap-4 border-dashed bg-slate-50/50">
      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-2">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
      </div>
      <h3 className="text-xl font-display font-bold text-slate-800 m-0">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm m-0">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
