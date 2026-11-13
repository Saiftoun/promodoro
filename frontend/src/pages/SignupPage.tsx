import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { validateSignupForm, type FieldErrors } from '../lib/authValidation.js'

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const validation = validateSignupForm(email, password, confirmPassword)
    setFieldErrors(validation.errors)
    if (!validation.valid) {
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password)
      if (needsEmailConfirmation) {
        setConfirmationSent(true)
      } else {
        navigate('/', { replace: true })
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function clearFieldError(field: string) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  if (confirmationSent) {
    return (
      <section className="auth-page" aria-label="Sign up">
        <h2>Check your email</h2>
        <p className="auth-notice">
          Check your email to confirm your account, then log in.
        </p>
        <Link to="/login" className="auth-link">
          Go to log in
        </Link>
      </section>
    )
  }

  return (
    <section className="auth-page" aria-label="Sign up">
      <h2>Sign up</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              clearFieldError('email')
            }}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
          />
          <p className="form-error" id="signup-email-error" aria-live="polite">
            {fieldErrors.email ?? ''}
          </p>
        </div>
        <div className="form-field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              clearFieldError('password')
            }}
            aria-invalid={fieldErrors.password ? true : undefined}
            aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
          />
          <p className="form-error" id="signup-password-error" aria-live="polite">
            {fieldErrors.password ?? ''}
          </p>
        </div>
        <div className="form-field">
          <label htmlFor="signup-confirm">Confirm password</label>
          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              clearFieldError('confirmPassword')
            }}
            aria-invalid={fieldErrors.confirmPassword ? true : undefined}
            aria-describedby={fieldErrors.confirmPassword ? 'signup-confirm-error' : undefined}
          />
          <p className="form-error" id="signup-confirm-error" aria-live="polite">
            {fieldErrors.confirmPassword ?? ''}
          </p>
        </div>
        <p className="form-error form-error-global" aria-live="assertive">
          {formError}
        </p>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  )
}
