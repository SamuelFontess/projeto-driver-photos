import { request } from './client';

export type FamilyMemberStatus = 'pending' | 'accepted' | 'declined';
export type FamilyInvitationAction = 'accept' | 'decline';

export interface FamilyUserSummary {
  id: string;
  email: string;
  name: string | null;
}

export interface FamilySummary {
  id: string;
  name: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    members: number;
  };
}

export interface FamilyInvitation {
  id: string;
  familyId: string;
  userId: string | null;
  email: string;
  status: FamilyMemberStatus;
  invitedById: string;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyInvitationWithFamily extends FamilyInvitation {
  family: {
    id: string;
    name: string | null;
    ownerId: string;
  };
}

export interface FamilyMember extends FamilyInvitation {
  user?: FamilyUserSummary | null;
}

export interface FamilyWithOwner {
  id: string;
  name: string | null;
  owner: FamilyUserSummary;
}

export async function createFamily(name?: string): Promise<{ family: FamilySummary }> {
  return request<{ family: FamilySummary }>('/api/families', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function getFamilies(): Promise<{ families: FamilySummary[] }> {
  return request<{ families: FamilySummary[] }>('/api/families', { method: 'GET' });
}

export async function inviteFamilyMember(
  familyId: string,
  email: string
): Promise<{ invitation: FamilyInvitation }> {
  return request<{ invitation: FamilyInvitation }>(
    `/api/families/${encodeURIComponent(familyId)}/invites`,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  );
}

export async function getFamilyInvitations(): Promise<{ invitations: FamilyInvitationWithFamily[] }> {
  return request<{ invitations: FamilyInvitationWithFamily[] }>('/api/families/invitations', {
    method: 'GET',
  });
}

export async function replyFamilyInvitation(
  invitationId: string,
  action: FamilyInvitationAction
): Promise<{ invitation: FamilyInvitation }> {
  return request<{ invitation: FamilyInvitation }>(
    `/api/families/invitations/${encodeURIComponent(invitationId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }
  );
}

export async function getFamilyMembers(
  familyId: string
): Promise<{ family: FamilyWithOwner; members: FamilyMember[] }> {
  return request<{ family: FamilyWithOwner; members: FamilyMember[] }>(
    `/api/families/${encodeURIComponent(familyId)}/members`,
    { method: 'GET' }
  );
}
