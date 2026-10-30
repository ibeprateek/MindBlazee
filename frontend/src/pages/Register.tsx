
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../Services/auth'
import AuthLayout from '../components/AuthLayout'

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
    <AuthLayout
      title="Create your account."
      titleQuiet="It takes a minute."
      subtitle="Start building a healthier relationship with your workload."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline decoration-rule underline-offset-4 hover:decoration-ink">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        <div>
          <label htmlFor="fullName" className="mb-label">
            Full name <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            maxLength={100}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your name"
            className="mb-input"
          />
        </div>

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
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="mb-input"
          />
          <p className="mt-2 text-xs text-ink-3">
            Use 8–128 characters.
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="mb-btn w-full !min-h-11">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
