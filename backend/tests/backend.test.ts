import { validatePassword, isValidEmail } from '../src/utils/validation';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Backend Utils Tests', () => {
  // Password validation tests (3 tests)
  describe('Password Validation', () => {
    test('should accept valid password', () => {
      const result = validatePassword('Password123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject short password', () => {
      const result = validatePassword('Pass1!');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject password without uppercase', () => {
      const result = validatePassword('password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must include an uppercase letter');
    });
  });

  // Email validation tests (2 tests)
  describe('Email Validation', () => {
    test('should accept valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(isValidEmail('notanemail')).toBe(false);
    });
  });

  // Password hashing tests (2 tests)
  describe('Password Hashing', () => {
    test('should hash password successfully', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 10);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });
  });

  // JWT tests (3 tests)
  describe('JWT Operations', () => {
    const SECRET = 'test-secret-key';

    test('should create valid JWT token', () => {
      const token = jwt.sign({ sub: '123' }, SECRET, { expiresIn: '1h' });
      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    test('should verify and decode token', () => {
      const payload = { sub: '123', email: 'test@test.com' };
      const token = jwt.sign(payload, SECRET);
      const decoded = jwt.verify(token, SECRET) as any;
      expect(decoded.sub).toBe(payload.sub);
    });

    test('should reject invalid token', () => {
      const token = jwt.sign({ sub: '123' }, SECRET);
      expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
    });
  });
});
