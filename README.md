# Projeto Driver

Aplicação fullstack de armazenamento de arquivos em nuvem, inspirada no Google Drive. Permite que usuários façam upload, organizem e visualizem arquivos em pastas hierárquicas, além de criar espaços compartilhados (famílias) com outros usuários — tudo com autenticação por JWT em cookies httpOnly, controle de acesso granular e envio de e-mails transacionais via fila assíncrona.

---

## Funcionalidades

### Autenticação
- Cadastro e login com e-mail/senha (bcrypt)
- Login social com **Google** (via Firebase Auth — ID token verificado no backend)
- Recuperação de senha com link enviado por e-mail (token SHA-256 com TTL de 30 min)
- **Access token** (15 min) + **Refresh token** (30 dias) em cookies httpOnly — sem localStorage
- Proteção de rotas: Next.js Edge Middleware verifica o cookie `access_token` antes de servir HTML

### Gerenciamento de Arquivos
- Upload de múltiplos arquivos com validação de tipo MIME e tamanho (configurável, padrão 10 MB)
- Armazenamento no **Firebase Storage** — upload direto pelo backend, sem passar pelo cliente
- Download com `Content-Disposition` RFC 5987 (suporte a nomes com acentos e caracteres especiais)
- Preview em tempo real para imagens, PDFs e arquivos de texto — com cache no **Redis**
- Renomear e mover arquivos entre pastas
- Exclusão com remoção atômica do Storage (cleanup do Firebase em falha do banco)

### Pastas
- Hierarquia ilimitada via `parentId` (auto-relacionamento)
- Navegação via breadcrumb com URL parametrizada (`?folderId=...`)
- Prevenção de ciclos ao mover (uma pasta não pode ser movida para dentro de si mesma ou descendentes)
- Exclusão em cascata (remove subpastas e arquivos)
- Pastas favoritas por usuário

### Famílias (Espaço Colaborativo)
- Cada usuário pode criar uma família e convidar membros por e-mail
- Convite enviado via e-mail transacional (BullMQ + email-worker)
- Fluxo de aceite/recusa de convite
- Arquivos e pastas podem pertencer a uma família — acessíveis a todos os membros aceitos
- Gerenciamento de membros: listar, remover
- Apenas o dono da família pode gerenciar configurações e excluir a família

### Segurança
- **Rate limiting** por rota: auth (20 req/15min), upload (15 req/60s), forgot-password (5 req/15min)
- **CORS** restrito ao `FRONTEND_URL` configurado
- **`trust proxy 1`** — rate limiting funciona corretamente atrás de nginx/proxy reverso
- **`COOKIE_SECURE=true`** em produção (requer HTTPS)
- Validação de todos os inputs com **Zod**
- **Audit logs** no banco para todas as ações sensíveis (upload, download, delete, login, família)
- Startup validation: servidor recusa iniciar se qualquer variável crítica estiver ausente

### Fila de E-mails (email-worker)
- Backend publica jobs via **BullMQ** (Redis `noeviction`)
- Jobs suportados: `family_invite` e `forgot_password`
- Retry automático: 3 tentativas com backoff exponencial
- Worker separado (`email-worker`) consome a fila e envia via **Brevo**
- Worker conectado ao mesmo Redis do BullMQ — sem dependência do backend

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Estilização | Tailwind CSS, Radix UI, Lucide Icons |
| Gerenciamento de estado | React Context + TanStack React Query |
| Backend | Node.js 22, Express, TypeScript |
| Banco de dados | PostgreSQL 16 + Prisma ORM |
| Armazenamento | Firebase Storage |
| Autenticação social | Firebase Auth (Google) |
| Cache de preview | Redis (`allkeys-lru`, 128 MB) |
| Fila de mensagens | BullMQ + Redis (`noeviction`, 128 MB) |
| Validação | Zod |
| Testes backend | Vitest + Supertest (19 testes de integração) |
| Testes frontend | Vitest + Testing Library |
| Testes E2E | Playwright (34+ testes) |

---

## Arquitetura

```
                      Internet
                          │
                     nginx (host)
                    HTTPS termination
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
  :3000 (frontend)                :8080 (backend)
  Next.js                         Express + TypeScript
  Edge Middleware                         │
  (cookie check)           ┌─────────────┼─────────────────┐
                            ▼             ▼                  ▼
                     PostgreSQL     Firebase Admin      Redis (dois)
                     Prisma ORM     Storage SDK         ├── :6379 noeviction
                     (metadados)    (arquivos)          │   BullMQ email queue
                                                        └── :6380 allkeys-lru
                                                            Preview cache

                    BullMQ publica job
                            │
                            ▼
                      email-worker
                      BullMQ consumer
                      Brevo API
```

