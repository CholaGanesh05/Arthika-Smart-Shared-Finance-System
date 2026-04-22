import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    title: 'Track shared expenses',
    description:
      'Capture equal and exact splits, then turn messy shared spending into a clean group ledger.',
  },
  {
    title: 'See live balances',
    description:
      'Pair-wise balances and simplified settlements update from the backend contract that already exists today.',
  },
  {
    title: 'Manage common funds',
    description:
      'Create group funds, contribute, withdraw, and keep a running shared balance for trips or household budgets.',
  },
]

const proofPoints = [
  { label: 'Core modules', value: 'Auth, groups, expenses, funds' },
  { label: 'Designed for', value: 'Flatmates, travel crews, event teams' },
  { label: 'Frontend goal', value: 'Responsive from mobile to desktop' },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="marketing-shell">
      <section className="marketing-hero">
        <div className="marketing-hero__copy">
          <p className="hero-badge">Arthika • Smart shared finance system</p>
          <h1>Shared money should feel calm, visible, and fair.</h1>
          <p className="marketing-hero__lede">
            Arthika turns group spending into a clear workflow: create a group,
            record expenses, simplify debts, and keep everyone aligned without
            the spreadsheet drama.
          </p>

          <div className="hero-actions">
            <Link className="button button--primary" to={isAuthenticated ? '/dashboard' : '/register'}>
              {isAuthenticated ? 'Open dashboard' : 'Create account'}
            </Link>
            <Link className="button button--ghost" to={isAuthenticated ? '/dashboard' : '/login'}>
              {isAuthenticated ? 'Go to workspace' : 'Sign in'}
            </Link>
          </div>
        </div>

        <div className="hero-panel">
          <p className="hero-panel__eyebrow">What this frontend is built around</p>
          <div className="metric-grid">
            {proofPoints.map((item) => (
              <article className="metric-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <p className="feature-card__eyebrow">Built from the SRS</p>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
