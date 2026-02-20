# Projeto Driver - Backend

Backend para sistema de armazenamento de arquivos tipo Google Drive.

## Pré-requisitos

- Node.js (v18 ou superior)
- PostgreSQL instalado e rodando
- Redis (opcional para cache de preview de arquivos)
- npm ou yarn

## Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Banco de Dados

1. Crie um banco de dados PostgreSQL:

```sql
CREATE DATABASE drive_db;
```

2. Configure a variável `DATABASE_URL` no arquivo `.env`:

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/drive_db?schema=public"
```

Substitua:
- `usuario`: seu usuário do PostgreSQL
- `senha`: sua senha do PostgreSQL
- `localhost:5432`: host e porta do seu PostgreSQL (ajuste se necessário)

3. Configure também o `JWT_SECRET` no `.env` com uma string segura (pode gerar uma aleatória).

4. (Opcional) Configure Redis para cache de preview:

```
REDIS_URL="redis://localhost:6379"
FILE_PREVIEW_CACHE_ENABLED=true
FILE_PREVIEW_CACHE_TTL_SECONDS=3600
FILE_PREVIEW_CACHE_MAX_BYTES=20971520
FILE_PREVIEW_MAX_BYTES=52428800
```

Se preferir, suba um Redis local com Docker Compose na raiz do monorepo:

```bash
docker compose up -d redis
```

### 3. Executar Migrations

Após configurar o `DATABASE_URL`, execute:

```bash
npm run prisma:migrate
```

Ou manualmente:

```bash
npx prisma migrate dev --name init
```

Isso criará as tabelas no banco de dados:
- `User` - Usuários do sistema
- `Folder` - Pastas hierárquicas
- `File` - Arquivos armazenados

### 4. Gerar Prisma Client (se necessário)

```bash
npm run prisma:generate
```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor em modo desenvolvimento
- `npm run build` - Compila o TypeScript para JavaScript
- `npm start` - Inicia o servidor em produção (após build)
- `npm run prisma:generate` - Gera o Prisma Client
- `npm run prisma:migrate` - Executa as migrations
- `npm run prisma:studio` - Abre o Prisma Studio (interface visual do banco)

## Estrutura do Projeto

```
backend/
├── src/
│   ├── index.ts          # Entry point do servidor
│   └── lib/
│       └── prisma.ts      # Cliente Prisma singleton
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   └── migrations/        # Migrations do Prisma
├── package.json
├── tsconfig.json
└── .env                   # Variáveis de ambiente (não versionado)
```

## Próximos Passos

Após configurar o banco e executar as migrations:

1. Criar testes de integração para as rotas críticas
2. Evoluir preview de arquivos com suporte a range/chunks para vídeos grandes
3. Configurar observabilidade para logs e métricas
