# Projeto Driver

Aplicação fullstack de armazenamento de arquivos em nuvem, inspirada no Google Drive. Permite que usuários façam upload, organizem e visualizem arquivos em pastas hierárquicas, além de criar espaços compartilhados (famílias) com outros usuários — tudo com autenticação, controle de acesso e envio de e-mails transacionais via fila assíncrona.

---

## Funcionalidades

### Autenticação
- Cadastro e login com e-mail/senha
- Login social com **Google** (via Firebase Auth)
- Recuperação de senha com link enviado por e-mail (token com TTL de 30 min)
- Proteção de rotas: JWT no header `Authorization: Bearer <token>`

### Gerenciamento de Arquivos
- Upload de múltiplos arquivos com validação de tipo MIME e tamanho
- Armazenamento no **Firebase Storage**
- Download direto com URL assinada
- Preview em tempo real para imagens, PDFs e arquivos de texto — com cache no **Redis**
- Renomear e mover arquivos entre pastas
- Exclusão com remoção do Storage

### Pastas
- Hierarquia de pastas com suporte a aninhamento ilimitado
- Navegação via breadcrumb
- Prevenção de ciclos ao mover (uma pasta não pode ser movida para dentro de si mesma ou de seus descendentes)
- Exclusão em cascata (remove subpastas e arquivos)

### Famílias (Espaço Colaborativo)
- Cada usuário pode criar uma família e convidar membros por e-mail
- Convite enviado via e-mail transacional (BullMQ + email-worker)
- Fluxo de aceite/recusa de convite
- Arquivos e pastas podem pertencer a uma família, tornando-os acessíveis a todos os membros aceitos
- Gerenciamento de membros (remover membros, visualizar lista)
- Apenas o dono da família pode gerenciar configurações

### Segurança e Observabilidade
- **Rate limiting** nas rotas de autenticação (20 req/15min) e upload (15 req/60s)
- **Audit logs** para todas as ações relevantes (com IP, user agent e metadados)
- Hashing de senha com **bcryptjs**
- Validação de dados com **Zod** em todas as rotas

### Fila de E-mails (email-worker)
- Publicação assíncrona de jobs via **BullMQ + Redis**
- Jobs suportados: `family_invite` e `forgot_password`
- Retry automático: 3 tentativas com backoff exponencial (2s base)
- Worker separado (`email-worker`) consome a fila e envia e-mails via Gmail SMTP ou Resend
- Dashboard visual da fila via **Bull Board** (`/admin/queues`)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Estilização | Tailwind CSS, Radix UI, Lucide Icons |
| Gerenciamento de estado | React Context + TanStack React Query |
| Backend | Node.js, Express, TypeScript |
| Banco de dados | PostgreSQL + Prisma ORM |
| Armazenamento | Firebase Storage |
| Autenticação social | Firebase Auth (Google) |
| Cache | Redis (preview de arquivos) |
| Fila de mensagens | BullMQ + Redis |
| Validação | Zod |
| Testes | Vitest |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        Railway                              │
│                                                             │
│  ┌──────────────┐   REST API   ┌──────────────────────┐    │
│  │   Frontend   │◄────────────►│  Backend (Express)   │    │
│  │  (Next.js)   │              │                      │    │
│  └──────────────┘              │  ┌────────────────┐  │    │
│                                │  │ Prisma / PgSQL │  │    │
│                                │  └────────────────┘  │    │
│                                │  ┌────────────────┐  │    │
│                                │  │ Firebase Admin │  │    │
│                                │  │   (Storage)    │  │    │
│                                │  └────────────────┘  │    │
│                                │  ┌────────────────┐  │    │
│                                │  │  Redis (cache) │  │    │
│                                │  │  BullMQ (fila) │  │    │
│                                │  └────────────────┘  │    │
│                                └──────────────────────┘    │
│                                          │                  │
│                               publica job na fila           │
│                                          ▼                  │
│                                ┌──────────────────┐        │
│                                │   email-worker   │        │
│                                │ (serviço separado)│        │
│                                │  BullMQ consumer │        │
│                                │  Gmail / Resend  │        │
│                                └──────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## Estrutura do Projeto

