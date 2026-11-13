// Maps Supabase auth errors to clear human messages. Never exposes raw error
// objects, codes or stack traces to the user.

interface AuthErrorLike {
  code?: string
  status?: number
  message?: string
}

export const AUTH_UNKNOWN_MESSAGE = 'Something went wrong. Please try again.'

export function friendlyAuthErrorMessage(error: unknown): string {
  if (error !== null && typeof error === 'object') {
    const authError = error as AuthErrorLike
    const code = authError.code ?? ''
    const message = (authError.message ?? '').toLowerCase()

    if (
      code === 'invalid_credentials' ||
      message.includes('invalid login credentials')
    ) {
      return 'Wrong email or password.'
    }
    if (
      code === 'user_already_exists' ||
      code === 'email_exists' ||
      message.includes('already registered')
    ) {
      return 'This email is already registered. Try logging in instead.'
    }
    if (
      code === 'email_not_confirmed' ||
      message.includes('email not confirmed')
    ) {
      return 'Please confirm your email first — check your inbox.'
    }
    if (
      authError.status === 429 ||
      code.includes('rate_limit') ||
      message.includes('rate limit')
    ) {
      return 'Too many attempts. Please wait a moment and try again.'
    }
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch')
    ) {
      return 'Network problem — check your connection and try again.'
    }
  }
  return AUTH_UNKNOWN_MESSAGE
}