### Dois Redis — por que?

| Instância | Política | Uso | Port (dev) |
|---|---|---|---|
| `redis` | `noeviction` | BullMQ — jobs de email. **Nunca pode perder dados.** | 6379 |
| `redis-cache` | `allkeys-lru` | Cache de preview de arquivos. Pode ser eviccionado. | 6380 |

Em produção (Docker Compose), as URLs são fixadas internamente: `redis://redis:6379` e `redis://redis-cache:6379`. O compose injeta essas envs automaticamente — nenhuma configuração manual no servidor é necessária além do `.env`.

### Fluxo de autenticação

```
1. Login  →  backend valida credenciais
           →  gera access_token (JWT 15min) + refresh_token (JWT 30d)
           →  seta cookies httpOnly: access_token, refresh_token

2. Request →  Next.js Edge Middleware verifica presença de access_token
           →  se ausente: redirect para /login?from=<path>
           →  se presente: serve a página (validação de assinatura é feita pelo backend)

3. API call →  backend lê cookie access_token
            →  verifica assinatura JWT com JWT_SECRET
            →  se expirado: frontend chama POST /api/auth/refresh
                          →  backend verifica refresh_token
                          →  emite novo access_token

4. Logout  →  backend limpa ambos os cookies
```

### Fluxo de upload

```
1. Frontend faz POST /api/files com multipart/form-data
2. Multer recebe o buffer em memória
3. Backend faz upload para Firebase Storage
4. Backend cria registro no PostgreSQL (prisma.file.create)
   → Se o Prisma falhar: backend deleta o arquivo do Firebase (cleanup atômico)
   → Audit log registra a ação
5. Frontend recebe metadados do arquivo criado
```

---

## Estrutura do Projeto

```
Projeto-driver/
├── backend/
│   ├── src/
│   │   ├── index.ts               # Entry point — validateEnv() antes de tudo
│   │   ├── app.ts                 # Express app + registro de rotas
│   │   ├── controllers/           # authController, fileController, folderController,
│   │   │                          # familyController, favoriteFolderController, adminController
│   │   ├── routes/                # authRoutes, fileRoutes, folderRoutes, familyRoutes, adminRoutes
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Verificação do JWT (Bearer ou cookie)
│   │   │   ├── adminAuth.ts       # Verificação de ADMIN_EMAILS
│   │   │   ├── validate.ts        # Middleware Zod
│   │   │   └── rateLimit.ts       # Limitadores por rota
│   │   ├── lib/
│   │   │   ├── prisma.ts          # Singleton do Prisma Client
│   │   │   ├── firebase.ts        # Firebase Admin (Storage)
│   │   │   ├── redis.ts           # Redis cache client (ioredis)
│   │   │   ├── multer.ts          # Config de upload (tamanho, MIME, fileUploader)
│   │   │   ├── emailQueue.ts      # Publicação de jobs BullMQ (ioredis)
│   │   │   ├── auditLog.ts        # Registro de audit logs (falha graciosamente)
│   │   │   └── familyAccess.ts    # Checagem de permissão familiar
│   │   └── utils/
│   │       ├── jwt.ts             # Geração e verificação de JWT (requireEnv pattern)
│   │       ├── validateEnv.ts     # Validação de 7 vars críticas na startup
│   │       └── parsePositiveInt.ts# Utilitário compartilhado para ler envs numéricas
│   └── prisma/
│       └── schema.prisma          # 8 modelos: User, Folder, File, Family,
│                                  # FamilyMember, AuditLog, PasswordResetToken, FavoriteFolder
│
└── frontend/
    └── src/
        ├── middleware.ts          # Edge Middleware — protege /dashboard/*
        ├── app/
        │   ├── dashboard/         # Browser de arquivos (page, layout, profile, family)
        │   ├── login/             # Formulário de login + Google OAuth
        │   ├── register/          # Cadastro
        │   ├── forgot-password/   # Solicitar reset
        │   └── reset-password/    # Definir nova senha (requer token na URL)
        ├── contexts/              # AuthContext, ThemeContext, UploadContext
        ├── components/            # Componentes UI reutilizáveis (shadcn/ui base)
        ├── features/
        │   ├── files/             # FileBrowser, FileGrid, UploadZone, hooks
        │   └── family/            # Componentes e hooks de família
        └── lib/
            └── api/               # Camada de comunicação com a API
```

