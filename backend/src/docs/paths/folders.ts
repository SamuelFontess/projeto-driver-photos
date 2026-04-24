const err = { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };

export const foldersPaths = {
  '/api/folders': {
    get: {
      tags: ['Folders'],
      summary: 'Listar pastas',
      description: 'Lista pastas do usuário ou de uma família. Sem `parentId` retorna pastas raiz.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'parentId', in: 'query', schema: { type: 'string' }, description: 'ID da pasta pai (omitir para raiz)' },
        { name: 'familyId', in: 'query', schema: { type: 'string' }, description: 'ID da família para listar pastas compartilhadas' },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 }, description: 'Itens por página' },
        { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Página' },
      ],
      responses: {
        '200': {
          description: 'Lista de pastas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  folders: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FolderWithCounts' },
                  },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso à família', content: err },
      },
    },
    post: {
      tags: ['Folders'],
      summary: 'Criar pasta',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, example: 'Documentos' },
                parentId: { type: 'string', nullable: true, example: null, description: 'ID da pasta pai (null para raiz)' },
                familyId: { type: 'string', nullable: true, example: null },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Pasta criada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { folder: { $ref: '#/components/schemas/FolderWithCounts' } },
              },
            },
          },
        },
        '400': { description: 'Nome inválido', content: err },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso à família', content: err },
        '404': { description: 'Pasta pai não encontrada', content: err },
      },
    },
  },

  '/api/folders/{id}': {
    get: {
      tags: ['Folders'],
      summary: 'Obter pasta por ID',
      description: 'Retorna a pasta com seus filhos e arquivos.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Dados da pasta',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { folder: { $ref: '#/components/schemas/FolderDetail' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Pasta não encontrada', content: err },
      },
    },
    patch: {
      tags: ['Folders'],
      summary: 'Atualizar pasta',
      description: 'Renomear ou mover pasta. Valida ciclos ao mover.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, example: 'Novo Nome' },
                parentId: { type: 'string', nullable: true, example: null, description: 'null para mover à raiz' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Pasta atualizada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { folder: { $ref: '#/components/schemas/FolderWithCounts' } },
              },
            },
          },
        },
        '400': { description: 'Dados inválidos ou ciclo de pastas', content: err },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Pasta não encontrada', content: err },
      },
    },
    delete: {
      tags: ['Folders'],
      summary: 'Excluir pasta',
      description: 'Exclusão em cascata: remove subpastas e arquivos (via Prisma).',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '204': { description: 'Pasta excluída' },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Pasta não encontrada', content: err },
      },
    },
  },
} as const;
