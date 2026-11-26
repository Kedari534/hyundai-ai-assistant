import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, FileCheck, Shield, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Field, TextInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/api'
import { passwordScore } from '../lib/format'

const proofPoints = [
  {
    icon: FileCheck,
    title: 'Brochure-Grounded Intelligence',
    desc: 'Consultant answers only from uploaded official Hyundai brochures.',
  },
  {
    icon: Shield,
    title: 'Verified Page Citations',
    desc: 'Every engine spec, dimension, and variant fact links directly to its source PDF page.',
  },
  {
    icon: Sparkles,
    title: 'Side-by-Side Model Comparisons',
    desc: 'Compare dimensions, boot space, ADAS features, and powertrains in seconds.',
  },
]

export default function AuthPage({ mode = 'login' }) {
  const isRegister = mode === 'register'
  const auth = useAuth()
  const navigate = useNavigate()

  // Always start with completely empty fields (no hardcoded credentials)
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const score = passwordScore(form.password)

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function validate() {
    const nextErrors = {}
    if (isRegister && form.fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your full name.'
    }
    if (!form.email.trim()) {
      nextErrors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Please enter a valid email address.'
    }
    if (!form.password) {
      nextErrors.password = 'Password is required.'
    } else if (form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      if (isRegister) {
        await auth.register(form)
        toast.success('Account created successfully!')
      } else {
        await auth.login({ email: form.email, password: form.password })
        toast.success('Welcome back!')
      }
      navigate('/dashboard')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-dvh h-screen w-full grid lg:grid-cols-2 bg-canvas overflow-y-auto lg:overflow-hidden">
      {/* Left Column: Automotive Brand Panel */}
      <section className="brand-panel hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Subtle Brand Accent Ring */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute -right-12 -top-12 h-72 w-72 rounded-full border border-accent/20 pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent font-heading text-base font-bold text-white shadow-md">
            H
          </span>
          <div>
            <span className="block font-heading text-base font-bold tracking-tight text-white">
              Hyundai AI Assistant
            </span>
            <span className="block text-xs font-medium text-white/60">
              Cyepro Solutions Dealership Suite
            </span>
          </div>
        </div>

        {/* Central Value Proposition */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold text-accent-tint border border-white/10 mb-6">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            Official Hyundai Dealership Intelligence
          </div>
          <h1 className="font-heading text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
            The Hyundai brochure, answered instantly.
          </h1>
          <p className="mt-5 text-base text-white/80 leading-relaxed">
            Eliminate customer guesswork. Ground every sales answer in official Hyundai product brochures with zero hallucination.
          </p>

          {/* Proof Points */}
          <div className="mt-10 space-y-5">
            {proofPoints.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-white/10 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <p className="text-xs text-white/70 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-6">
          <span>Enterprise Dealer Workspace</span>
          <span>Security: TLS 1.3 & Encrypted RAG</span>
        </div>
      </section>

      {/* Right Column: Vertically Centered Form Card */}
      <section className="flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 relative">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-accent font-heading text-sm font-bold text-white">
              H
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold text-navy">Hyundai AI Assistant</h2>
              <p className="text-xs text-muted">Cyepro Solutions</p>
            </div>
          </div>

          {/* Auth Card */}
          <div className="rounded-[16px] border border-line bg-surface p-7 md:p-9 shadow-[var(--shadow-raised)]">
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold text-navy">
                {isRegister ? 'Create staff account' : 'Sign in to dealership desk'}
              </h2>
              <p className="mt-1.5 text-xs text-muted">
                {isRegister
                  ? 'Access the AI brochure assistant and specification comparison matrix.'
                  : 'Enter your credentials to access the Hyundai sales workspace.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {isRegister && (
                <Field label="Full Name" error={errors.fullName} required>
                  <TextInput
                    id="fullName"
                    value={form.fullName}
                    placeholder="e.g. Sales Consultant"
                    autoComplete="name"
                    invalid={!!errors.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                  />
                </Field>
              )}

              <Field label="Email Address" error={errors.email} required>
                <TextInput
                  id="email"
                  type="email"
                  value={form.email}
                  placeholder="consultant@hyundai.in"
                  autoComplete="email"
                  invalid={!!errors.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </Field>

              <Field
                label="Password"
                error={errors.password}
                hint={isRegister ? 'Must be at least 8 characters long.' : undefined}
                required
              >
                <div className="relative">
                  <TextInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    placeholder="••••••••"
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    invalid={!!errors.password}
                    className="pr-11"
                    onChange={(e) => updateField('password', e.target.value)}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-[6px] text-muted hover:text-ink transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter for Registration */}
                {isRegister && form.password.length > 0 && (
                  <div className="mt-2.5">
                    <div className="flex gap-1.5" aria-hidden="true">
                      {[0, 1, 2, 3].map((index) => {
                        const filled = score > index
                        let colorClass = 'bg-line'
                        if (filled) {
                          if (score <= 1) colorClass = 'bg-danger'
                          else if (score === 2) colorClass = 'bg-warning'
                          else colorClass = 'bg-success'
                        }
                        return (
                          <span
                            key={index}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${colorClass}`}
                          />
                        )
                      })}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                      <span>Strength</span>
                      <span className="font-medium">
                        {score <= 1 && 'Weak'}
                        {score === 2 && 'Fair'}
                        {score === 3 && 'Good'}
                        {score >= 4 && 'Strong'}
                      </span>
                    </div>
                  </div>
                )}
              </Field>

              <div className="pt-2">
                <Button type="submit" loading={loading} className="w-full font-semibold">
                  {isRegister ? 'Create Account' : 'Sign In'}
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-line pt-4 text-center text-xs text-muted">
              {isRegister ? 'Already have a staff account?' : 'Need staff credentials?'}{' '}
              <Link
                to={isRegister ? '/login' : '/register'}
                className="font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-[2px]"
              >
                {isRegister ? 'Sign in here' : 'Register new account'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
