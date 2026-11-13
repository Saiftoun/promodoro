// Pure auth input validation. No dependencies, no side effects: every
// function returns an error message or null.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | null {
  if (value.trim() === '') {
    return 'Email is required.'
  }
  if (!EMAIL_PATTERN.test(value.trim())) {
    return 'Enter a valid email address.'
  }
  return null
}

export function validatePassword(value: string): string | null {
  if (value === '') {
    return 'Password is required.'
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters.'
  }
  return null
}

export function validateConfirmPassword(
  password: string,
  confirm: string,
): string | null {
  if (confirm === '') {
    return 'Please confirm your password.'
  }
  if (confirm !== password) {
    return 'Passwords do not match.'
  }
  return null
}

export type FieldErrors = Record<string, string>

export function validateLoginForm(email: string, password: string) {
  const errors: FieldErrors = {}
  const emailError = validateEmail(email)
  const passwordError = validatePassword(password)
  if (emailError) errors.email = emailError
  if (passwordError) errors.password = passwordError
  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateSignupForm(
  email: string,
  password: string,
  confirmPassword: string,
) {
  const errors: FieldErrors = {}
  const emailError = validateEmail(email)
  const passwordError = validatePassword(password)
  const confirmError = validateConfirmPassword(password, confirmPassword)
  if (emailError) errors.email = emailError
  if (passwordError) errors.password = passwordError
  if (confirmError) errors.confirmPassword = confirmError
  return { valid: Object.keys(errors).length === 0, errors }
}
