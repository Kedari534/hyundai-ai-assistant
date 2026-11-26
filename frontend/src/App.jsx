import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import AuthPage from './pages/AuthPage'
import { useAuth } from './lib/auth'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const RecommendPage = lazy(() => import('./pages/RecommendPage'))
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'))

function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) {
    return (
      <div className="grid h-dvh h-screen place-items-center bg-canvas text-sm font-medium text-muted">
        <div className="flex items-center gap-2">
          <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
          Loading Hyundai Sales Desk…
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Guest({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const reduced = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname.split('/')[1] || 'root'}
        className="h-full w-full"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <Suspense
          fallback={
            <div className="grid h-dvh h-screen place-items-center bg-canvas text-xs font-medium text-muted">
              <div className="flex items-center gap-2">
                <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
                Loading…
              </div>
            </div>
          }
        >
          <Routes location={location}>
            {/* Guest Routes */}
            <Route path="/login" element={<Guest><AuthPage mode="login" /></Guest>} />
            <Route path="/register" element={<Guest><AuthPage mode="register" /></Guest>} />

            {/* Authenticated Dealership Desk Routes */}
            <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
            <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
            <Route path="/chat/:sessionId" element={<Protected><ChatPage /></Protected>} />
            <Route path="/compare" element={<Protected><ComparePage /></Protected>} />
            <Route path="/recommend" element={<Protected><RecommendPage /></Protected>} />
            <Route path="/documents" element={<Protected><DocumentsPage /></Protected>} />
            <Route path="/design-system" element={<Protected><DesignSystemPage /></Protected>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}
