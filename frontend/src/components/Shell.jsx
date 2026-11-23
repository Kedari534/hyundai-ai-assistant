import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FileText, Menu, MessageSquare, PanelLeft, X } from 'lucide-react'
import Lenis from 'lenis'
import { useAuth } from '../lib/auth'

const links = [
  { to: '/chat', label: 'Consultant', icon: MessageSquare },
  { to: '/documents', label: 'Brochures', icon: FileText },
]

export default function Shell({ title, description, action, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('hyundai.sidebar') === 'collapsed')
  const [open, setOpen] = useState(false)
  const chat = location.pathname.startsWith('/chat')

  useEffect(() => {
    localStorage.setItem('hyundai.sidebar', collapsed ? 'collapsed' : 'open')
  }, [collapsed])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || chat) return undefined
    const lenis = new Lenis({ duration: 1.1, lerp: 0.1 })
    let frame
    const loop = (time) => {
      lenis.raf(time)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [chat])

  const initials = (user?.fullName || 'U').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-full bg-canvas text-ink">
      <a href="#content" className="skip-link">Skip to content</a>
      {open && <button className="fixed inset-0 z-30 bg-navy/40 md:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-navy text-white transition-[width,transform] duration-200 ${collapsed ? 'md:w-[72px]' : 'md:w-[264px]'} w-[264px] ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex h-16 items-center justify-between px-4">
          <div className={`flex items-center gap-3 ${collapsed ? 'md:justify-center' : ''}`}>
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-white/10 font-heading text-sm">H</span>
            <span className={collapsed ? 'md:hidden' : ''}>
              <span className="block font-heading text-sm">Hyundai AI</span>
              <span className="block text-xs text-white/60">Cyepro Solutions</span>
            </span>
          </div>
          <button className="md:hidden" aria-label="Close navigation" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3" data-lenis-prevent>
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-sm ${isActive ? 'bg-white/10' : 'text-white/75 hover:bg-white/5'} ${collapsed ? 'md:justify-center md:px-0' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                <span className={collapsed ? 'md:hidden' : ''}>{link.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            className="flex min-h-11 w-full items-center gap-3 rounded-[8px] px-2 text-left hover:bg-white/5"
            onClick={() => { logout(); navigate('/login') }}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{initials}</span>
            <span className={`min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
              <span className="block truncate text-sm">{user?.fullName}</span>
              <span className="block truncate text-xs text-white/60">Sign out</span>
            </span>
          </button>
        </div>
      </aside>
      <div className={collapsed ? 'md:pl-[72px]' : 'md:pl-[264px]'}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur md:px-8">
          <button className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] md:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <button className="hidden h-11 w-11 items-center justify-center rounded-[8px] hover:bg-white md:inline-flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)}>
            <PanelLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-lg md:text-xl">{title}</h1>
            {description ? <p className="hidden truncate text-sm text-muted md:block">{description}</p> : null}
          </div>
          {action}
        </header>
        <main id="content" className={chat ? 'h-[calc(100vh-64px)]' : 'mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8'}>
          {children}
        </main>
      </div>
    </div>
  )
}
