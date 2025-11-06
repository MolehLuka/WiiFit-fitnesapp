export const MIN_PASSWORD_LENGTH = 8

export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
  return re.test(email)
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, errors: ['Password is required'] }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Include a lowercase letter')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Include an uppercase letter')
  }
  if (!/\d/.test(password)) {
    errors.push('Include a number')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Include a special character')
  }
  return { valid: errors.length === 0, errors }
}
