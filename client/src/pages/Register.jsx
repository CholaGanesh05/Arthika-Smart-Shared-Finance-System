import { useState } from 'react'
import { Eye, EyeOff, IndianRupee, Loader2, Lock, Mail, Sparkles, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const map = {
    0: { label: '', color: 'transparent' },
    1: { label: 'Very weak', color: '#dc2626' },
    2: { label: 'Weak', color: '#f97316' },
    3: { label: 'Fair', color: '#d97706' },
    4: { label: 'Strong', color: '#059669' },
    5: { label: 'Very strong', color: '#10b981' },
  }
  return { score, ...map[score] }
}

function getPasswordError(password) {
  if (password.length < 8) return 'At least 8 characters required.'
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter.'
  if (!/\d/.test(password)) return 'Add at least one number.'
  return ''
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const strength = getPasswordStrength(form.password)

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Name is required.'
    if (!form.email) next.email = 'Email is required.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = 'Enter a valid email.'
    const pwdErr = getPasswordError(form.password)
    if (pwdErr) next.password = pwdErr
    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password.'
    else if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setServerError('')
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setServerError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  function field(key, value) {
    setForm((c) => ({ ...c, [key]: value }))
    if (errors[key]) setErrors((c) => ({ ...c, [key]: '' }))
  }

  const inputStyle = (key) => ({
    borderColor: errors[key] ? 'var(--danger)' : undefined,
  })

  return (
    <div style={{
      minHeight: '100vh', display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg-base)',
    }} className="auth-full-grid">
      {/* Left decorative panel */}
      <div style={{
        background: 'var(--grad-primary)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: '3rem 2rem', position: 'relative', overflow: 'hidden',
      }} className="auth-left-panel">
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', color: '#fff', maxWidth: 360 }}>
          <div style={{ background: '#fff', padding: '1.25rem 2rem', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
            <img src="/logo.png" alt="Arthika" style={{ height: '44px', width: 'auto', display: 'block' }} />
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem', lineHeight: 1.15 }}>Join Arthika</h1>
          <p style={{ fontSize: '1rem', opacity: 0.85, lineHeight: 1.7, marginBottom: '2rem' }}>
            Create your account and start managing shared expenses with your crew.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {['Create groups for any occasion', 'Custom or equal splits', 'Shared fund pools & kitties', 'Full analytics dashboard'].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', opacity: 0.9 }}>
                <Sparkles size={14} color="rgba(255,255,255,0.8)" />
                {item}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2.5rem', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&q=75" alt="Friends sharing expenses" style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }} />
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem 1.5rem', background: 'var(--bg-surface)', overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', borderBottom: '2px solid var(--hairline)' }}>
            <Link to="/login" style={{
              padding: '0.75rem 1.25rem', fontSize: '1rem', fontWeight: 600,
              color: 'var(--text-muted)', transition: 'all 150ms',
            }}>Sign in</Link>
            <Link to="/register" style={{
              padding: '0.75rem 1.25rem', fontSize: '1rem', fontWeight: 700,
              color: 'var(--primary)', borderBottom: '2px solid var(--primary)',
              marginBottom: '-2px', transition: 'all 150ms',
            }}>Create account</Link>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Get started free</h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>No credit card. No hidden fees. Just shared finance done right.</p>

          {serverError && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)',
              borderLeft: '3px solid var(--danger)', borderRadius: 10, padding: '0.85rem 1rem',
              marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--danger)',
            }}>
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Full name</label>
              <div style={{ position: 'relative' }}>
                <User style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--primary)" strokeWidth={1.8} />
                <input autoComplete="name" className="fin-input with-left-icon" name="name" onChange={(e) => field('name', e.target.value)} placeholder="Your name" style={inputStyle('name')} type="text" value={form.name} />
              </div>
              {errors.name && <p style={{ fontSize: '0.76rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--primary)" strokeWidth={1.8} />
                <input autoComplete="email" className="fin-input with-left-icon" name="email" onChange={(e) => field('email', e.target.value)} placeholder="you@example.com" style={inputStyle('email')} type="email" value={form.email} />
              </div>
              {errors.email && <p style={{ fontSize: '0.76rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--primary)" strokeWidth={1.8} />
                <input autoComplete="new-password" className="fin-input with-left-icon with-right-icon" name="password" onChange={(e) => field('password', e.target.value)} placeholder="Use a strong password" style={inputStyle('password')} type={showPassword ? 'text' : 'password'} value={form.password} />
                <button aria-label="Toggle password" onClick={() => setShowPassword((c) => !c)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }} type="button">
                  {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: '0.4rem' }}>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '0.25rem' }}>
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.score ? strength.color : 'var(--hairline)', transition: 'background 300ms' }} />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.73rem', color: strength.color, fontWeight: 600 }}>{strength.label}</p>
                </div>
              )}
              {errors.password && <p style={{ fontSize: '0.76rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <Lock style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} size={16} color="var(--primary)" strokeWidth={1.8} />
                <input autoComplete="new-password" className="fin-input with-left-icon with-right-icon" name="confirmPassword" onChange={(e) => field('confirmPassword', e.target.value)} placeholder="Repeat your password" style={inputStyle('confirmPassword')} type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} />
                <button aria-label="Toggle confirm password" onClick={() => setShowConfirm((c) => !c)} style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)' }} type="button">
                  {showConfirm ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                </button>
              </div>
              {errors.confirmPassword && <p style={{ fontSize: '0.76rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{errors.confirmPassword}</p>}
            </div>

            <button className="btn btn-primary" disabled={submitting} style={{ width: '100%', marginTop: '0.5rem', fontSize: '1.05rem', padding: '0.85rem' }} type="submit">
              {submitting ? <Loader2 className="animate-spin" size={18} strokeWidth={1.8} /> : <IndianRupee size={18} strokeWidth={1.8} />}
              {submitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Sign in</Link>
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
