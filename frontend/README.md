# Projeto Driver - Frontend

Frontend Next.js para o sistema de armazenamento de arquivos tipo Google Drive.

## Pré-requisitos

- Node.js (v18 ou superior)
- npm ou yarn
- Backend rodando em `http://localhost:3000`

## Instalação

1. Instale as dependências:

```bash
npm install
```

2. Configure a URL da API (opcional, padrão é `http://localhost:3000`):

Crie um arquivo `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Executar

### Modo Desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3000` (ou outra porta se 3000 estiver ocupada).

### Build de Produção

```bash
npm run build
npm start
```

## Estrutura do Projeto

```
frontend/
├── src/
│   ├── app/              # Páginas Next.js (App Router)
│   │   ├── page.tsx      # Página inicial (redireciona)
│   │   ├── login/        # Página de login
│   │   ├── register/     # Página de registro
│   │   ├── dashboard/    # Dashboard protegido
│   │   ├── layout.tsx    # Layout principal
│   │   └── globals.css   # Estilos globais
│   ├── contexts/          # Contextos React
│   │   └── AuthContext.tsx  # Contexto de autenticação
│   └── lib/              # Utilitários
│       └── api.ts        # Cliente API
├── package.json
├── tsconfig.json
└── next.config.js
```

## Funcionalidades Implementadas

- ✅ Registro de usuário
- ✅ Login com JWT
- ✅ Proteção de rotas (dashboard)
- ✅ Gerenciamento de token (localStorage)
- ✅ Contexto de autenticação global
- ✅ UI básica e responsiva

## Próximos Passos

- Upload de arquivos
- Listagem de arquivos/pastas
- Download de arquivos
- Gerenciamento de pastas
- Visualização de arquivos

## Notas

- O token JWT é armazenado no `localStorage`
- As rotas protegidas redirecionam para `/login` se não autenticado
- A API do backend deve estar rodando na porta configurada
