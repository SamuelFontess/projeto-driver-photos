# Frontend — Projeto Driver

Interface Next.js 14 (App Router) para o sistema de armazenamento de arquivos.

---

## Como funciona

### Proteção de rotas

A autenticação usa **dois níveis de proteção**:

**1. Edge Middleware (`src/middleware.ts`)** — roda no Edge Runtime antes de servir qualquer HTML:
- Verifica a presença do cookie `access_token`
- Se ausente: redireciona para `/login?from=<path>` (preserva a rota de destino)
- Cobre todas as rotas `/dashboard/*`
- Nota: verifica apenas a presença do cookie, não a assinatura JWT (o Edge Runtime não tem acesso ao `JWT_SECRET`). A validação de assinatura é feita pelo backend em cada request de API.

**2. `AuthContext` (`src/contexts/AuthContext.tsx`)** — client-side:
- Chama `GET /api/auth/me` ao montar
- Armazena o usuário autenticado no contexto
- Redireciona para `/login` se a chamada falhar (token expirado ou inválido)
- Expõe `useAuth()` hook para acesso ao usuário em qualquer componente

### Renovação de token (refresh)

O `access_token` expira em 15 minutos. A camada de API (`src/lib/api/`) intercepta respostas 401:
1. Chama `POST /api/auth/refresh`
2. Se o backend responder com sucesso (novo cookie setado), repete o request original
3. Se o refresh falhar, redireciona para `/login`

Os tokens são cookies httpOnly — o JavaScript **nunca lê** os tokens diretamente. O browser os envia automaticamente em cada request para o domínio.

### Gerenciamento de estado

| Ferramenta | Uso |
|---|---|
| **React Context** | Estado de autenticação (`AuthContext`), tema (`ThemeContext`), uploads em progresso (`UploadContext`) |
| **TanStack React Query** | Cache de dados do servidor: arquivos, pastas, família. Invalida automaticamente após mutações. |
| **React Hook Form + Zod** | Validação de formulários client-side |

### Upload de arquivos

O `UploadContext` gerencia uploads em progresso:
1. Usuário arrasta arquivos para `UploadZone` ou usa o input
2. Upload feito via `POST /api/files` com `multipart/form-data`
3. Estado de progresso exibido via `UploadContext`
4. Após conclusão, React Query invalida a query de arquivos da pasta atual

---

## Páginas

| Rota | Página | Auth |
|---|---|---|
| `/login` | Login e-mail/senha + botão Google OAuth | Pública |
| `/register` | Cadastro | Pública |
| `/forgot-password` | Solicitar link de reset | Pública |
| `/reset-password?token=...` | Definir nova senha | Pública (requer token) |
| `/dashboard` | Browser de arquivos — lista pastas e arquivos | Protegida |
| `/dashboard/profile` | Perfil do usuário | Protegida |
| `/dashboard/family` | Gestão da família | Protegida |
| `/dashboard/family/invite` | Convidar membro | Protegida |
| `/dashboard/family/settings` | Configurações da família | Protegida |
| `/admin/*` | Painel admin | Protegida + admin |

### Dashboard (Browser de arquivos)

O dashboard é o core do produto. A URL reflete o estado da navegação:
- `?folderId=<id>` — pasta atual (ausente = raiz)
- `?scope=personal|family` — contexto pessoal ou familiar

Funcionalidades:
- Duplo clique em pasta → navega para ela (atualiza URL)
- Breadcrumb clicável mostra o caminho completo
- Upload por drag-and-drop ou seleção de arquivo
- Busca com debounce (300ms)
- Preview inline para imagens, PDFs e texto
- Menu de contexto: renomear, mover, download, excluir
- Pastas favoritas acessíveis no sidebar

---

## Variáveis de Ambiente

Crie `frontend/.env.local`:

