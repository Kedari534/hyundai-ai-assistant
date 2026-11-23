import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AuthPage from './pages/AuthPage'
import { useAuth } from './lib/auth'

const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'))

function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="grid min-h-full place-items-center text-sm text-muted">Loading the desk…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Guest({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to="/chat" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const reduced = useReducedMotion()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="min-h-full"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Suspense fallback={<div className="grid min-h-full place-items-center text-sm text-muted">Loading…</div>}>
          <Routes location={location}>
            <Route path="/login" element={<Guest><AuthPage mode="login" /></Guest>} />
            <Route path="/register" element={<Guest><AuthPage mode="register" /></Guest>} />
            <Route path="/documents" element={<Protected><DocumentsPage /></Protected>} />
            <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
            <Route path="/chat/:sessionId" element={<Protected><ChatPage /></Protected>} />
            <Route path="/design-system" element={<Protected><DesignSystemPage /></Protected>} />
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
