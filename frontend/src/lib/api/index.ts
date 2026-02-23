/** Entrada única da API: métodos planos e reexport dos tipos. */

import * as auth from './auth';
import * as folders from './folders';
import * as files from './files';
import * as families from './families';
export { ApiError } from './client';

export type {
  RegisterData,
  LoginData,
  AuthResponse,
  User,
  UpdateProfilePayload,
} from './auth';

export type {
  Folder,
  CreateFolderPayload,
  FolderFile,
  FolderWithDetails,
} from './folders';

export { type FolderFile as FileItem } from './files';
export type { UpdateFilePayload } from './files';
export type {
  FamilyMemberStatus,
  FamilyInvitationAction,
  FamilyUserSummary,
  FamilySummary,
  FamilyInvitation,
  FamilyInvitationWithFamily,
  FamilyMember,
  FamilyWithOwner,
} from './families';

const api = {
  register: auth.register,
  login: auth.login,
  loginWithGoogle: auth.loginWithGoogle,
  getMe: auth.getMe,
  updateProfile: auth.updateProfile,
  getFolders: folders.getFolders,
  createFolder: folders.createFolder,
  updateFolder: folders.updateFolder,
  getFolder: folders.getFolder,
  deleteFolder: folders.deleteFolder,
  getFiles: files.getFiles,
  getFile: files.getFile,
  updateFile: files.updateFile,
  deleteFile: files.deleteFile,
  uploadFile: files.uploadFile,
  uploadFiles: files.uploadFiles,
  downloadFile: files.downloadFile,
  getFilePreviewBlob: files.getFilePreviewBlob,
  createFamily: families.createFamily,
  getFamilies: families.getFamilies,
  inviteFamilyMember: families.inviteFamilyMember,
  getFamilyInvitations: families.getFamilyInvitations,
  replyFamilyInvitation: families.replyFamilyInvitation,
  getFamilyMembers: families.getFamilyMembers,
};

export { api };
