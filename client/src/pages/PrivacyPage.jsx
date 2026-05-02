import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-surface)', padding: 'clamp(1.5rem, 5vw, 3rem)', borderRadius: 16, boxShadow: 'var(--shadow-card)', border: '1px solid var(--glass-border)' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2rem', transition: 'opacity 150ms' }} onMouseEnter={(e) => e.target.style.opacity = 0.8} onMouseLeave={(e) => e.target.style.opacity = 1}>
          <ArrowLeft size={18} /> Back to Home
        </Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>1. Data Collection</h2>
            <p>We collect information that you provide directly to us when registering, such as your name, email address, and encrypted passwords. We also collect the expense and group data you input into the system.</p>
          </section>
          
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>2. How We Use Your Data</h2>
            <p>Your data is used exclusively to provide, maintain, and improve the Arthika platform. This includes authenticating your session, syncing shared expenses across your group members in real-time, and generating analytics for your dashboard.</p>
          </section>
          
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>3. Data Security</h2>
            <p>We take security seriously. We use JSON Web Tokens (JWT) for secure session management and hash your passwords using industry-standard cryptography before storing them in our secure MongoDB database. However, no electronic transmission over the internet is 100% secure.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>4. Data Sharing</h2>
            <p>We do not sell your personal data to third parties. Your expense data is only shared with the specific users you invite to your groups. You have full control over who sees your transactions.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
