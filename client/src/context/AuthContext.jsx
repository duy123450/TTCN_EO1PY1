import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import api from '../api/axios'
import { accessTokenStore } from '../utils/accessTokenStore'
import { normalizeUsername, validateLoginInput } from '../utils/validation'

const AuthContext = createContext(null)

let refreshSessionPromise = null

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const restoreStartedRef = useRef(false)

  const clearAuthState = () => {
    accessTokenStore.clear()
    setUser(null)
    setIsAuthenticated(false)
  }

  const restoreSession = async () => {
    if (refreshSessionPromise) {
      await refreshSessionPromise
      return
    }

    refreshSessionPromise = api
      .post('/auth/refresh')
      .then(({ data }) => {
        const nextToken = data?.data?.accessToken
        const nextUser = data?.data?.user

        if (!nextToken || !nextUser) {
          throw new Error('Refresh response was missing token data')
        }

        accessTokenStore.set(nextToken)
        setUser(nextUser)
        setIsAuthenticated(true)
      })
      .catch(() => {
        clearAuthState()
      })
      .finally(() => {
        setIsLoading(false)
        refreshSessionPromise = null
      })

    await refreshSessionPromise
  }

  useEffect(() => {
    if (restoreStartedRef.current) {
      return
    }

    restoreStartedRef.current = true
    restoreSession()
  }, [])

  useEffect(() => {
    const handleExpiredSession = () => {
      clearAuthState()
    }

    window.addEventListener('auth:expired', handleExpiredSession)

    return () => {
      window.removeEventListener('auth:expired', handleExpiredSession)
    }
  }, [])

  const login = async (username, password, expectedRole) => {
    const validationMessage = validateLoginInput({ username, password })
    if (validationMessage) {
      throw new Error(validationMessage)
    }

    const normalizedUsername = normalizeUsername(username)
    const response = await api.post('/auth/login', {
      username: normalizedUsername,
      password,
    })

    const nextToken = response?.data?.data?.accessToken
    const nextUser = response?.data?.data?.user

    if (!nextToken || !nextUser) {
      throw new Error('Login response was missing token data')
    }

    if (expectedRole && nextUser.role !== expectedRole) {
      const mismatchMessage = `This ${expectedRole.toLowerCase()} portal requires a ${expectedRole.toLowerCase()} account.`
      clearAuthState()

      try {
        await api.post('/auth/logout')
      } catch {
        throw new Error(`${mismatchMessage} The session could not be cleared. Please try again.`)
      }

      throw new Error(mismatchMessage)
    }

    accessTokenStore.set(nextToken)
    setUser(nextUser)
    setIsAuthenticated(true)
    setIsLoading(false)

    return nextUser
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Preserve local logout even when the request fails.
    }

    clearAuthState()
    setIsLoading(false)
    window.location.assign('/login')
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
    }),
    [isAuthenticated, isLoading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
