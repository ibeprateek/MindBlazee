
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../Services/auth'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginUser({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to log in.')
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
          WELCOME BACK
        </p>
        <h1 className="mt-2 font-[Manrope] text-3xl font-bold">Good to see you.</h1>
        <p className="mt-2 text-sm leading-6 text-[#7b837b]">
          Sign in to organise your workload and make room for focus.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-[#dfe7dd] bg-white/75 px-4 py-3 text-sm outline-none transition focus:border-[#397858] focus:ring-4 focus:ring-[#397858]/10"
            />
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-[#7b837b]">
          New to MindBlaze?{' '}
          <Link to="/register" className="font-semibold text-[#397858] hover:underline">
            Create an account
          </Link>
        </p>

        <p className="mt-7 text-center text-xs text-[#929991]">
          Your wellbeing matters as much as your productivity.
        </p>
      </div>
    </main>
  )
}
