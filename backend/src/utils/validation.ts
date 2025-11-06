// Basic input validation utilities for auth flows

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  // Simple RFC 5322-inspired email pattern sufficient for typical validation
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must include a lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include an uppercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must include a number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must include a special character');
  }
  return { valid: errors.length === 0, errors };
}
