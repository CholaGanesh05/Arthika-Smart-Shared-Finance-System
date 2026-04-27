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
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-screen bg-slate-50">
      <aside className="sticky top-0 h-screen flex flex-col gap-6 p-6 border-r border-slate-200 bg-white shadow-fin-sm z-10 overflow-y-auto hidden md:flex">
        <div className="flex items-center gap-4">
          <span className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center font-display font-bold text-xl shadow-fin-sm">AR</span>
          <div>
            <p className="text-xs font-bold text-accent tracking-widest uppercase mb-0.5">Smart shared finance</p>
            <h1 className="text-2xl font-display font-bold text-brand m-0">Arthika</h1>
          </div>
        </div>

        <nav className="flex flex-col gap-2 mt-4" aria-label="Primary">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                `px-4 py-3 rounded-xl font-semibold transition-fin flex items-center gap-3 ${isActive ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50 hover:text-brand'}`
              }
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 border border-slate-200 rounded-2xl bg-slate-50 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm">{getInitials(user?.name)}</div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-500 truncate">Signed in as</p>
            <strong className="block text-sm text-brand truncate">{user?.name}</strong>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button className="btn btn-ghost w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" type="button" onClick={logout}>
          Sign out
        </button>
      </aside>

      <div className="p-4 md:p-8 flex flex-col gap-8 w-full max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-bold text-accent tracking-widest uppercase mb-1">Live workspace</p>
            <h2 className="text-3xl font-display font-bold text-brand m-0">{getHeading(location.pathname)}</h2>
          </div>
          <p className="text-sm text-slate-500 max-w-md text-left md:text-right">
            Built from the current API and the Arthika SRS.
          </p>
        </header>
        <main className="flex flex-col gap-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
