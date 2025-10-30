import { Router } from 'express';
import { login, register, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/logout', requireAuth, logout);

export default authRoutes;
