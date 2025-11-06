import { Router } from 'express';
import authRoutes from './auth';
import protectedRoutes from './protected';

const router = Router();

router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);

export default router;
