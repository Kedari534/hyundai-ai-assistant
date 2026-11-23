import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { writeSession } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('hyundai.session')
    if (!raw) {
      setReady(true)
      return
    }
    api.get('/api/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => writeSession(null))
      .finally(() => setReady(true))
  }, [])

  const value = useMemo(() => ({
    user,
    ready,
    async login(payload) {
      const { data } = await api.post('/api/auth/login', payload)
      writeSession(data)
      setUser(data.user)
      return data.user
    },
    async register(payload) {
      const { data } = await api.post('/api/auth/register', payload)
      writeSession(data)
      setUser(data.user)
      return data.user
    },
    logout() {
      writeSession(null)
      setUser(null)
    },
  }), [user, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
