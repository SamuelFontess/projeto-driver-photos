# Backend — Projeto Driver

API REST em Express + TypeScript para o sistema de armazenamento de arquivos.

---

## Como funciona

### Startup

O `index.ts` segue uma ordem determinística:

```
1. validateEnv()          — aborta se qualquer var crítica estiver ausente
2. import('./app')         — carrega Express, rotas, middlewares
3. prisma.$connect()       — verifica conexão com o banco
4. getRedisClient()        — conecta ao Redis de cache (REDIS_CACHE_URL)
5. app.listen(PORT)        — server pronto
```

O BullMQ (`emailQueue.ts`) não conecta ao Redis na startup — ele conecta na primeira vez que um job é publicado. Por isso, o log de startup distingue:
- `Redis cache: connected` — conexão de cache verificada
- `Redis queue: managed by BullMQ (connects on first job publish)` — fila sob demanda

### Autenticação

O sistema usa **dois tokens JWT em cookies httpOnly**:

| Token | Duração | Cookie | Uso |
|---|---|---|---|
| `access_token` | 15 min | httpOnly, SameSite=Lax | Autenticação em cada request |
| `refresh_token` | 30 dias | httpOnly, SameSite=Lax | Renovação do access_token |

O middleware `auth.ts` lê o cookie `access_token`, verifica a assinatura com `JWT_SECRET` e popula `req.user`. O endpoint `POST /api/auth/refresh` lê o `refresh_token` (assinado com `REFRESH_JWT_SECRET`) e emite um novo `access_token`.

**Google OAuth**: o frontend autentica o usuário com Firebase Auth e envia o `idToken` para `POST /api/auth/google`. O backend verifica o token com o Firebase Admin SDK, cria ou localiza o usuário no banco, e seta os cookies normalmente.

### Armazenamento de arquivos

```
Upload:
  multer (memória)  →  Firebase Storage  →  prisma.file.create()
  Se prisma falhar  →  Firebase.delete() (cleanup atômico)

Download:
  backend pede signed URL ao Firebase  →  redireciona o cliente

Preview:
  1. Verifica cache Redis (REDIS_CACHE_URL)
  2. Se cache miss: baixa conteúdo do Firebase, armazena no Redis com TTL
  3. Serve o conteúdo com Content-Type correto
```

### Fila de e-mails

O backend **nunca** envia e-mail diretamente. Ele publica um job no Redis via BullMQ:

```typescript
await publishEmailJob('forgot_password', { email, token, name });
await publishEmailJob('family_invite', { email, familyName, inviterName });
```

O `email-worker` (serviço separado) consome esses jobs, renderiza o template HTML e envia via Brevo. Retry automático: 3 tentativas com backoff exponencial de 2s.

### Controle de acesso familiar

Arquivos e pastas têm um campo `familyId` opcional. O helper `familyAccess.ts` verifica se o usuário é membro aceito da família antes de permitir acesso a recursos familiares.

### Rate limiting

