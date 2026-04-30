import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Handshake,
  IndianRupee,
  Receipt,
  Shield,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const features = [
  {
    icon: Receipt,
    title: 'Track every expense',
    description: 'Equal or custom splits — logged instantly. Never chase receipts again.',
    color: '#4361ee',
    bg: 'rgba(67, 97, 238, 0.08)',
  },
  {
    icon: Handshake,
    title: 'Settle with one tap',
    description: 'Smart settlement plans minimize transactions and end awkward conversations.',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.08)',
  },
  {
    icon: Wallet,
    title: 'Shared fund pools',
    description: 'Trip kitties, flat utilities, event cash — all visible in one workspace.',
    color: '#059669',
    bg: 'rgba(5, 150, 105, 0.08)',
  },
  {
    icon: BarChart3,
    title: 'Crisp analytics',
    description: 'See who spends the most, category trends, and monthly forecasts clearly.',
    color: '#0891b2',
    bg: 'rgba(8, 145, 178, 0.08)',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    description: 'JWT-based auth, encrypted sessions, and owner-gated group controls.',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.08)',
  },
  {
    icon: Zap,
    title: 'Real-time updates',
    description: 'Live balance sync across members so everyone sees the same numbers.',
    color: '#dc2626',
    bg: 'rgba(220, 38, 38, 0.08)',
  },
]

const stats = [
  { value: '₹0', label: 'Hidden fees' },
  { value: '100%', label: 'Transparent splits' },
  { value: 'INR', label: 'First-class support' },
  { value: '∞', label: 'Groups & members' },
]

