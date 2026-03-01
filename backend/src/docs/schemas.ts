export const schemas = {
  Error: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Mensagem de erro' },
    },
    required: ['error'],
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: 'clx1abc000001xyz' },
      email: { type: 'string', format: 'email', example: 'usuario@email.com' },
      name: { type: 'string', nullable: true, example: 'João Silva' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'email', 'createdAt', 'updatedAt'],
  },
  UserWithAdmin: {
    allOf: [
      { $ref: '#/components/schemas/User' },
      {
        type: 'object',
        properties: {
          isAdmin: { type: 'boolean', example: false },
        },
        required: ['isAdmin'],
      },
    ],
  },
  AuthUserMinimal: {
    type: 'object',
    description: 'Subconjunto de dados do usuário retornado após login/autenticação Google.',
    properties: {
      id: { type: 'string', example: 'clx1abc000001xyz' },
      email: { type: 'string', format: 'email', example: 'usuario@email.com' },
      name: { type: 'string', nullable: true, example: 'João Silva' },
    },
    required: ['id', 'email'],
  },
  AuthResponse: {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Login successful' },
      user: { $ref: '#/components/schemas/AuthUserMinimal' },
      token: {
        type: 'string',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
    required: ['message', 'user', 'token'],
  },
  Family: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clx1fam000001xyz' },
      name: { type: 'string', nullable: true, example: 'Família Silva' },
      ownerId: { type: 'string', example: 'clx1abc000001xyz' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'ownerId', 'createdAt', 'updatedAt'],
  },
  FamilyWithCount: {
    allOf: [
      { $ref: '#/components/schemas/Family' },
      {
        type: 'object',
        properties: {
          _count: {
            type: 'object',
            properties: {
              members: { type: 'integer', example: 3 },
            },
          },
        },
      },
    ],
  },
  FamilyMember: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clx1mem000001xyz' },
      familyId: { type: 'string', example: 'clx1fam000001xyz' },
      userId: { type: 'string', nullable: true, example: 'clx1abc000001xyz' },
      email: { type: 'string', format: 'email', example: 'membro@email.com' },
      status: {
        type: 'string',
        enum: ['pending', 'accepted', 'declined'],
        example: 'pending',
      },
      invitedById: { type: 'string', example: 'clx1abc000001xyz' },
      invitedAt: { type: 'string', format: 'date-time', nullable: true },
      acceptedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'familyId', 'email', 'status', 'invitedById', 'createdAt', 'updatedAt'],
  },
  Folder: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clx1fol000001xyz' },
      name: { type: 'string', example: 'Documentos' },
      parentId: { type: 'string', nullable: true, example: null },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'createdAt', 'updatedAt'],
  },
  FolderWithCounts: {
    allOf: [
      { $ref: '#/components/schemas/Folder' },
      {
        type: 'object',
        properties: {
          childrenCount: { type: 'integer', example: 2 },
          filesCount: { type: 'integer', example: 5 },
        },
      },
    ],
  },
  FolderDetail: {
    allOf: [
      { $ref: '#/components/schemas/Folder' },
      {
        type: 'object',
        properties: {
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Folder' },
          },
          files: {
            type: 'array',
            items: { $ref: '#/components/schemas/File' },
          },
        },
      },
    ],
  },
  File: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clx1fil000001xyz' },
      name: { type: 'string', example: 'relatorio.pdf' },
      size: { type: 'integer', example: 204800, description: 'Tamanho em bytes' },
      mimeType: { type: 'string', example: 'application/pdf' },
      familyId: { type: 'string', nullable: true, example: null },
      folderId: { type: 'string', nullable: true, example: 'clx1fol000001xyz' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'size', 'mimeType', 'createdAt', 'updatedAt'],
  },
} as const;
