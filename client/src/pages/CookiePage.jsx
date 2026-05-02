import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function CookiePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: '2rem 1.5rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'var(--bg-surface)', padding: 'clamp(1.5rem, 5vw, 3rem)', borderRadius: 16, boxShadow: 'var(--shadow-card)', border: '1px solid var(--glass-border)' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2rem', transition: 'opacity 150ms' }} onMouseEnter={(e) => e.target.style.opacity = 0.8} onMouseLeave={(e) => e.target.style.opacity = 1}>
          <ArrowLeft size={18} /> Back to Home
        </Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>Cookie Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>Last updated: {new Date().toLocaleDateString()}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>1. What Are Cookies</h2>
            <p>Cookies are small pieces of text sent to your web browser by a website you visit. They help the website remember information about your visit, which can both make it easier to visit the site again and make the site more useful to you.</p>
          </section>
          
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>2. How Arthika Uses Cookies</h2>
            <p>Arthika primarily relies on HTML5 LocalStorage and HttpOnly Cookies to maintain your session securely. We use "essential" cookies to authenticate users and prevent fraudulent use of user accounts.</p>
          </section>
          
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>3. Your Choices Regarding Cookies</h2>
            <p>If you'd like to delete cookies or instruct your web browser to delete or refuse cookies, please visit the help pages of your web browser. Note that if you delete cookies or refuse them, you might not be able to use all of the features we offer, including staying logged into your dashboard.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
