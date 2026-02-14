# Guia de Início Rápido

## Passo a Passo para Testar

### 1. Instalar Dependências do Frontend

```bash
cd frontend
npm install
```

### 2. Configurar Backend (se ainda não fez)

Certifique-se de que o backend está rodando:

```bash
cd backend
npm run dev
```

O backend deve estar rodando em `http://localhost:3000`

### 3. Instalar CORS no Backend (se necessário)

Se ainda não instalou o CORS:

```bash
cd backend
npm install cors @types/cors
```

### 4. Iniciar o Frontend

Em um novo terminal:

```bash
cd frontend
npm run dev
```

O frontend estará disponível em `http://localhost:3001` (ou outra porta se 3001 estiver ocupada).

### 5. Testar a Aplicação

1. Acesse `http://localhost:3001` (ou a porta que o Next.js indicar)
2. Você será redirecionado para `/login`
3. Clique em "Registre-se" para criar uma conta
4. Preencha os dados e crie a conta
5. Você será redirecionado para o dashboard
6. Teste fazer logout e login novamente

## Estrutura de URLs

- `/` - Redireciona para login ou dashboard
- `/login` - Página de login
- `/register` - Página de registro
- `/dashboard` - Dashboard protegido (requer autenticação)

## Troubleshooting

### Erro de CORS

Se aparecer erro de CORS, verifique:
1. O backend tem CORS instalado e configurado
2. A URL do frontend está correta no `.env` do backend (se configurado)
3. Ambos os servidores estão rodando

### Erro de Conexão

Se não conseguir conectar com a API:
1. Verifique se o backend está rodando em `http://localhost:3000`
2. Verifique o arquivo `.env.local` do frontend
3. Teste a rota `/health` do backend diretamente no navegador

### Token não persiste

O token é salvo no `localStorage`. Verifique:
1. Se o navegador permite localStorage
2. Se não está em modo anônimo/privado
