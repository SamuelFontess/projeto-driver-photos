import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFamily,
  deleteFamily,
  inviteMember,
  listFamilies,
  listInvitations,
  listMembers,
  removeMember,
  replyInvitation,
  updateFamily,
} from '../controllers/familyController';
import {
  createFamilyInviteSchema,
  createFamilySchema,
  familyIdParamSchema,
  invitationIdParamSchema,
  memberUserIdParamSchema,
  updateFamilySchema,
  updateInvitationSchema,
} from '../validation/familySchemas';

const router = Router();

router.use(authenticate);

router.post('/', validate(createFamilySchema), createFamily);
router.get('/', listFamilies);
router.patch('/:familyId', validate(familyIdParamSchema, 'params'), validate(updateFamilySchema), updateFamily);
router.delete('/:familyId', validate(familyIdParamSchema, 'params'), deleteFamily);

router.post(
  '/:familyId/invites',
  validate(familyIdParamSchema, 'params'),
  validate(createFamilyInviteSchema),
  inviteMember
);
router.get('/invitations', listInvitations);
router.patch(
  '/invitations/:id',
  validate(invitationIdParamSchema, 'params'),
  validate(updateInvitationSchema),
  replyInvitation
);

router.get('/:familyId/members', validate(familyIdParamSchema, 'params'), listMembers);
router.delete('/:familyId/members/:userId', validate(memberUserIdParamSchema, 'params'), removeMember);

export default router;
