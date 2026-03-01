const err = { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } };

export const adminPaths = {
  '/api/admin/send-email': {
    post: {
      tags: ['Admin'],
      summary: 'Enviar email manualmente',
      description: 'Requer autenticação e que o email do usuário esteja na variável `ADMIN_EMAILS`.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                to: { type: 'string', format: 'email', example: 'destinatario@email.com' },
                subject: { type: 'string', minLength: 1, example: 'Assunto do email' },
                body: { type: 'string', minLength: 1, description: 'Corpo do email em HTML', example: '<p>Olá!</p>' },
              },
              required: ['to', 'subject', 'body'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Email enviado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { message: { type: 'string', example: 'Email enviado com sucesso' } },
              },
            },
          },
        },
        '401': { description: 'Não autenticado', content: err },
        '403': { description: 'Não é administrador — `{ "error": "Acesso restrito" }`', content: err },
        '500': { description: 'Falha ao enviar email', content: err },
      },
    },
  },

  '/health': {
    get: {
      tags: [],
      summary: 'Health check',
      responses: {
        '200': {
          description: 'Servidor rodando',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'ok' },
                  message: { type: 'string', example: 'Server is running' },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
