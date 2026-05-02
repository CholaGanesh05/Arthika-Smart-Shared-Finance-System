import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-surface)', padding: 'clamp(1.5rem, 5vw, 3rem)', borderRadius: 16, boxShadow: 'var(--shadow-card)', border: '1px solid var(--glass-border)' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2rem', transition: 'opacity 150ms' }} onMouseEnter={(e) => e.target.style.opacity = 0.8} onMouseLeave={(e) => e.target.style.opacity = 1}>
          <ArrowLeft size={18} /> Back to Home
        </Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Terms & Conditions</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>1. Introduction</h2>
            <p>Welcome to Arthika, the Smart Shared Finance System. By accessing or using our application, you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree, please do not use the service.</p>
          </section>
          
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>2. User Accounts & Security</h2>
            <p>To use Arthika, you must register for an account. You are solely responsible for maintaining the confidentiality of your login credentials (such as your password) and for all activities that occur under your account.</p>
          </section>
          
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>3. Financial Tracking & Settlements</h2>
            <p>Arthika provides digital ledger services to help groups, flatmates, and friends track shared expenses. <strong>Disclaimer:</strong> Arthika does not process actual bank transfers or hold monetary deposits. We are a tracking platform, and you are responsible for fulfilling physical settlements with your peers via external payment methods.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>4. Acceptable Use</h2>
            <p>You agree not to use Arthika for any unlawful purpose, fraud, or to post false or misleading expense claims. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>5. Changes to Terms</h2>
            <p>We may modify these Terms at any time. We will notify you of any material changes by posting the new Terms on this site. Your continued use of the application constitutes acceptance of the modified Terms.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
