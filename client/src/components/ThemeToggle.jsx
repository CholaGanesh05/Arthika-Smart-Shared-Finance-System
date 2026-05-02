import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export function ThemeToggle({ className = '', lightColor = 'var(--primary)' }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`btn btn-ghost btn-icon ${className}`.trim()}
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'light' ? (
        <MoonStar color={lightColor} size={18} strokeWidth={1.5} />
      ) : (
        <SunMedium color="var(--accent-light)" size={18} strokeWidth={1.5} />
      )}
    </button>
  )
}
