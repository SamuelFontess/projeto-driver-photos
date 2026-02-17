/** Entrada única da API: métodos planos e reexport dos tipos. */

import * as auth from './auth';
import * as folders from './folders';
import * as files from './files';

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
  UpdateFolderPayload,
} from './folders';

export { type FolderFile as FileItem } from './files';

const api = {
  register: auth.register,
  login: auth.login,
  getMe: auth.getMe,
  updateProfile: auth.updateProfile,
  getFolders: folders.getFolders,
  createFolder: folders.createFolder,
  getFolder: folders.getFolder,
  updateFolder: folders.updateFolder,
  deleteFolder: folders.deleteFolder,
  getFiles: files.getFiles,
  uploadFile: files.uploadFile,
  uploadFiles: files.uploadFiles,
  downloadFile: files.downloadFile,
};

export { api };
