import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || ''

const api = axios.create({ baseURL })

function readSession() {
  try {
    return JSON.parse(localStorage.getItem('hyundai.session') || 'null')
  } catch {
    return null
  }
}

export function writeSession(session) {
  if (!session) localStorage.removeItem('hyundai.session')
  else localStorage.setItem('hyundai.session', JSON.stringify(session))
}

api.interceptors.request.use((config) => {
  const session = readSession()
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

let refreshTask = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const url = original?.url || ''
    if (error.response?.status !== 401 || original?._retry || url.includes('/api/auth/')) {
      throw error
    }
    const session = readSession()
    if (!session?.refreshToken) throw error
    original._retry = true
    refreshTask ||= axios.post(`${baseURL}/api/auth/refresh`, { refreshToken: session.refreshToken })
    try {
      const { data } = await refreshTask
      refreshTask = null
      writeSession({ ...session, token: data.token, refreshToken: data.refreshToken, user: data.user })
      original.headers.Authorization = `Bearer ${data.token}`
      return api(original)
    } catch (refreshError) {
      refreshTask = null
      writeSession(null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
      throw refreshError
    }
  },
)

export function errorMessage(error) {
  return error?.response?.data?.detail || error?.message || 'Something went wrong. Please try again.'
}

export async function streamMessage(sessionId, body, handlers, signal) {
  const session = readSession()
  const response = await fetch(`${baseURL}/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: session?.token ? `Bearer ${session.token}` : '',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    throw new Error(problem.detail || 'The question could not be sent.')
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() || ''
    for (const frame of frames) {
      let event = 'message'
      const dataLines = []
      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
      }
      if (!dataLines.length) continue
      const parsed = JSON.parse(dataLines.join('\n'))
      if (event === 'token') handlers.onToken?.(parsed)
      if (event === 'sources') handlers.onSources?.(parsed)
      if (event === 'done') handlers.onDone?.(parsed)
      if (event === 'error') handlers.onError?.(parsed)
    }
  }
}

export default api
