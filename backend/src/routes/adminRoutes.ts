import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import { adminEmailSchema } from '../validation/adminSchemas';
import { sendManualEmail } from '../controllers/adminController';
import { adminRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/send-email', authenticate, requireAdmin, adminRateLimiter, validate(adminEmailSchema), sendManualEmail);

export default router;
