import { useState } from 'react'
import {
  BarChart3,
  Bell,
  CircleUser,
  Home,
  IndianRupee,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings2,
  Users,
  X,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { getInitials } from '../utils/helpers'

const desktopNavigation = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

function isRouteActive(pathname, target) {
  if (target.includes('#')) return pathname === target.split('#')[0]
  if (target === '/dashboard') return pathname === '/dashboard'
  return pathname.startsWith(target)
}

function resolveAnalyticsRoute(pathname) {
  const m = pathname.match(/^\/groups\/([^/]+)/)
  return m?.[1] ? `/groups/${m[1]}/analytics` : '/dashboard'
}

function resolveGroupRoute(pathname) {
  const m = pathname.match(/^\/groups\/([^/]+)/)
  return m?.[1] ? `/groups/${m[1]}` : '/dashboard#groups'
}

function resolveAddRoute(pathname) {
  return pathname.startsWith('/groups/') ? pathname : '/dashboard#create-group'
}

export function AppShell() {
  const { logout, user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const mobileNavigation = [
    { to: '/dashboard', label: 'Home', icon: Home },
    { to: resolveGroupRoute(location.pathname), label: 'Groups', icon: Users },
    { to: resolveAddRoute(location.pathname), label: 'Add', icon: Plus, add: true },
    { to: resolveAnalyticsRoute(location.pathname), label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Profile', icon: CircleUser },
  ]

  const initials = getInitials(user?.name)

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="app-sidebar">
        <div className="sidebar-panel">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', marginBottom: '1rem' }}>
            <img src="/logo.png" alt="Arthika" style={{ height: '44px', width: 'auto' }} />
          </div>

          <div style={{ height: '1px', background: 'var(--hairline)', margin: '0.25rem 0 0.75rem' }} />

          {/* Nav */}
          <nav aria-label="Primary" style={{ display: 'grid', gap: '0.25rem' }}>
            {desktopNavigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                className="sidebar-link"
                data-active={isRouteActive(location.pathname, to)}
                key={to}
                to={to}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: isRouteActive(location.pathname, to) ? 'var(--primary-glow)' : 'transparent', transition: 'background 180ms' }}>
                  <Icon size={18} strokeWidth={isRouteActive(location.pathname, to) ? 2.2 : 1.6} />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: isRouteActive(location.pathname, to) ? 700 : 500 }}>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom profile */}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ height: '1px', background: 'var(--hairline)', marginBottom: '0.75rem' }} />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem', borderRadius: 14,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--glass-border)',
              marginBottom: '0.75rem',
            }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ width: 38, height: 38, borderRadius: 10, fontSize: '0.85rem', flexShrink: 0 }}>{initials}</div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.25rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Theme</span>
              <ThemeToggle />
            </div>
            <button className="btn btn-ghost" onClick={logout} style={{ width: '100%', justifyContent: 'flex-start', gap: '0.6rem', fontSize: '0.95rem', padding: '0.65rem 0.75rem' }} type="button">
              <LogOut size={16} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="app-main">
        <header className="app-topbar">
          {/* Mobile brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.25rem 0' }} className="md:hidden">
            <img src="/logo.png" alt="Arthika" style={{ height: '32px', width: 'auto' }} />
          </div>

          <label className="topbar-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{ position: 'absolute', left: '0.9rem', color: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} size={16} strokeWidth={1.8} />
            <input aria-label="Search groups, expenses" className="fin-input topbar-search-input with-left-icon" placeholder="Search groups, expenses…" type="search" style={{ height: 40, fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle lightColor="#fff" />
            <button aria-label="Notifications" className="btn btn-ghost btn-icon" style={{ width: 40, height: 40, minWidth: 40, padding: 0, borderRadius: 10, color: '#fff' }} type="button">
              <Bell size={18} strokeWidth={1.8} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.75rem', borderRadius: 10, border: '1px solid var(--glass-border)', background: 'var(--bg-surface)' }} className="hidden sm:flex">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ width: 30, height: 30, borderRadius: 8, fontSize: '0.8rem' }}>{initials}</div>
              )}
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name}</p>
              </div>
            </div>
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              className="btn btn-ghost btn-icon md:hidden"
              onClick={() => setMenuOpen((c) => !c)}
              style={{ width: 40, height: 40, minWidth: 40, padding: 0, borderRadius: 10, color: '#fff' }}
              type="button"
            >
              {menuOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="fin-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div className="fin-card-inner" style={{ display: 'grid', gap: '0.25rem' }}>
              {desktopNavigation.map(({ to, label, icon: Icon }) => (
                <NavLink className="sidebar-link" data-active={isRouteActive(location.pathname, to)} key={to} onClick={() => setMenuOpen(false)} to={to}>
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
              <button className="btn btn-ghost" onClick={logout} style={{ justifyContent: 'flex-start', gap: '0.6rem', marginTop: '0.25rem' }} type="button">
                <LogOut size={16} strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </div>
        )}

        <main className="page-transition" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav aria-label="Mobile navigation" className="bottom-nav">
        {mobileNavigation.map(({ to, label, icon: Icon, add }) => (
          <NavLink
            className={`bottom-nav-link ${add ? 'bottom-nav-link--add' : ''}`}
            data-active={isRouteActive(location.pathname, to)}
            key={`${label}-${to}`}
            to={to}
          >
            <div className="bottom-nav-icon">
              <Icon size={add ? 24 : 18} strokeWidth={1.8} />
            </div>
            <span>{add || isRouteActive(location.pathname, to) ? label : ''}</span>
            <span className="bottom-nav-dot" />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