| Limiter | Rota | Padrão |
|---|---|---|
| `authRateLimiter` | register, login, google, reset-password | 20 req / 15 min |
| `forgotPasswordRateLimiter` | forgot-password | 5 req / 15 min |
| `refreshRateLimiter` | refresh | separado do auth |
| `fileUploadRateLimiter` | POST /api/files | 15 req / 60 s |
| `adminRateLimiter` | POST /api/admin/* | dedicado |

`trust proxy 1` está configurado no Express — o rate limiting usa o IP real do cliente via `X-Forwarded-For` quando rodando atrás de nginx.

### Audit logs

Toda operação sensível registra um `AuditLog` no banco com:
- `action`: string descritiva (ex: `file.upload`, `auth.login`, `family.member.remove`)
- `resourceType` / `resourceId`: o que foi afetado
- `userId`: quem fez
- `ipAddress`, `userAgent`
- `metadata`: JSON com detalhes adicionais

Falhas no audit log são registradas como `warn` e não propagam para o response — o audit nunca quebra a operação principal.

---

## Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha. O servidor **recusa iniciar** se qualquer uma das variáveis marcadas como obrigatórias estiver ausente.

### Obrigatórias (validadas em startup)

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/drive_db

# JWT — gere com: openssl rand -hex 32
JWT_SECRET=string-longa-aleatória
REFRESH_JWT_SECRET=string-diferente-da-anterior

# Firebase Admin SDK
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
```

### Redis

```env
# BullMQ — fila de emails (noeviction)
REDIS_URL=redis://localhost:6379

# Preview cache (allkeys-lru) — em dev pode ser o mesmo REDIS_URL
REDIS_CACHE_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT_MS=300

# Preview
FILE_PREVIEW_CACHE_TTL_SECONDS=3600
FILE_PREVIEW_CACHE_MAX_BYTES=20971520   # 20 MB por arquivo em cache
FILE_PREVIEW_MAX_BYTES=52428800         # 50 MB tamanho máximo para preview
```

### E-mail (Brevo)

```env
BREVO_API_KEY=your-brevo-api-key
BREVO_FROM=noreply@seudominio.com
BREVO_FROM_NAME=Driver App
EMAIL_QUEUE_KEY=driver:email:events
```

### Outros

```env
PORT=3000
FRONTEND_URL=http://localhost:3001
NODE_ENV=development

# Admin — lista de e-mails com acesso a rotas /api/admin/*
ADMIN_EMAILS=admin@seudominio.com

# Docs — Basic Auth para GET /api-docs
DOCS_USER=admin
DOCS_PASSWORD=senha-segura

# Cookies — true em produção (requer HTTPS)
COOKIE_SECURE=false

# Upload
UPLOAD_MAX_FILE_SIZE_MB=10

# Reset de senha
PASSWORD_RESET_TOKEN_TTL_MINUTES=30

# Rate limits (opcionais — defaults acima são usados se ausentes)
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
UPLOAD_RATE_LIMIT_WINDOW_MS=60000
UPLOAD_RATE_LIMIT_MAX=15
FORGOT_PASSWORD_RATE_LIMIT_MAX=5
```

---

## Banco de Dados

### Schema (8 modelos)

**User**
- `id`, `email` (único), `name`, `passwordHash` (null para OAuth)
- `googleId` (único, null para e-mail/senha)
- `createdAt`, `updatedAt`
- Relacionado a: Folder, File, Family (owner), FamilyMember, AuditLog, PasswordResetToken, FavoriteFolder

**Folder**
- `id`, `name`, `userId`, `familyId` (null = pessoal)
- `parentId` — auto-relacionamento para hierarquia infinita
- Prevenção de ciclos: ao mover, o backend verifica se o destino não é descendente da pasta

**File**
- `id`, `name`, `path` (caminho no Firebase Storage), `mimeType`, `size`
- `userId`, `folderId` (null = raiz), `familyId` (null = pessoal)

**Family**
- `id`, `name`, `ownerId` (único — cada usuário pode ter no máximo uma família como dono)

**FamilyMember**
- `id`, `familyId`, `userId`, `email`, `status`: `pending` | `accepted` | `declined`
- Restrições: único por (email, familyId) e por (userId, familyId)

**AuditLog**
- `id`, `action`, `resourceType`, `resourceId`, `userId`, `ipAddress`, `userAgent`, `metadata` (JSON)

**PasswordResetToken**
- `id`, `tokenHash` (SHA-256), `userId`, `expiresAt`, `usedAt`

**FavoriteFolder**
- `userId`, `folderId` — chave primária composta

---

## Estrutura de Pastas

```
backend/
├── src/
│   ├── index.ts              # Entry point — bootstrap(), validateEnv()
│   ├── app.ts                # Express app, CORS, cookies, rotas
│   ├── controllers/
│   │   ├── authController.ts        # register, login, googleAuth, me, logout, refresh,
│   │   │                            # forgotPassword, resetPassword, updateProfile
│   │   ├── fileController.ts        # list, upload, download, preview, get, update, remove
│   │   ├── folderController.ts      # list, create, get, update, remove (com anti-ciclo)
│   │   ├── favoriteFolderController.ts  # toggleFavorite, getFavorites
│   │   ├── familyController.ts      # createFamily, listFamilies, updateFamily, deleteFamily,
│   │   │                            # inviteMember, listInvitations, replyInvitation,
│   │   │                            # listMembers, removeMember
│   │   └── adminController.ts       # sendManualEmail
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── fileRoutes.ts
│   │   ├── folderRoutes.ts
│   │   ├── familyRoutes.ts
│   │   └── adminRoutes.ts
│   ├── middleware/
│   │   ├── auth.ts            # Verifica JWT no cookie (e header Bearer como fallback)
│   │   ├── adminAuth.ts       # Verifica se req.user.email está em ADMIN_EMAILS
│   │   ├── validate.ts        # Zod schema validation (body, query, params)
│   │   └── rateLimit.ts       # Limitadores configurados com parsePositiveInt
│   ├── lib/
│   │   ├── prisma.ts          # Singleton do Prisma Client
│   │   ├── firebase.ts        # Firebase Admin SDK init
│   │   ├── redis.ts           # ioredis client para REDIS_CACHE_URL
│   │   ├── multer.ts          # fileUploader.array('files', N) — buffer em memória
│   │   ├── emailQueue.ts      # BullMQ Queue — publishEmailJob()
│   │   ├── auditLog.ts        # createAuditLog() — falha silenciosamente
│   │   └── familyAccess.ts    # isFamilyMember(), requireFamilyAccess()
│   ├── utils/
│   │   ├── jwt.ts             # signAccessToken(), signRefreshToken(), verifyToken()
│   │   ├── validateEnv.ts     # Valida as 7 vars críticas na startup
│   │   └── parsePositiveInt.ts# parsePositiveInt(env, fallback): number
│   └── validation/            # Schemas Zod: authSchemas, fileSchemas,
│                              # folderSchemas, familySchemas, adminSchemas
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── Dockerfile                 # Multi-stage: builder (tsc) + runner (node)
├── package.json
├── tsconfig.json
└── .env.example               # Todas as vars documentadas com comentários
```

---

## Scripts

```bash
npm run dev          # ts-node src/index.ts (desenvolvimento)
npm run build        # tsc — compila para dist/
npm start            # node dist/index.js (produção)
npm test             # vitest run — 19 testes de integração
npm run test:watch   # vitest (watch mode)
npm run prisma:generate   # Gera o Prisma Client
npm run prisma:migrate    # prisma migrate dev (cria migration)
npm run prisma:studio     # Interface visual do banco
```

---

## Testes

19 testes de integração em `src/routes.integration.test.ts` usando Supertest. Cobrem:

- **Auth**: register, login, me, logout, refresh
- **Files**: upload, list, download, preview, update, delete
- **Families**: create, list, invite, reply invitation, list members
- **Admin**: send-email (requer admin)
- **Health**: GET /health

Todos os testes usam mocks completos de Prisma, Firebase, Redis cache e email queue — não dependem de serviços externos.

```bash
npm test -- --reporter=verbose
```

---

## Documentação da API

Acesse `GET /api-docs` com as credenciais `DOCS_USER` / `DOCS_PASSWORD` (Basic Auth).

Powered by **Scalar** com spec OpenAPI gerada automaticamente.
