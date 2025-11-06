import { Router } from 'express';
import authRoutes from './auth';
import protectedRoutes from './protected';
import publicRoutes from './public';
import billingRoutes from './billing';

const router = Router();

router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);
router.use('/public', publicRoutes);
router.use('/billing', billingRoutes);

export default router;