```
Projeto-driver/
├── backend/
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── app.ts                 # Express app + registro de rotas
│   │   ├── controllers/
│   │   │   ├── authController.ts  # Registro, login, Google, reset de senha
│   │   │   ├── fileController.ts  # Upload, download, preview, CRUD de arquivos
│   │   │   ├── folderController.ts# CRUD de pastas com hierarquia
│   │   │   └── familyController.ts# Famílias, convites, membros
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── fileRoutes.ts
│   │   │   ├── folderRoutes.ts
│   │   │   └── familyRoutes.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Verificação do JWT
│   │   │   ├── validate.ts        # Middleware de validação Zod
│   │   │   └── rateLimit.ts       # Rate limiting por rota
│   │   ├── lib/
│   │   │   ├── prisma.ts          # Singleton do Prisma Client
│   │   │   ├── firebase.ts        # Firebase Admin (Storage)
│   │   │   ├── redis.ts           # Redis client + cache de preview
│   │   │   ├── multer.ts          # Config de upload (tamanho, MIME)
│   │   │   ├── emailQueue.ts      # Publicação de jobs BullMQ
│   │   │   ├── auditLog.ts        # Registro de audit logs
│   │   │   └── familyAccess.ts    # Checagem de permissão familiar
│   │   ├── utils/
│   │   │   ├── jwt.ts             # Geração e verificação de JWT
│   │   │   └── password.ts        # Hashing e comparação de senha
│   │   └── validation/
│   │       ├── authSchemas.ts
│   │       ├── fileSchemas.ts
│   │       ├── folderSchemas.ts
│   │       └── familySchemas.ts
│   └── prisma/
│       └── schema.prisma          # Modelos do banco de dados
│
└── frontend/
    └── src/
        ├── app/
        │   ├── dashboard/         # Área autenticada
        │   │   ├── page.tsx       # Browser de arquivos
        │   │   ├── profile/       # Perfil do usuário
        │   │   └── family/        # Gestão de família
        │   ├── login/             # Tela de login
        │   ├── register/          # Cadastro
        │   ├── forgot-password/   # Solicitar reset de senha
        │   └── reset-password/    # Definir nova senha
        ├── contexts/              # AuthContext, ThemeContext, UploadContext
        ├── components/            # Componentes UI reutilizáveis
        ├── features/
        │   ├── files/             # FileBrowser, FileGrid, UploadZone, hooks
        │   └── family/            # Componentes e hooks de família
        └── lib/
            └── api/               # Camada de comunicação com a API
```

---

## Banco de Dados

### Modelos

**User** — usuário da plataforma
- Suporta login por e-mail/senha e Google OAuth (campos separados)
- Relacionado a arquivos, pastas, famílias e logs de auditoria

**Folder** — pasta do sistema de arquivos
- Hierarquia via `parentId` (auto-relacionamento)
- Pode pertencer a um usuário ou a uma família

**File** — arquivo armazenado
- Referencia o caminho no Firebase Storage
- Armazena `mimeType`, `size`, e referência à pasta e família

**Family** — espaço colaborativo
- Cada usuário pode ser dono de exatamente uma família (`ownerId` único)
- Contém membros via `FamilyMember`

**FamilyMember** — convite/membro de família
- Status: `pending` | `accepted` | `declined`
- Restrições únicas: um e-mail por família, um usuário por família

**AuditLog** — registro de ações
- Armazena ação, recurso, usuário, IP, user agent e metadados JSON

**PasswordResetToken** — token de redefinição de senha
- Hash SHA-256 do token, TTL de 30 minutos, marcado como usado após conclusão

---

## API

### Autenticação

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/register` | Pública | Criar conta |
| `POST` | `/api/auth/login` | Pública | Login com e-mail e senha |
| `POST` | `/api/auth/google` | Pública | Login com Google (Firebase ID token) |
| `POST` | `/api/auth/forgot-password` | Pública | Solicitar link de reset de senha |
| `POST` | `/api/auth/reset-password` | Pública | Redefinir senha com token |
| `GET` | `/api/auth/me` | JWT | Dados do usuário autenticado |
| `PATCH` | `/api/auth/me` | JWT | Atualizar perfil |

### Arquivos

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/files` | JWT | Listar arquivos (suporta busca e filtro por pasta) |
| `POST` | `/api/files` | JWT | Upload de um ou mais arquivos |
| `GET` | `/api/files/:id` | JWT | Metadados de um arquivo |
| `GET` | `/api/files/:id/download` | JWT | Download do arquivo |
| `GET` | `/api/files/:id/preview` | JWT | Preview com cache Redis |
| `PATCH` | `/api/files/:id` | JWT | Renomear ou mover arquivo |
| `DELETE` | `/api/files/:id` | JWT | Excluir arquivo |

### Pastas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/folders` | JWT | Listar pastas (suporta `parentId`) |
| `POST` | `/api/folders` | JWT | Criar pasta |
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
| `GET` | `/api/families/invitations` | JWT | Convites recebidos |
| `PATCH` | `/api/families/invitations/:id` | JWT | Aceitar ou recusar convite |
| `GET` | `/api/families/:familyId/members` | JWT | Listar membros |
| `DELETE` | `/api/families/:familyId/members/:userId` | JWT | Remover membro |

---