---

## Banco de Dados

### Modelos

| Modelo | Descrição |
|---|---|
| `User` | Usuário da plataforma — suporta e-mail/senha e Google OAuth |
| `Folder` | Pasta — hierarquia via `parentId`, pode pertencer a usuário ou família |
| `File` | Arquivo — caminho no Firebase, mimeType, size, referência a pasta/família |
| `Family` | Espaço colaborativo — `ownerId` único (um dono por família) |
| `FamilyMember` | Convite/membro — status: `pending` / `accepted` / `declined` |
| `AuditLog` | Registro de ações — ação, recurso, usuário, IP, user agent, metadados JSON |
| `PasswordResetToken` | Token SHA-256 com TTL de 30 min, marcado como usado após conclusão |
| `FavoriteFolder` | Relação usuário ↔ pasta favorita |

---

## API

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/register` | Pública | Criar conta |
| `POST` | `/api/auth/login` | Pública | Login e-mail/senha → seta cookies |
| `POST` | `/api/auth/google` | Pública | Login Google (Firebase ID token) → seta cookies |
| `POST` | `/api/auth/forgot-password` | Pública | Solicitar link de reset (5 req/15min) |
| `POST` | `/api/auth/reset-password` | Pública | Redefinir senha com token |
| `POST` | `/api/auth/refresh` | Pública | Renovar access_token via refresh_token |
| `GET` | `/api/auth/me` | JWT | Dados do usuário autenticado |
| `PATCH` | `/api/auth/me` | JWT | Atualizar perfil |
| `POST` | `/api/auth/logout` | JWT | Limpar cookies |

### Arquivos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/files` | JWT | Listar arquivos (suporta busca e filtro por pasta) |
| `POST` | `/api/files` | JWT | Upload de um ou mais arquivos (multipart) |
| `GET` | `/api/files/:id` | JWT | Metadados de um arquivo |
| `GET` | `/api/files/:id/download` | JWT | Download com Content-Disposition RFC 5987 |
| `GET` | `/api/files/:id/preview` | JWT | Preview com cache Redis (imagens, PDFs, texto) |
| `PATCH` | `/api/files/:id` | JWT | Renomear ou mover arquivo |
| `DELETE` | `/api/files/:id` | JWT | Excluir arquivo (Firebase + banco atomicamente) |

### Pastas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/folders` | JWT | Listar pastas (suporta `parentId`) |
| `POST` | `/api/folders` | JWT | Criar pasta |
| `GET` | `/api/folders/favorites` | JWT | Pastas favoritas do usuário |
| `POST` | `/api/folders/:id/favorite` | JWT | Alternar favorito |
| `GET` | `/api/folders/:id` | JWT | Pasta com filhos |
| `PATCH` | `/api/folders/:id` | JWT | Renomear ou mover (com anti-ciclo) |
| `DELETE` | `/api/folders/:id` | JWT | Excluir com cascata |

### Famílias

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/families` | JWT | Criar família |
| `GET` | `/api/families` | JWT | Listar famílias do usuário |
| `PATCH` | `/api/families/:familyId` | JWT | Atualizar nome |
| `DELETE` | `/api/families/:familyId` | JWT | Excluir família |
| `POST` | `/api/families/:familyId/invites` | JWT | Convidar membro por e-mail |
| `GET` | `/api/families/invitations` | JWT | Convites recebidos pelo usuário |
| `PATCH` | `/api/families/invitations/:id` | JWT | Aceitar ou recusar convite |
| `GET` | `/api/families/:familyId/members` | JWT | Listar membros |
| `DELETE` | `/api/families/:familyId/members/:userId` | JWT | Remover membro |

### Admin

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/admin/send-email` | JWT + admin | Enviar e-mail manualmente |

### Outros

| Rota | Descrição |
|---|---|
| `GET /health` | Health check (banco + redis) |
| `GET /api-docs` | Documentação Scalar (Basic Auth: `DOCS_USER` / `DOCS_PASSWORD`) |

---

## Rodando Localmente

### Pré-requisitos

- Node.js 22+
- PostgreSQL
- Redis (duas instâncias, ou uma compartilhada em dev)
- Conta no Firebase (Storage + Auth habilitados)
- Docker (opcional)

