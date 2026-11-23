import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Field, TextInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/api'
import { passwordScore } from '../lib/format'

const points = [
  'Answers grounded in official brochures',
  'Source and page citations',
  'Compare models in seconds',
]

export default function AuthPage({ mode }) {
  const register = mode === 'register'
  const auth = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const score = passwordScore(form.password)

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function validate() {
    const next = {}
    if (register && form.fullName.trim().length < 2) next.fullName = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (form.password.length < 8) next.password = 'Use at least 8 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (register) await auth.register(form)
      else await auth.login({ email: form.email, password: form.password })
      navigate('/chat')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <section className="brand-panel hidden flex-col justify-between p-12 text-white lg:flex">
        <div>
          <p className="text-sm text-white/70">Cyepro Solutions</p>
          <h1 className="mt-10 max-w-md font-heading text-[40px] text-white">The brochure, answered.</h1>
          <p className="mt-4 max-w-sm text-white/75">A dealership consultant that reads only the Hyundai PDFs you upload.</p>
        </div>
        <ul className="space-y-3 text-sm">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {point}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-sm text-muted">Cyepro Solutions</p>
            <h1 className="font-heading text-3xl">Hyundai AI Assistant</h1>
          </div>
          <div className="rounded-[16px] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] md:p-8">
            <h2 className="font-heading text-2xl">{register ? 'Create your account' : 'Sign in'}</h2>
            <p className="mt-1 text-sm text-muted">{register ? 'For dealership staff using the brochure library.' : 'Use the email and password for your dealership account.'}</p>
            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              {register && (
                <Field label="Full name" error={errors.fullName}>
                  <TextInput value={form.fullName} invalid={!!errors.fullName} autoComplete="name" onChange={(event) => update('fullName', event.target.value)} />
                </Field>
              )}
              <Field label="Email" error={errors.email}>
                <TextInput type="email" value={form.email} invalid={!!errors.email} autoComplete="email" onChange={(event) => update('email', event.target.value)} />
              </Field>
              <Field label="Password" error={errors.password} hint={register ? 'At least 8 characters.' : undefined}>
                <div className="relative">
                  <TextInput type={show ? 'text' : 'password'} value={form.password} invalid={!!errors.password} autoComplete={register ? 'new-password' : 'current-password'} onChange={(event) => update('password', event.target.value)} />
                  <button type="button" className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-[8px]" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((value) => !value)}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {register && (
                  <div className="mt-2 flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((index) => (
                      <span key={index} className={`h-1 flex-1 rounded-full ${score > index ? 'bg-accent' : 'bg-line'}`} />
                    ))}
                  </div>
                )}
              </Field>
              <Button className="w-full" loading={loading} type="submit">{register ? 'Create account' : 'Sign in'}</Button>
            </form>
            <p className="mt-4 text-sm text-muted">
              {register ? 'Already have an account?' : 'New to the desk?'}{' '}
              <Link className="font-medium text-accent" to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