## Rodando Localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL
- Redis
- Conta no Firebase (Storage + Auth)
- Docker (opcional, para PostgreSQL e Redis)

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-usuario/projeto-driver.git
cd projeto-driver

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configurar variáveis de ambiente

**Backend** — copie e preencha `backend/.env`:

```env
PORT=3000
FRONTEND_URL=http://localhost:3001
DATABASE_URL="postgresql://usuario:senha@localhost:5432/drive_db?schema=public"
JWT_SECRET=chave-secreta-longa-e-aleatoria

# Redis (cache de preview + fila de emails)
REDIS_URL=redis://localhost:6379
REDIS_CONNECT_TIMEOUT_MS=300
FILE_PREVIEW_CACHE_TTL_SECONDS=3600
FILE_PREVIEW_CACHE_MAX_BYTES=20971520   # 20 MB por arquivo em cache
FILE_PREVIEW_MAX_BYTES=52428800         # 50 MB tamanho máximo para preview

# Reset de senha
PASSWORD_RESET_TOKEN_TTL_MINUTES=30
```

**Firebase** — adicione ao `.env` do backend as credenciais do Firebase Admin SDK:

```env
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
```

**Frontend** — copie e preencha `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Banco de dados

```bash
cd backend
npx prisma migrate dev
```

### 4. Iniciar os serviços

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev

# Terminal 3 — email-worker (opcional, para envio de e-mails)
cd ../email-worker && npm run dev
```

Frontend: [http://localhost:3001](http://localhost:3001)
Backend: [http://localhost:3000](http://localhost:3000)

---

## Serviço de E-mail (email-worker)

O envio de e-mails é feito por um serviço separado (`email-worker`) que consome a fila BullMQ publicada pelo backend. Isso mantém o backend sem bloqueio e permite retry automático em caso de falha.

Repositório do worker: [repositorio (click)](https://github.com/SamuelFontess/servico-mensageria)

### Como funciona

```
Backend
  └── publishEmailJob('family_invite' | 'forgot_password', payload)
           │
           ▼ BullMQ (Redis — fila "email")
email-worker
  ├── Consome o job
  ├── Renderiza template HTML (family-invite.html / forgot-password.html)
  ├── Envia via Gmail SMTP ou Resend
  └── Emite evento email:status via WebSocket
```

### Variáveis necessárias no email-worker

```env
REDIS_URL=redis://localhost:6379
ADMIN_API_KEY=chave-gerada-com-openssl
FRONTEND_URL=http://localhost:3001

# Gmail SMTP (gratuito, sem domínio)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuapp@gmail.com
SMTP_PASS=senha-de-app-16-caracteres
SMTP_FROM=seuapp@gmail.com
```

Veja o [README do email-worker](https://github.com/SamuelFontess/servico-mensageria)

---

## Deploy no Railway

O projeto está configurado para deploy no Railway com 4 serviços no mesmo projeto:

| Serviço | Descrição |
|---|---|
| **Backend** | API Express — porta 3000 (ou `$PORT` do Railway) |
| **Frontend** | Next.js — porta 3001 |
| **PostgreSQL** | Banco de dados gerenciado pelo Railway |
| **Redis** | Cache + fila de e-mails |
| **email-worker** | Worker separado consumindo a fila Redis |

Para conectar o backend ao Redis e PostgreSQL do Railway, use referências de variáveis:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

---

## Testes

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

Os testes usam **Vitest**. O backend inclui testes de integração de rotas com `supertest`.

---

## Decisões de Arquitetura

### Por que Firebase Storage?
Elimina a necessidade de gerenciar servidor de arquivos. Os uploads vão direto do backend para o Firebase, e os downloads são servidos via URLs assinadas — sem tráfego extra pelo servidor.

### Por que Redis para preview?
Arquivos de preview (imagens, PDFs pequenos) são gerados sob demanda e cacheados no Redis com TTL configurável. Isso evita bater no Firebase Storage a cada visualização.

### Por que BullMQ ao invés de chamar o provedor de e-mail diretamente?
O envio de e-mail pode falhar por instabilidade do provedor. Com BullMQ, o backend simplesmente publica o job e retorna ao cliente imediatamente. O worker cuida dos retries (3 tentativas, backoff exponencial) sem impacto na latência do endpoint.

### Por que um serviço de e-mail separado?
Isola a responsabilidade de envio de e-mail do backend principal. Se o worker cair, o backend continua funcionando. Os jobs ficam na fila do Redis até o worker voltar.

### Por que Redis é opcional no backend?
O cache de preview degrada graciosamente: se o Redis não estiver disponível, o sistema busca o arquivo no Firebase a cada request. Nenhuma funcionalidade crítica depende do Redis no backend — apenas performance.