```env
# URL do backend (sem barra no final)
NEXT_PUBLIC_API_URL=http://localhost:3000

# Firebase (autenticação Google — client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Nota sobre Google Login**: o Firebase no frontend só faz a autenticação OAuth e retorna um `idToken`. Esse token é enviado para `POST /api/auth/google` e verificado pelo backend com o Firebase Admin SDK. O Firebase Storage não é usado diretamente pelo frontend — todos os uploads e downloads passam pelo backend.

---

## Estrutura de Pastas

```
frontend/
├── src/
│   ├── middleware.ts                # Edge Middleware — protege /dashboard/*
│   ├── app/
│   │   ├── layout.tsx               # Layout raiz — providers globais
│   │   ├── page.tsx                 # Redireciona para /dashboard ou /login
│   │   ├── login/
│   │   │   └── page.tsx             # LoginPage
│   │   ├── register/
│   │   │   └── page.tsx             # RegisterPage
│   │   ├── forgot-password/
│   │   │   └── page.tsx             # ForgotPasswordPage
│   │   ├── reset-password/
│   │   │   └── page.tsx             # ResetPasswordPage (lê ?token= da URL)
│   │   └── dashboard/
│   │       ├── layout.tsx           # DashboardLayout — sidebar, header, AuthContext
│   │       ├── page.tsx             # FileBrowser principal
│   │       ├── profile/
│   │       │   └── page.tsx         # Perfil do usuário
│   │       └── family/
│   │           ├── page.tsx         # Visão geral da família
│   │           ├── invite/page.tsx  # Formulário de convite
│   │           └── settings/page.tsx# Configurações da família
│   ├── contexts/
│   │   ├── AuthContext.tsx          # useAuth() — usuário autenticado
│   │   ├── ThemeContext.tsx         # useTheme() — claro/escuro
│   │   └── UploadContext.tsx        # useUpload() — progresso de uploads
│   ├── components/
│   │   ├── ui/                      # Componentes base (shadcn/ui)
│   │   └── ...                      # Componentes de layout: Sidebar, Header, Breadcrumb
│   ├── features/
│   │   ├── files/
│   │   │   ├── FileBrowser.tsx      # Componente principal do browser
│   │   │   ├── FileGrid.tsx         # Grade de arquivos
│   │   │   ├── UploadZone.tsx       # Drag-and-drop
│   │   │   └── hooks/               # useFiles, useFolders, useFileActions
│   │   └── family/
│   │       ├── FamilyCard.tsx
│   │       └── hooks/               # useFamily, useFamilyMembers
│   └── lib/
│       ├── api/
│       │   ├── client.ts            # fetch wrapper com interceptor de 401 (refresh)
│       │   ├── auth.ts              # authApi — login, register, me, logout, refresh
│       │   ├── files.ts             # filesApi — list, upload, download, preview, CRUD
│       │   ├── folders.ts           # foldersApi — list, create, CRUD, favorites
│       │   └── families.ts          # familiesApi — CRUD, invites, members
│       └── firebase.ts              # Firebase client init (autenticação Google)
├── e2e/                             # Testes Playwright
│   ├── pages/                       # Page Object Models
│   └── tests/                       # Specs
├── Dockerfile                       # Multi-stage: deps + build + runner
├── next.config.js
├── tailwind.config.ts
├── playwright.config.ts
└── package.json
```

---

## Scripts

```bash
npm run dev          # Next.js dev server (hot reload)
npm run build        # Build de produção
npm start            # Servidor de produção (após build)
npm run lint         # ESLint
npm test             # vitest run — unit tests
npm run test:watch   # vitest (watch mode)
npm run test:e2e     # Playwright E2E
npm run test:e2e:ui  # Playwright UI mode (debug visual)
npm run test:e2e:report   # Abrir último relatório HTML
```

---

## Testes

### Unit (Vitest)

Testes dos hooks e componentes principais com Testing Library + jsdom.

### E2E (Playwright)

34+ testes cobrindo os fluxos críticos. Todos os requests de API são interceptados por `page.route()` — sem dependência de backend real.

| Spec | Cobertura |
|---|---|
| `auth.spec.ts` | login, registro, logout |
| `guards.spec.ts` | redirect para /login, redirect com `from`, redirect após login |
| `dashboard.spec.ts` | listagem, navegação de pasta (URL + breadcrumb), upload, busca |
| `forgot-password.spec.ts` | display, submit success/erro, loading, validação, link de volta |
| `reset-password.spec.ts` | com/sem token, success+redirect, token expirado, senhas divergentes |
| `family.spec.ts` | sem família (card + criar + erro), com família (header + empty state + arquivos) |

```bash
# Rodar todos os testes E2E
npm run test:e2e

# Apenas um spec
npx playwright test e2e/tests/auth.spec.ts

# Com UI interativa (debug)
npm run test:e2e:ui
```

---

## Notas de implementação

### httpOnly cookies (não localStorage)
O `access_token` e `refresh_token` são cookies httpOnly. O frontend nunca lê os tokens — o browser os envia automaticamente. Isso protege contra XSS.

### Middleware vs AuthContext
O Edge Middleware bloqueia requests no edge (antes de o servidor Next.js processar a página), eliminando o flash de conteúdo protegido. O `AuthContext` faz a validação client-side após a hidratação para manter o estado de usuário atualizado.

### Build no Docker
O `NEXT_PUBLIC_API_URL` é embutido no build em tempo de compilação. O Dockerfile recebe esse valor via `ARG NEXT_PUBLIC_API_URL` e o repassa para `next build`. O `docker-compose.yml` passa o valor via `args:`.
