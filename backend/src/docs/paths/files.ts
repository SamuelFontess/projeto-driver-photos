const err = { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };

export const filesPaths = {
  '/api/files': {
    get: {
      tags: ['Files'],
      summary: 'Listar arquivos',
      description: 'Lista arquivos de uma pasta ou busca por nome. Sem `folderId` retorna arquivos raiz.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'folderId', in: 'query', schema: { type: 'string' }, description: 'ID da pasta (omitir para raiz)' },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
        {
          name: 'search',
          in: 'query',
          schema: { type: 'string', minLength: 1, maxLength: 120 },
          description: 'Busca por nome (insensível a maiúsculas, max 120 chars). Ignora folderId quando usado.',
        },
      ],
      responses: {
        '200': {
          description: 'Lista de arquivos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { $ref: '#/components/schemas/File' } },
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
      tags: ['Files'],
      summary: 'Upload de arquivos',
      description: 'Upload de um ou mais arquivos via `multipart/form-data`. Campo `files` recebe os arquivos.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Arquivos a fazer upload',
                },
                folderId: { type: 'string', description: 'ID da pasta de destino (opcional)' },
                familyId: { type: 'string', description: 'ID da família (opcional)' },
              },
              required: ['files'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Arquivos enviados com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { $ref: '#/components/schemas/File' } },
                },
              },
            },
          },
        },
        '400': { description: 'Nenhum arquivo enviado, tipo ou tamanho inválido', content: err },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso à família', content: err },
        '404': { description: 'Pasta não encontrada', content: err },
        '503': { description: 'Storage indisponível', content: err },
      },
    },
  },

  '/api/files/{id}': {
    get: {
      tags: ['Files'],
      summary: 'Obter metadados do arquivo',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Metadados do arquivo',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { file: { $ref: '#/components/schemas/File' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Arquivo não encontrado', content: err },
      },
    },
    patch: {
      tags: ['Files'],
      summary: 'Atualizar arquivo',
      description: 'Renomear ou mover arquivo para outra pasta.',
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
                name: { type: 'string', minLength: 1, example: 'novo-nome.pdf' },
                folderId: { type: 'string', nullable: true, example: null, description: 'null para mover à raiz' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Arquivo atualizado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { file: { $ref: '#/components/schemas/File' } },
              },
            },
          },
        },
        '400': { description: 'Dados inválidos', content: err },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Arquivo ou pasta não encontrado', content: err },
      },
    },
    delete: {
      tags: ['Files'],
      summary: 'Excluir arquivo',
      description: 'Remove o arquivo do banco e do Firebase Storage.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '204': { description: 'Arquivo excluído' },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Arquivo não encontrado', content: err },
      },
    },
  },

  '/api/files/{id}/download': {
    get: {
      tags: ['Files'],
      summary: 'Download do arquivo',
      description: 'Retorna o conteúdo binário do arquivo com header `Content-Disposition: attachment`.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Arquivo binário',
          content: { '*/*': { schema: { type: 'string', format: 'binary' } } },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Arquivo não encontrado', content: err },
        '503': { description: 'Storage indisponível', content: err },
      },
    },
  },

  '/api/files/{id}/preview': {
    get: {
      tags: ['Files'],
      summary: 'Preview do arquivo',
      description: 'Retorna o conteúdo com `Content-Disposition: inline`. Cache Redis para arquivos pequenos. Limite de 50MB.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'familyId', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Conteúdo do arquivo para visualização',
          content: { '*/*': { schema: { type: 'string', format: 'binary' } } },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso', content: err },
        '404': { description: 'Arquivo não encontrado', content: err },
        '413': { description: 'Arquivo grande demais para preview', content: err },
        '503': { description: 'Storage indisponível', content: err },
      },
    },
  },
} as const;
