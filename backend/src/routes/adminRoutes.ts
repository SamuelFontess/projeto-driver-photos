import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import { adminEmailSchema, broadcastSchema } from '../validation/adminSchemas';
import { sendManualEmail, sendBroadcast } from '../controllers/adminController';
import { adminRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/send-email', authenticate, requireAdmin, adminRateLimiter, validate(adminEmailSchema), sendManualEmail);
router.post('/broadcast', authenticate, requireAdmin, adminRateLimiter, validate(broadcastSchema), sendBroadcast);

export default router;
