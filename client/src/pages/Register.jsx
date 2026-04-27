import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function getPasswordMessage(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter.'
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter.'
  if (!/\d/.test(password)) return 'Add at least one number.'
  return ''
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordHint = form.password ? getPasswordMessage(form.password) : ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (passwordHint) { setError(passwordHint); return }
    if (form.password !== form.confirmPassword) { setError('Password confirmation does not match.'); return }
    setSubmitting(true)
    setError('')
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-lg">₹</div>
            <span className="text-white font-bold text-xl tracking-tight">Arthika</span>
          </div>
        </div>
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <span className="inline-block bg-white/20 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 w-fit">
            Create your account
          </span>
          <h1 className="text-4xl font-display font-bold text-white leading-snug mb-6">
            Start the version of shared finance that feels more organized than awkward.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-sm">
            Register once, then create groups for trips, apartments, events, and other shared budgets.
          </p>
        </div>
        <div className="relative z-10 flex gap-6 pt-8 border-t border-white/20">
          <div>
            <p className="text-2xl font-bold text-white">Free</p>
            <p className="text-slate-400 text-xs mt-1">No hidden fees</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">Instant</p>
            <p className="text-slate-400 text-xs mt-1">Setup in seconds</p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-slate-50 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center font-bold text-white text-lg">₹</div>
            <span className="text-brand font-bold text-xl tracking-tight">Arthika</span>
          </div>

          <div className="mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Registration</p>
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Join Arthika</h2>
            <p className="text-slate-500 text-sm">You&apos;ll be signed in immediately after registration.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="fin-label">Full name</span>
              <input
                autoComplete="name"
                className="fin-input"
                name="name"
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                placeholder="Chola Chetan"
                required
                value={form.name}
              />
            </label>

            <label className="block">
              <span className="fin-label">Email address</span>
              <input
                autoComplete="email"
                className="fin-input"
                name="email"
                onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                placeholder="you@example.com"
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="block">
              <span className="fin-label">Password</span>
              <input
                autoComplete="new-password"
                className="fin-input"
                name="password"
                onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))}
                placeholder="Use a strong password"
                required
                type="password"
                value={form.password}
              />
            </label>

            <label className="block">
              <span className="fin-label">Confirm password</span>
              <input
                autoComplete="new-password"
                className="fin-input"
                name="confirmPassword"
                onChange={(e) => setForm((c) => ({ ...c, confirmPassword: e.target.value }))}
                placeholder="Repeat your password"
                required
                type="password"
                value={form.confirmPassword}
              />
            </label>

            {passwordHint && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-amber-700 font-medium">{passwordHint}</p>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <button
              className="btn btn-primary w-full py-3 text-base mt-1"
              disabled={submitting}
              type="submit"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>

            <p className="text-center text-sm text-slate-500 mt-2">
              Already have an account?{' '}
              <Link className="text-brand font-semibold hover:underline" to="/login">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
