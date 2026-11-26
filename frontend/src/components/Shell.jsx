import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Palette,
  PanelLeft,
  Sparkles,
  X
} from 'lucide-react'
import Lenis from 'lenis'
import { useAuth } from '../lib/auth'
import { Avatar } from './ui'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'Consultant', icon: MessageSquare },
  { to: '/compare', label: 'Compare Models', icon: ArrowLeftRight },
  { to: '/recommend', label: 'Car Advisor', icon: Sparkles },
  { to: '/documents', label: 'Brochures', icon: FileText },
  { to: '/design-system', label: 'Design System', icon: Palette },
]

export default function Shell({ title, description, action, fullWidth = false, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('hyundai.sidebar') === 'collapsed')
  const [mobileOpen, setMobileOpen] = useState(false)
  const isChat = location.pathname.startsWith('/chat')

  useEffect(() => {
    localStorage.setItem('hyundai.sidebar', collapsed ? 'collapsed' : 'open')
  }, [collapsed])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  // Lenis smooth scrolling only for page-level scrolling (never inside chat or fixed scrollers)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || isChat) return undefined

    const lenis = new Lenis({
      duration: 1.1,
      lerp: 0.1,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    })

    let frame
    function loop(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [isChat])

  return (
    <div className="h-dvh h-screen w-full flex overflow-hidden bg-canvas text-ink">
      <a href="#content" className="skip-link">
        Skip to main content
      </a>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-xs md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-navy text-white transition-all duration-200 ease-in-out md:static ${
          collapsed ? 'md:w-[72px]' : 'md:w-[264px]'
        } w-[264px] shrink-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-white/10">
          <div className={`flex items-center gap-3 ${collapsed ? 'md:justify-center md:w-full' : ''}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-accent font-heading text-sm font-bold text-white shadow-sm">
              H
            </span>
            <div className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <span className="block truncate font-heading text-sm font-bold tracking-tight text-white">
                Hyundai AI
              </span>
              <span className="block truncate text-[11px] text-white/60">
                Cyepro Solutions
              </span>
            </div>
          </div>
          <button
            className="rounded-[8px] p-2 text-white/70 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Close navigation drawer"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4" data-lenis-prevent>
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                title={collapsed ? link.label : undefined}
                className={({ isActive }) =>
                  `flex min-h-[44px] items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive
                      ? 'bg-accent text-white shadow-sm font-semibold'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  } ${collapsed ? 'md:justify-center md:px-0' : ''}`
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.8} />
                <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{link.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* User Profile & Sign Out Footer */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <div
            className={`flex items-center gap-3 rounded-[8px] p-2 ${
              collapsed ? 'md:justify-center md:p-1' : ''
            }`}
          >
            <Avatar name={user?.fullName || 'Consultant'} size="md" className="border-white/20 text-white bg-white/10" />
            <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
              <p className="truncate text-sm font-medium text-white">{user?.fullName || 'Sales Desk'}</p>
              <p className="truncate text-[11px] text-white/60">{user?.email || 'dealership@hyundai.in'}</p>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              title="Sign out"
              className={`rounded-[8px] p-2 text-white/60 hover:bg-white/10 hover:text-white transition-colors ${
                collapsed ? 'md:hidden' : ''
              }`}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Sticky Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 md:px-8 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Toggle */}
            <button
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[8px] text-ink hover:bg-canvas md:hidden transition-colors"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              className="hidden h-9 w-9 items-center justify-center rounded-[8px] text-muted hover:bg-canvas hover:text-ink md:inline-flex transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((val) => !val)}
            >
              <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
            </button>

            {/* Page Title & Description */}
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg md:text-xl font-bold text-navy">
                {title}
              </h1>
              {description && (
                <p className="hidden truncate text-xs text-muted md:block">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Action Slot */}
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </header>

        {/* Scrollable Page Body */}
        <main
          id="content"
          className={`flex-1 min-h-0 overflow-hidden ${
            isChat ? 'flex flex-col' : 'overflow-y-auto overscroll-contain'
          }`}
          data-lenis-prevent={isChat ? 'true' : undefined}
        >
          {isChat || fullWidth ? (
            children
          ) : (
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
