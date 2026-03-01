import { schemas } from './schemas';
import { authPaths } from './paths/auth';
import { familiesPaths } from './paths/families';
import { foldersPaths } from './paths/folders';
import { filesPaths } from './paths/files';
import { adminPaths } from './paths/admin';

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Projeto Driver API',
    description:
      'API para sistema de armazenamento de arquivos tipo Google Drive. Suporta autenticação JWT (email/senha e Google), gerenciamento de famílias, pastas e arquivos.',
    version: '1.0.0',
  },
  servers: [
    { url: baseUrl, description: baseUrl.includes('localhost') ? 'Desenvolvimento' : 'Produção' },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação e perfil do usuário' },
    { name: 'Families', description: 'Gerenciamento de famílias e convites' },
    { name: 'Folders', description: 'Gerenciamento de pastas' },
    { name: 'Files', description: 'Upload, download e gerenciamento de arquivos' },
    { name: 'Admin', description: 'Operações restritas a administradores' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido nos endpoints de login/registro.',
      },
    },
    schemas,
  },
  paths: {
    ...authPaths,
    ...familiesPaths,
    ...foldersPaths,
    ...filesPaths,
    ...adminPaths,
  },
};
