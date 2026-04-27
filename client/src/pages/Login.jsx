import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
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
            Welcome back
          </span>
          <h1 className="text-4xl font-display font-bold text-white leading-snug mb-6">
            Step back into your group finances without losing the thread.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-sm">
            Sign in to review balances, log new expenses, and settle what is still outstanding across your shared groups.
          </p>
        </div>

        <div className="relative z-10 flex gap-6 pt-8 border-t border-white/20">
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">₹0</p>
            <p className="text-slate-400 text-xs mt-1">Lost to confusion</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">100%</p>
            <p className="text-slate-400 text-xs mt-1">Transparent splits</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">∞</p>
            <p className="text-slate-400 text-xs mt-1">Groups supported</p>
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Authentication</p>
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Sign in to Arthika</h2>
            <p className="text-slate-500 text-sm">Use the account you created to get started.</p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="fin-label">Email address</span>
              <input
                autoComplete="email"
                className="fin-input"
                name="email"
                onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
                placeholder="you@example.com"
                required
                type="email"
                value={form.email}
              />
            </label>

            <label className="block">
              <span className="fin-label">Password</span>
              <input
                autoComplete="current-password"
                className="fin-input"
                minLength={8}
                name="password"
                onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))}
                placeholder="At least 8 characters"
                required
                type="password"
                value={form.password}
              />
            </label>

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
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>

            <p className="text-center text-sm text-slate-500 mt-2">
              Don&apos;t have an account?{' '}
              <Link className="text-brand font-semibold hover:underline" to="/register">
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