### 1. Instalar dependências

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configurar variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e preencha todas as variáveis. As obrigatórias são:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/drive_db
JWT_SECRET=<string longa e aleatória>
REFRESH_JWT_SECRET=<string diferente da anterior>
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=...
```

Para o frontend, crie `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Em desenvolvimento local, `REDIS_URL` e `REDIS_CACHE_URL` podem apontar para a mesma instância Redis:

```env
REDIS_URL=redis://localhost:6379
REDIS_CACHE_URL=redis://localhost:6379
```

### 3. Banco de dados

```bash
cd backend
npx prisma migrate dev
```

### 4. Iniciar os serviços

```bash
# Terminal 1 — backend (porta 3000)
cd backend && npm run dev

# Terminal 2 — frontend (porta 3001)
cd frontend && npm run dev
```

### 5. Testes

```bash
# Backend — 19 testes de integração
cd backend && npm test

# Frontend — unit tests
cd frontend && npm test

# E2E — Playwright (requer o frontend rodando)
cd frontend && npm run test:e2e
```

---

## Deploy com Docker Compose

O projeto inclui `docker-compose.yml` (dev/staging) e `docker-compose.prod.yml` (produção).

### Serviços no compose

| Serviço | Imagem | Porta exposta | Descrição |
|---|---|---|---|
| `postgres` | postgres:16-alpine | interno | Banco de dados |
| `redis` | redis:7-alpine | interno | BullMQ — `noeviction` |
| `redis-cache` | redis:7-alpine | interno | Preview cache — `allkeys-lru` |
| `migrations` | backend Dockerfile | — | Roda `prisma migrate deploy` antes do backend |
| `backend` | backend Dockerfile | 8080 | API Express |
| `frontend` | frontend Dockerfile | 3000 | Next.js |
| `email-worker` | email-worker Dockerfile | interno | Consome fila BullMQ |

### Variáveis obrigatórias no .env do servidor

```env
POSTGRES_PASSWORD=...
JWT_SECRET=...
REFRESH_JWT_SECRET=...
FRONTEND_URL=https://seudominio.com
BREVO_API_KEY=...
BREVO_FROM=noreply@seudominio.com
DOCS_PASSWORD=...
COOKIE_SECURE=true
EMAIL_WORKER_ADMIN_API_KEY=...
```

O Firebase é configurado via `backend/serviceAccountKey.json` montado no container (ver `docker-compose.yml`).

### nginx no host

O backend expõe a porta 8080 e o frontend a 3000. O nginx no host faz a terminação HTTPS e repassa as requisições:

```nginx
server {
    listen 443 ssl;
    server_name seudominio.com;

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

O `trust proxy 1` no Express garante que o rate limiting use o IP real do cliente (via `X-Forwarded-For`).

---

## CI/CD

### GitHub Actions (`.github/workflows/`)

| Workflow | Trigger | O que faz |
|---|---|---|
| `ci.yml` | push/PR em `main` | TypeScript, testes backend, testes frontend, Playwright E2E |
| `deploy.yml` | CI completa com sucesso | Build e push das imagens para GHCR, atualização via Watchtower |

O deploy só roda após o CI completar com sucesso (`workflow_run` + `conclusion == 'success'`). Watchtower (`5 min polling`) detecta as novas imagens e reinicia os containers automaticamente.

---

## Decisões de arquitetura

### Cookies httpOnly em vez de localStorage
Tokens em localStorage são acessíveis por qualquer JavaScript na página (XSS). Cookies httpOnly não são — o browser os envia automaticamente e scripts não podem lê-los.

### validateEnv() na startup
`backend/src/utils/validateEnv.ts` verifica 7 variáveis críticas antes de qualquer módulo ser carregado. Se alguma estiver ausente, o processo termina com mensagem clara em vez de falhar silenciosamente durante uma operação.

### Dois Redis
BullMQ precisa de `noeviction` — um job perdido é um e-mail nunca enviado. Cache de preview pode ser eviccionado livremente sem impacto funcional. Misturar os dois no mesmo Redis com `allkeys-lru` arriscaria apagar jobs de fila sob pressão de memória.

### Upload atômico
Se o `prisma.file.create()` falhar após o upload para o Firebase, o backend deleta o arquivo do Storage. Sem isso, arquivos órfãos acumulam no Firebase sem nenhum registro no banco.

### RFC 5987 no Content-Disposition
O header `filename=` padrão só suporta ASCII. RFC 5987 adiciona `filename*=UTF-8''nome%20com%20acentos`, garantindo que nomes com caracteres especiais sejam recebidos corretamente por todos os browsers.