const testimonials = [
  {
    quote: 'Finally an app where the math actually adds up. No more WhatsApp arguments.',
    name: 'Priya S.',
    role: 'Flatmate group',
    avatar: 'PS',
  },
  {
    quote: 'Used this for our Goa trip. Settlement plan was a lifesaver on the last day.',
    name: 'Arjun M.',
    role: 'Travel crew',
    avatar: 'AM',
  },
  {
    quote: 'The analytics charts helped us realize we were spending 40% on food. Oops.',
    name: 'Kavya R.',
    role: 'Office team',
    avatar: 'KR',
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--body-top)' }}>
      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--hairline)',
        padding: '0 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
          <img src="/logo.png" alt="Arthika" style={{ height: '36px', width: 'auto' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to={isAuthenticated ? '/dashboard' : '/login'}
            style={{
              padding: '0.5rem 1.1rem', borderRadius: 8,
              fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)',
              transition: 'color 150ms',
            }}>
            Sign in
          </Link>
          <Link to={isAuthenticated ? '/dashboard' : '/register'}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.95rem' }}>
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: 1180, margin: '0 auto', padding: '5rem 1.5rem 4rem',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem',
        alignItems: 'center',
      }} className="landing-hero-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(67, 97, 238, 0.10)',
            border: '1px solid rgba(67, 97, 238, 0.20)',
            borderRadius: 999, padding: '0.35rem 0.9rem',
            width: 'fit-content',
          }}>
            <Sparkles size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', fontFamily: "'Inter', sans-serif" }}>
              Smart Shared Finance for India
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 800, lineHeight: 1.12,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
          }}>
            Money shared,{' '}
            <span style={{
              background: 'var(--grad-primary)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>
              stress gone.
            </span>
          </h1>

          <p style={{
            fontSize: '1.1rem', lineHeight: 1.7,
            color: 'var(--text-secondary)', maxWidth: 480,
          }}>
            Arthika makes splitting bills, tracking balances, and settling debts effortless — for flatmates, travel groups, and every shared expense in between.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}
              className="btn btn-primary"
              style={{ fontSize: '1rem', padding: '0.8rem 1.75rem' }}>
              Start for free
              <ArrowRight size={18} />
            </Link>
            <Link to={isAuthenticated ? '/dashboard' : '/login'}
              className="btn btn-ghost"
              style={{ fontSize: '1rem', padding: '0.8rem 1.5rem' }}>
              Sign in
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {['No credit card needed', 'Free forever', 'INR-first'].map((item) => (
              <span key={item} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.9rem', color: 'var(--text-secondary)',
              }}>
                <CheckCircle2 size={15} color="var(--success)" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <div style={{ position: 'relative' }}>
          <div style={{
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(61, 27, 88, 0.12)',
            border: '1px solid var(--glass-border)',
          }}>
            <img
              src="/landing_hero.png"
              alt="Team splitting expenses on laptop"
              style={{ width: '100%', height: 380, objectFit: 'cover', display: 'block' }}
            />
          </div>
          {/* Floating stat card */}
          <div style={{
            position: 'absolute', bottom: -24, left: -24,
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
            padding: '1rem 1.25rem',
            boxShadow: 'var(--shadow-hover)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            animation: 'card-enter 500ms ease-out',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(5, 150, 105, 0.12)',
              display: 'grid', placeItems: 'center',
            }}>
              <CheckCircle2 size={22} color="var(--success)" />
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>All settled</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', fontFamily: "'Playfair Display', serif" }}>₹3,240</p>
            </div>
          </div>
          {/* Floating members card */}
          <div style={{
            position: 'absolute', top: -20, right: -20,
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
            padding: '0.85rem 1.1rem',
            boxShadow: 'var(--shadow-hover)',
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            animation: 'card-enter 600ms ease-out',
          }}>
            <Users size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>6 members</span>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section style={{
        background: 'var(--grad-primary)',
        padding: '2rem 1.5rem',
      }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2rem', textAlign: 'center',
        }} className="stats-grid">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display', serif" }}>{value}</p>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.25rem', fontFamily: "'Inter', sans-serif" }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>Everything you need</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Built for the way groups actually work
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: '1rem', maxWidth: 520, margin: '1rem auto 0' }}>
            Six core features that handle every shared money scenario without complexity.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }} className="features-grid">
          {features.map(({ icon: Icon, title, description, color, bg }) => (
            <article key={title} className="fin-card" style={{ padding: '1.75rem' }}>
              <div className="fin-card-inner" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: bg, display: 'grid', placeItems: 'center' }}>
                  <Icon size={22} color={color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── VISUAL SHOWCASE ── */}
      <section style={{
        background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-surface) 100%)',
        padding: '5rem 1.5rem',
      }}>
        <div style={{
          maxWidth: 1180, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center',
        }} className="landing-hero-grid">
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>How it works</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1.5rem' }}>
              From receipt to settled in minutes
            </h2>
            {[
              { step: '01', title: 'Create a group', desc: 'Add members by email — they join instantly.' },
              { step: '02', title: 'Log expenses', desc: 'Choose equal or custom splits per expense.' },
              { step: '03', title: 'View the plan', desc: 'Arthika computes the minimal settlement path.' },
              { step: '04', title: 'Mark as settled', desc: 'One tap and balances update in real time.' },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'var(--grad-primary)', color: '#fff',
                  display: 'grid', placeItems: 'center',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{step}</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{title}</p>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-hover)', border: '1px solid var(--glass-border)' }}>
            <img
              src="/landing_payment.png"
              alt="Friends planning expenses together"
              style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }}
            />
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>What users say</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Groups love Arthika
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }} className="features-grid">
          {testimonials.map(({ quote, name, role, avatar }) => (
            <article key={name} className="fin-card" style={{ padding: '1.75rem' }}>
              <div className="fin-card-inner">
                <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.85rem' }}>{avatar}</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{name}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{role}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        margin: '0 1.5rem 5rem',
        maxWidth: 1180,
        marginLeft: 'auto', marginRight: 'auto',
      }}>
        <div style={{
          background: 'var(--grad-primary)',
          borderRadius: 24,
          padding: '4rem 2rem',
          textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -40, width: 260, height: 260, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>Ready to simplify shared finance?</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            Start tracking money with your group today.
          </h2>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={isAuthenticated ? '/dashboard' : '/register'}
              style={{
                background: '#fff', color: 'var(--primary)',
                padding: '0.85rem 2rem', borderRadius: 10,
                fontWeight: 700, fontSize: '1rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                transition: 'transform 150ms, box-shadow 150ms',
              }}>
              {isAuthenticated ? 'Open dashboard' : 'Create free account'}
              <ArrowRight size={18} />
            </Link>
            <Link to={isAuthenticated ? '/dashboard' : '/login'}
              style={{
                background: 'rgba(255,255,255,0.15)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.85rem 1.75rem', borderRadius: 10,
                fontWeight: 600, fontSize: '1rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                transition: 'background 150ms',
              }}>
              {isAuthenticated ? 'Go to workspace' : 'Sign in instead'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--hairline)',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.9rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <img src="/logo.png" alt="Arthika" style={{ height: '32px', width: 'auto' }} />
        </div>
        <p>Smart Shared Finance System · Made for India</p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .landing-hero-grid { grid-template-columns: 1fr !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
