const err = { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };

export const familiesPaths = {
  '/api/families': {
    post: {
      tags: ['Families'],
      summary: 'Criar família',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 120, nullable: true, example: 'Família Silva' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Família criada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { family: { $ref: '#/components/schemas/Family' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '500': { description: 'Erro interno', content: err },
      },
    },
    get: {
      tags: ['Families'],
      summary: 'Listar famílias do usuário',
      description: 'Retorna famílias onde o usuário é dono ou membro aceito.',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Lista de famílias',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  families: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/FamilyWithCount' },
                  },
                },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
      },
    },
  },

  '/api/families/{familyId}': {
    patch: {
      tags: ['Families'],
      summary: 'Atualizar família',
      description: 'Somente o dono pode atualizar.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'familyId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120,
                  nullable: true,
                  example: 'Novo Nome',
                  description: 'Nome da família. Enviar `null` para limpar o nome.',
                },
              },
              required: ['name'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Família atualizada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { family: { $ref: '#/components/schemas/Family' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Apenas o dono pode atualizar', content: err },
        '404': { description: 'Família não encontrada', content: err },
      },
    },
    delete: {
      tags: ['Families'],
      summary: 'Excluir família',
      description: 'Somente o dono pode excluir. Família não pode ter membros aceitos.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'familyId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '204': { description: 'Família excluída' },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Apenas o dono pode excluir', content: err },
        '404': { description: 'Família não encontrada', content: err },
        '409': { description: 'Família ainda tem membros aceitos', content: err },
      },
    },
  },

  '/api/families/{familyId}/invites': {
    post: {
      tags: ['Families'],
      summary: 'Convidar membro para a família',
      description: 'Dono e membros aceitos podem convidar. Reenvio automático se já existir convite pendente/recusado.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'familyId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'convidado@email.com' },
              },
              required: ['email'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Convite reenviado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { invitation: { $ref: '#/components/schemas/FamilyMember' } },
              },
            },
          },
        },
        '201': {
          description: 'Convite criado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { invitation: { $ref: '#/components/schemas/FamilyMember' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso à família', content: err },
        '404': { description: 'Família ou usuário não encontrado', content: err },
        '409': { description: 'Usuário já é membro', content: err },
      },
    },
  },

  '/api/families/invitations': {
    get: {
      tags: ['Families'],
      summary: 'Listar convites pendentes do usuário',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Lista de convites pendentes',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  invitations: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/FamilyMember' },
                        {
                          type: 'object',
                          properties: {
                            family: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string', nullable: true },
                                ownerId: { type: 'string' },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
      },
    },
  },

  '/api/families/invitations/{id}': {
    patch: {
      tags: ['Families'],
      summary: 'Aceitar ou recusar convite',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do convite' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['accept', 'decline'], example: 'accept' },
              },
              required: ['action'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Convite respondido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { invitation: { $ref: '#/components/schemas/FamilyMember' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso ao convite', content: err },
        '404': { description: 'Convite não encontrado', content: err },
        '409': { description: 'Convite já foi respondido', content: err },
      },
    },
  },

  '/api/families/{familyId}/members': {
    get: {
      tags: ['Families'],
      summary: 'Listar membros da família',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'familyId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: {
        '200': {
          description: 'Lista de membros',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  family: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string', nullable: true },
                      owner: { $ref: '#/components/schemas/User' },
                    },
                  },
                  members: {
                    type: 'array',
                    items: {
                      allOf: [
                        { $ref: '#/components/schemas/FamilyMember' },
                        {
                          type: 'object',
                          properties: {
                            user: {
                              type: 'object',
                              nullable: true,
                              description: 'Dados do usuário convidado',
                              properties: {
                                id: { type: 'string' },
                                email: { type: 'string', format: 'email' },
                                name: { type: 'string', nullable: true },
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem acesso à família', content: err },
      },
    },
  },

  '/api/families/{familyId}/members/{userId}': {
    delete: {
      tags: ['Families'],
      summary: 'Remover membro da família',
      description: 'O dono pode remover qualquer membro. O próprio membro pode sair.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'familyId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do usuário a remover' },
      ],
      responses: {
        '204': { description: 'Membro removido' },
        '400': { description: 'Dono não pode sair da família', content: err },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Sem permissão', content: err },
        '404': { description: 'Família ou membro não encontrado', content: err },
      },
    },
  },
} as const;
