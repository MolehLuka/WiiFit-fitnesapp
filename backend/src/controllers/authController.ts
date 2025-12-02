import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query } from '../db';
import { isValidEmail, validatePassword } from '../utils/validation';
import { User } from '../types/user';

function signToken(payload: object, opts?: jwt.SignOptions & { jwtid?: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, secret, { expiresIn: '7d', ...opts });
}

export async function register(req: Request, res: Response) {
  const { email, password, full_name, gender, date_of_birth, height_cm, weight_kg, goal } = req.body as Partial<User> & { password?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  // Basic email format and password policy checks
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  const pwd = validatePassword(password);
  if (!pwd.valid) {
    return res.status(400).json({ message: pwd.errors.join(', ') });
  }

  const existing = await query<User>(
    'SELECT id FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Email already registered' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const inserted = await query<User>(
    `INSERT INTO users (
      email, password_hash, full_name, gender, date_of_birth, height_cm, weight_kg, goal, membership_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
    RETURNING id, email, full_name, gender, date_of_birth, height_cm, weight_kg, goal, membership_status, is_admin, created_at, updated_at`,
    [
      email.toLowerCase(),
      password_hash,
      full_name ?? null,
      gender ?? null,
      date_of_birth ?? null,
      height_cm ?? null,
      weight_kg ?? null,
      goal ?? null,
    ]
  );
  const user = inserted.rows[0];

  const jti = randomUUID();
  const token = signToken({ sub: String(user.id) }, { jwtid: jti });
  return res.status(201).json({ token, user });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const found = await query<Required<User>>(
    'SELECT id, email, full_name, gender, date_of_birth, height_cm, weight_kg, goal, membership_status, is_admin, created_at, updated_at, password_hash FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (found.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = found.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const jti = randomUUID();
  const token = signToken({ sub: String(user.id) }, { jwtid: jti });
  const { password_hash, ...safeUser } = user as any;
  return res.status(200).json({ token, user: safeUser });
}

export async function logout(req: Request, res: Response) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(400).json({ message: 'Missing Authorization header' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    const jti = payload.jti;
    const exp = payload.exp; // seconds since epoch
    if (!jti || !exp) {
      return res.status(400).json({ message: 'Token missing jti/exp' });
    }
    await query(
      'INSERT INTO jwt_blacklist (jti, expires_at) VALUES ($1, to_timestamp($2)) ON CONFLICT (jti) DO NOTHING',
      [jti, exp]
    );
    return res.status(200).json({ message: 'Logged out' });
  } catch (_err) {
    return res.status(400).json({ message: 'Invalid token' });
  }
}
