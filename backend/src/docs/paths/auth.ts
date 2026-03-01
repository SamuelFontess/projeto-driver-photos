const err = { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };

export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Registrar novo usuário',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'usuario@email.com' },
                password: { type: 'string', minLength: 6, example: 'senha123' },
                name: { type: 'string', minLength: 1, example: 'João Silva' },
              },
              required: ['email', 'password'],
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Usuário criado com sucesso. Diferente do login: o campo `user` inclui `createdAt`.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'User created successfully' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'clx1abc000001xyz' },
                      email: { type: 'string', format: 'email', example: 'usuario@email.com' },
                      name: { type: 'string', nullable: true, example: 'João Silva' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'email', 'createdAt'],
                  },
                  token: { type: 'string', example: 'eyJhbGci...' },
                },
                required: ['message', 'user', 'token'],
              },
            },
          },
        },
        '400': { description: 'Dados inválidos', content: err },
        '409': { description: 'Usuário já existe', content: err },
        '500': { description: 'Erro interno', content: err },
      },
    },
  },

  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login com email e senha',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'usuario@email.com' },
                password: { type: 'string', example: 'senha123' },
              },
              required: ['email', 'password'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login realizado com sucesso',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        '400': { description: 'Dados inválidos', content: err },
        '401': { description: 'Credenciais inválidas', content: err },
        '500': { description: 'Erro interno', content: err },
      },
    },
  },

  '/api/auth/google': {
    post: {
      tags: ['Auth'],
      summary: 'Autenticação via Google (Firebase ID Token)',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                idToken: {
                  type: 'string',
                  description: 'Firebase ID Token obtido no frontend após login com Google',
                  example: 'eyJhbGci...',
                },
              },
              required: ['idToken'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Autenticado com sucesso',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        '400': { description: 'idToken ausente ou conta sem email', content: err },
        '401': { description: 'Token Google inválido ou expirado', content: err },
        '500': { description: 'Erro interno', content: err },
      },
    },
  },

  '/api/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Solicitar redefinição de senha',
      description: 'Envia email com token de redefinição. Sempre retorna 200 para evitar enumeração de emails.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email', example: 'usuario@email.com' },
              },
              required: ['email'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Instruções enviadas (se o email existir)',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'If this email exists, password reset instructions were queued' },
                },
              },
            },
          },
        },
        '500': { description: 'Erro interno', content: err },
      },
    },
  },

  '/api/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Redefinir senha com token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: { type: 'string', description: 'Token recebido por email', example: 'abc123...' },
                password: { type: 'string', minLength: 6, example: 'novaSenha123' },
              },
              required: ['token', 'password'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Senha redefinida com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { message: { type: 'string', example: 'Password reset successful' } },
              },
            },
          },
        },
        '400': { description: 'Token inválido ou expirado', content: err },
        '500': { description: 'Erro interno', content: err },
      },
    },
  },

  '/api/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Obter dados do usuário autenticado',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Dados do usuário',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { user: { $ref: '#/components/schemas/UserWithAdmin' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '404': { description: 'Usuário não encontrado', content: err },
      },
    },
    patch: {
      tags: ['Auth'],
      summary: 'Atualizar perfil do usuário',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, example: 'Novo Nome' },
                email: { type: 'string', format: 'email', example: 'novo@email.com' },
                currentPassword: {
                  type: 'string',
                  description: 'Obrigatório para trocar senha (usuários com senha)',
                  example: 'senhaAtual123',
                },
                newPassword: { type: 'string', minLength: 6, example: 'novaSenha456' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Perfil atualizado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { user: { $ref: '#/components/schemas/User' } },
              },
            },
          },
        },
        '400': { description: 'Dados inválidos ou sem campos para atualizar', content: err },
        '401': { description: 'Não autenticado ou senha atual incorreta', content: err },
        '404': { description: 'Usuário não encontrado', content: err },
        '409': { description: 'Email já em uso', content: err },
      },
    },
  },
} as const;
