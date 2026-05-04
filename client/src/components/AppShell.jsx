import { useEffect, useRef, useState } from 'react'
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
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { getInitials } from '../utils/helpers'
import { api } from '../services/api'
import { getSocket } from '../services/socket'
import { formatRelativeDate } from '../utils/format'

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
  const { logout, user, token } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const dropdownRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [cachedGroups, setCachedGroups] = useState([])
  const searchRef = useRef(null)

  useEffect(() => {
    if (!token) return

    const socket = getSocket()
    socket.connect()

    async function initializeSocket() {
      try {
        const payload = await api.getGroups(token)
        const groups = payload?.data || []
        
        // Join rooms
        groups.forEach(g => {
          const groupId = typeof g === 'string' ? g : g._id
          socket.emit('joinGroup', groupId)
        })

        // Fetch recent notifications for all groups
        const allNotifs = []
        for (const g of groups) {
          const groupId = typeof g === 'string' ? g : g._id
          try {
            const notifPayload = await api.getGroupNotifications(token, groupId)
            if (notifPayload?.data) {
              allNotifs.push(...notifPayload.data)
            }
          } catch (e) {
            // ignore if empty
          }
        }
        // Sort by date desc
        allNotifs.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp))
        setNotifications(allNotifs.slice(0, 20))
      } catch (err) {
        console.error('Failed to get groups for socket', err)
      }
    }
    initializeSocket()

    function handleNotification(notification) {
      setNotifications(prev => {
        if (prev.find(n => n._id === notification._id)) return prev
        return [notification, ...prev]
      })
    }

    socket.on('notification:new', handleNotification)

    return () => {
      socket.off('notification:new', handleNotification)
    }
  }, [token])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch groups for search cache
  useEffect(() => {
    if (!token) return
    api.getGroups(token).then(payload => {
      setCachedGroups(payload?.data || [])
    }).catch(() => {})
  }, [token])

  // Close search on route change
  useEffect(() => {
    setSearchQuery('')
    setShowSearch(false)
  }, [location.pathname])

  function handleSearchChange(e) {
    const q = e.target.value
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      setShowSearch(false)
      return
    }
    const lower = q.toLowerCase()
    const matched = cachedGroups.filter(g =>
      g.name?.toLowerCase().includes(lower) ||
      g.description?.toLowerCase().includes(lower)
    )
    setSearchResults(matched)
    setShowSearch(true)
  }

  function handleSearchSelect(group) {
    setSearchQuery('')
    setShowSearch(false)
    navigate(`/groups/${group._id}`)
  }

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

          <div ref={searchRef} className="topbar-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search style={{ position: 'absolute', left: '0.9rem', color: 'rgba(255,255,255,0.7)', pointerEvents: 'none', zIndex: 1 }} size={16} strokeWidth={1.8} />
            <input
              aria-label="Search groups, expenses"
              className="fin-input topbar-search-input with-left-icon"
              placeholder="Search groups, expenses…"
              type="search"
              style={{ height: 40, fontSize: '0.875rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowSearch(true)}
              autoComplete="off"
            />
            {showSearch && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 0.5rem)', left: 0, right: 0,
                background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)',
                borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden'
              }}>
                {searchResults.length > 0 ? searchResults.map(group => (
                  <button
                    key={group._id}
                    type="button"
                    onClick={() => handleSearchSelect(group)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1rem', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--glass-border)', transition: 'background 120ms'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: 'var(--primary-glow)',
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem'
                    }}>
                      {group.name?.[0]?.toUpperCase() || 'G'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</p>
                      {group.description && (
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.description}</p>
                      )}
                    </div>
                  </button>
                )) : (
                  <div style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No groups found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ThemeToggle lightColor="#fff" />
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button 
                aria-label="Notifications" 
                className="btn btn-ghost btn-icon" 
                style={{ width: 40, height: 40, minWidth: 40, padding: 0, borderRadius: 10, color: '#fff' }} 
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={18} strokeWidth={1.8} />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
                )}
              </button>

              {showNotifications && (
                <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, width: 320, background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', borderRadius: 16, boxShadow: 'var(--shadow-dropdown)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Notifications</h3>
                  </div>
                  <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                    {notifications.length ? notifications.map(notif => (
                      <div key={notif._id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{notif.message}</p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatRelativeDate(notif.createdAt || notif.timestamp)}
                        </span>
                      </div>
                    )) : (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No new notifications.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
