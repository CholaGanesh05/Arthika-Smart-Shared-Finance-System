/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from 'react'
import { api } from '../services/api'
import { normalizeUser, readJsonStorage, writeJsonStorage } from '../utils/helpers'

const AUTH_STORAGE_KEY = 'arthika-auth-session'
const AuthContext = createContext(null)

function readStoredSession() {
  return readJsonStorage(AUTH_STORAGE_KEY, {
    token: '',
    user: null,
  })
}

function persistSession(session) {
  if (!session?.token) {
    writeJsonStorage(AUTH_STORAGE_KEY, null)
    return
  }

  writeJsonStorage(AUTH_STORAGE_KEY, session)
}

function extractSession(payload) {
  const user = normalizeUser(payload?.data?.user)
  const token = payload?.data?.token ?? ''

  return { user, token }
}

export function AuthProvider({ children }) {
  const storedSession = readStoredSession()
  const [token, setToken] = useState(storedSession.token)
  const [user, setUser] = useState(storedSession.user)
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(storedSession.token))

  function clearSession() {
    startTransition(() => {
      setToken('')
      setUser(null)
      setIsBootstrapping(false)
    })
    persistSession(null)
  }

  useEffect(() => {
    if (!token) {
      return undefined
    }

    const controller = new AbortController()

    async function bootstrapSession() {
      setIsBootstrapping(true)

      try {
        const payload = await api.getMe(token, controller.signal)
        const nextUser = normalizeUser(payload?.user)

        startTransition(() => {
          setUser(nextUser)
        })

        persistSession({ token, user: nextUser })
      } catch {
        clearSession()
      } finally {
        setIsBootstrapping(false)
      }
    }

    void bootstrapSession()

    return () => controller.abort()
  }, [token])

  async function login(credentials) {
    const payload = await api.login(credentials)
    const session = extractSession(payload)

    startTransition(() => {
      setToken(session.token)
      setUser(session.user)
    })

    persistSession(session)
    return session.user
  }

  async function register(details) {
    const payload = await api.register(details)
    const session = extractSession(payload)

    startTransition(() => {
      setToken(session.token)
      setUser(session.user)
    })

    persistSession(session)
    return session.user
  }

  function logout() {
    clearSession()
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    isBootstrapping,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
