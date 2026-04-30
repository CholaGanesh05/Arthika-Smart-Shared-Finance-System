import { ArrowLeft, Compass, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'

export default function NotFound() {
  return (
    <div className="landing-shell page-transition">
      <div className="auth-orb auth-orb--blue" />
      <div className="auth-orb auth-orb--gold" />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="fin-card w-full max-w-2xl p-8">
        <div className="fin-card-inner empty-state">
          <div className="empty-state-icon">
            <Compass size={30} strokeWidth={1.5} />
          </div>
          <p className="section-eyebrow">404</p>
          <h1 className="text-4xl font-display">That page drifted out of scope.</h1>
          <p className="fin-copy max-w-lg">
            Head back to the dashboard or return to the Arthika home screen.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link className="btn btn-primary sm:w-auto" to="/dashboard">
              <Home size={18} strokeWidth={1.5} />
              Dashboard
            </Link>
            <Link className="btn btn-ghost sm:w-auto" to="/">
              <ArrowLeft size={18} strokeWidth={1.5} />
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
