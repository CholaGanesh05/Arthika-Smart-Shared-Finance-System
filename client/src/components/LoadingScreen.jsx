export function LoadingScreen({ label = 'Loading Arthika...', compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 text-center ${compact ? 'min-h-[8rem]' : 'min-h-[50vh]'}`}>
      <div className="w-10 h-10 border-4 border-slate-200 border-t-accent rounded-full animate-spin" aria-hidden="true" />
      <p className="text-sm font-semibold text-slate-500 animate-pulse">{label}</p>
    </div>
  )
}
