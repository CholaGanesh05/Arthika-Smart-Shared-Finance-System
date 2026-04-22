import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/helpers'

const navigation = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/settings', label: 'Settings' },
  { to: '/', label: 'Landing' },
]

function getHeading(pathname) {
  if (pathname.startsWith('/groups/')) {
    return 'Group workspace'
  }

  if (pathname.startsWith('/funds/')) {
    return 'Fund workspace'
  }

  return 'Finance dashboard'
}

export function AppShell() {
  const { logout, user } = useAuth()
  const location = useLocation()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-lockup__badge">AR</span>
          <div>
            <p className="brand-lockup__eyebrow">Smart shared finance</p>
            <h1>Arthika</h1>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__profile">
          <div className="avatar-chip">{getInitials(user?.name)}</div>
          <div>
            <p className="sidebar__profile-label">Signed in as</p>
            <strong>{user?.name}</strong>
            <p>{user?.email}</p>
          </div>
        </div>

        <button className="button button--ghost" type="button" onClick={logout}>
          Sign out
        </button>
      </aside>

      <div className="app-shell__main">
        <header className="topbar">
          <div>
            <p className="topbar__eyebrow">Live workspace</p>
            <h2>{getHeading(location.pathname)}</h2>
          </div>
          <p className="topbar__hint">
            Built from the current API and the Arthika SRS.
          </p>
        </header>
        <main className="page-stack">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
