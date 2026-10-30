
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../Services/auth'
import AuthLayout from '../components/AuthLayout'

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
    <AuthLayout
      title="Good to see you."
      titleQuiet="Let's plan your day."
      subtitle="Sign in to organise your workload and make room for focus."
      footer={<>Your wellbeing matters as much as your productivity.</>}
    >
      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        <div>
          <label htmlFor="email" className="mb-label">
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
            className="mb-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-label">
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
            className="mb-input"
          />
        </div>

        {error && (
          <p role="alert" className="mb-alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="mb-btn w-full !min-h-11">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        New to MindBlaze?{' '}
        <Link to="/register" className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
