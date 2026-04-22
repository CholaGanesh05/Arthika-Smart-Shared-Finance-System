import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getPasswordMessage(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'Add at least one uppercase letter.'
  }

  if (!/[a-z]/.test(password)) {
    return 'Add at least one lowercase letter.'
  }

  if (!/\d/.test(password)) {
    return 'Add at least one number.'
  }

  return ''
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordHint = form.password ? getPasswordMessage(form.password) : ''

  async function handleSubmit(event) {
    event.preventDefault()

    if (passwordHint) {
      setError(passwordHint)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      })

      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-aside">
        <p className="hero-badge">Create your account</p>
        <h1>Start the version of shared finance that feels more organized than awkward.</h1>
        <p>
          Register once, then create groups for trips, apartments, events, and
          other shared budgets.
        </p>
      </section>

      <section className="auth-panel">
        <header className="auth-panel__header">
          <p className="section-card__eyebrow">Registration</p>
          <h2>Join Arthika</h2>
          <p>The current backend signs you in immediately after registration.</p>
        </header>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="input-field">
            <span>Full name</span>
            <input
              autoComplete="name"
              name="name"
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Chola Chetan"
              required
              value={form.name}
            />
          </label>

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
              autoComplete="new-password"
              name="password"
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Use a strong password"
              required
              type="password"
              value={form.password}
            />
          </label>

          <label className="input-field">
            <span>Confirm password</span>
            <input
              autoComplete="new-password"
              name="confirmPassword"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="Repeat your password"
              required
              type="password"
              value={form.confirmPassword}
            />
          </label>

          {passwordHint ? <p className="notice notice--warning">{passwordHint}</p> : null}
          {error ? <p className="notice notice--error">{error}</p> : null}

          <div className="button-row">
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
            <Link className="button button--ghost" to="/login">
              I already have one
            </Link>
          </div>
        </form>
      </section>
    </div>
  )
}
