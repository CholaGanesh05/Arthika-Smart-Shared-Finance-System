import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const destination = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await login(form)
      navigate(destination, { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-aside">
        <p className="hero-badge">Welcome back</p>
        <h1>Step back into your group finances without losing the thread.</h1>
        <p>
          Sign in to review balances, log new expenses, and settle what is still
          outstanding across your shared groups.
        </p>
      </section>

      <section className="auth-panel">
        <header className="auth-panel__header">
          <p className="section-card__eyebrow">Authentication</p>
          <h2>Sign in to Arthika</h2>
          <p>Use the same account you created on the backend.</p>
        </header>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="input-field">
            <span>Email address</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="you@example.com"
              required
              type="email"
              value={form.email}
            />
          </label>

          <label className="input-field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              minLength={8}
              name="password"
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="At least 8 characters"
              required
              type="password"
              value={form.password}
            />
          </label>

          {error ? <p className="notice notice--error">{error}</p> : null}

          <div className="button-row">
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
            <Link className="button button--ghost" to="/register">
              Need an account?
            </Link>
          </div>
        </form>
      </section>
    </div>
  )
}
