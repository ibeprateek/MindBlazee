
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../Services/auth'

export default function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      await registerUser({
        full_name: fullName.trim() || null,
        email: email.trim(),
        password,
      })
      navigate('/login', {
        replace: true,
        state: { message: 'Account created successfully. Please sign in.' },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="glass-panel w-full max-w-md rounded-3xl p-7 sm:p-10">
        <Link to="/" className="mb-9 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#397858] text-xl font-bold text-white">
            M
          </span>
          <span className="font-[Manrope] text-2xl font-extrabold">mindblaze</span>
        </Link>

        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5b8a67]">
          YOUR SPACE TO GROW
        </p>
        <h1 className="mt-2 font-[Manrope] text-3xl font-bold">Create your account.</h1>
        <p className="mt-2 text-sm leading-6 text-[#7b837b]">
          Start building a healthier relationship with your workload.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
              Full name <span className="font-normal text-[#929991]">(optional)</span>
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              maxLength={100}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-[#dfe7dd] bg-white/75 px-4 py-3 text-sm outline-none transition focus:border-[#397858] focus:ring-4 focus:ring-[#397858]/10"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[#dfe7dd] bg-white/75 px-4 py-3 text-sm outline-none transition focus:border-[#397858] focus:ring-4 focus:ring-[#397858]/10"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-[#dfe7dd] bg-white/75 px-4 py-3 text-sm outline-none transition focus:border-[#397858] focus:ring-4 focus:ring-[#397858]/10"
            />
            <p className="mt-2 text-xs text-[#929991]">
              Use 8–128 characters.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#397858] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#397858]/15 transition hover:bg-[#2c6447] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-[#7b837b]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#397858] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
