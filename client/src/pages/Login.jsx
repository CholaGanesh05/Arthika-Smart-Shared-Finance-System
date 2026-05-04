import { useState } from 'react'
import { Eye, EyeOff, IndianRupee, Loader2, Lock, Mail, Sparkles } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ThemeToggle'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const destination = location.state?.from?.pathname || '/dashboard'

  function validate() {
    const next = {}
    if (!form.email) next.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email address.'
    if (!form.password) next.password = 'Password is required.'
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setServerError('')
    try {
      await login(form)
      navigate(destination, { replace: true })
    } catch (submitError) {
      setServerError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  function field(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: '' }))
  }

  return (
    <div
      className="auth-full-grid"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'var(--bg-base)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 20 }}>
        <ThemeToggle />
      </div>

      <div
        className="auth-left-panel"
        style={{
          background: 'var(--grad-primary)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -60,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', maxWidth: 360 }}>
          <div
            style={{
              background: '#fff',
              padding: '1.25rem 2rem',
              borderRadius: 16,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
          >
            <img src="/logo.png" alt="Arthika" style={{ height: '44px', width: 'auto', display: 'block' }} />
          </div>
          <p style={{ fontSize: '1.05rem', opacity: 0.85, lineHeight: 1.7, marginBottom: '2rem' }}>
            Smart shared finance for groups. Split bills, track balances, and settle debts - all in one place.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              'Equal or custom expense splits',
              'Real-time balance updates',
              'Minimal settlement plans',
              'INR-native experience',
            ].map((item) => (
              <div
                key={item}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', opacity: 0.9 }}
              >
                <Sparkles size={14} color="rgba(255,255,255,0.8)" />
                {item}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2.5rem', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <img
              src="https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=500&q=75"
              alt="Finance team"
              style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderBottom: '2px solid var(--hairline)' }}>
            <Link
              to="/login"
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--primary)',
                borderBottom: '2px solid var(--primary)',
                marginBottom: '-2px',
                transition: 'all 150ms',
              }}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              style={{
                padding: '0.75rem 1.25rem',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                transition: 'all 150ms',
              }}
            >
              Create account
            </Link>
          </div>

          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              marginBottom: '0.4rem',
            }}
          >
            Welcome back
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
            Sign in to your Arthika workspace.
          </p>

          {serverError && (
            <div
              style={{
                background: 'rgba(220, 38, 38, 0.08)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                borderLeft: '3px solid var(--danger)',
                borderRadius: 10,
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                color: 'var(--danger)',
              }}
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.45rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }}
                  size={16}
                  color="var(--primary)"
                  strokeWidth={1.8}
                />
                <input
                  autoComplete="email"
                  className="fin-input with-left-icon"
                  name="email"
                  onChange={(event) => field('email', event.target.value)}
                  placeholder="you@example.com"
                  style={{ borderColor: errors.email ? 'var(--danger)' : undefined }}
                  type="email"
                  value={form.email}
                />
              </div>
              {errors.email && <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.3rem' }}>{errors.email}</p>}
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.45rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }}
                  size={16}
                  color="var(--primary)"
                  strokeWidth={1.8}
                />
                <input
                  autoComplete="current-password"
                  className="fin-input with-left-icon with-right-icon"
                  name="password"
                  onChange={(event) => field('password', event.target.value)}
                  placeholder="Your password"
                  style={{ borderColor: errors.password ? 'var(--danger)' : undefined }}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                />
                <button
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                  style={{
                    position: 'absolute',
                    right: '0.9rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: '0.3rem' }}>{errors.password}</p>
              )}
            </div>

            <button
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', marginTop: '0.5rem', fontSize: '1.05rem', padding: '0.85rem' }}
              type="submit"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} strokeWidth={1.8} /> : <IndianRupee size={18} strokeWidth={1.8} />}
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Create one free
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .auth-full-grid { grid-template-columns: 1fr !important; }
          .auth-left-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
