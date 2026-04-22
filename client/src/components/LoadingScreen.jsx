export function LoadingScreen({ label = 'Loading Arthika...', compact = false }) {
  return (
    <div className={`loading-screen${compact ? ' loading-screen--compact' : ''}`}>
      <span className="loading-screen__orb" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
