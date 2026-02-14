# Projeto Driver - Backend

Backend para sistema de armazenamento de arquivos tipo Google Drive.

## Pré-requisitos

- Node.js (v18 ou superior)
- PostgreSQL instalado e rodando
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

1. Implementar rotas de autenticação (registro/login)
2. Implementar middleware de autenticação JWT
3. Criar rotas para upload/download de arquivos
4. Implementar sistema de pastas hierárquico
