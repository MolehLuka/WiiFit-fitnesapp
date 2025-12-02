import { Router } from 'express';
import authRoutes from './auth';
import protectedRoutes from './protected';
import publicRoutes from './public';
import billingRoutes from './billing';
import trainersRoutes from './trainers';
import adminRoutes from './admin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);
router.use('/public', publicRoutes);
router.use('/billing', billingRoutes);
router.use('/trainers', trainersRoutes);
router.use('/admin', adminRoutes);

export default router;
