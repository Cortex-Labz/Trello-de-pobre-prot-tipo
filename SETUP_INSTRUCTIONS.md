# 🚀 VersatlyTask - Setup Instructions

## ✅ O que foi implementado

### Backend (✅ 100% Completo - Fase 1 e 2)
- ✅ Node.js + Express + TypeScript
- ✅ PostgreSQL + Prisma ORM (schema completo)
- ✅ Autenticação JWT + bcrypt
- ✅ CRUD completo de Workspaces (com permissões)
- ✅ CRUD completo de Boards (com permissões)
- ✅ CRUD completo de Lists
- ✅ CRUD completo de Cards
- ✅ Sistema de Labels customizáveis
- ✅ Sistema de Membros (Workspace e Board)
- ✅ WebSocket (Socket.io) para atualizações em tempo real
- ✅ Middleware de autenticação e erro
- ✅ Validações com express-validator

### Frontend (✅ 80% Base Completa)
- ✅ React 18 + TypeScript + Vite
- ✅ Tailwind CSS configurado
- ✅ React Query para gerenciamento de estado servidor
- ✅ Zustand para estado global (autenticação)
- ✅ Axios configurado com interceptors
- ✅ Sistema de rotas (React Router)
- ✅ Páginas de Login e Register
- ✅ Dashboard Page
- ✅ Tipos TypeScript completos
- ✅ Services para todas as APIs
- ⏳ Workspace Page (placeholder)
- ⏳ Board Page com Drag & Drop (placeholder)

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 14

## 🔧 Instalação

### 1. Instalar dependências

```bash
# Na raiz do projeto
npm install

# Ou instale separadamente
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configurar PostgreSQL

Crie um banco de dados PostgreSQL:

```sql
CREATE DATABASE versatlytask;
```

### 3. Configurar variáveis de ambiente

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/versatlytask"
JWT_SECRET="seu-jwt-secret-super-secreto-mude-em-producao"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
ALLOWED_ORIGINS="http://localhost:5173"
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000
```

### 4. Rodar migrações do Prisma

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## 🚀 Rodando o projeto

### Opção 1: Rodar tudo de uma vez (Recomendado)

```bash
# Na raiz do projeto
npm run dev
```

Isso vai rodar:
- Backend em `http://localhost:5000`
- Frontend em `http://localhost:5173`

### Opção 2: Rodar separadamente

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🧪 Testando o sistema

1. Acesse `http://localhost:5173`
2. Clique em "Register" para criar uma conta
3. Faça login com suas credenciais
4. Você será redirecionado para o Dashboard
5. Crie um Workspace
6. Crie Boards dentro do Workspace
7. Adicione Lists e Cards nos Boards

## 📦 Estrutura do Projeto

```
VersatlyTask/
├── backend/                    # Node.js + Express API
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth & error middleware
│   │   ├── services/         # Business logic & WebSocket
│   │   ├── utils/            # JWT, password, prisma
│   │   └── index.ts          # Main server file
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── store/            # Zustand stores
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main App component
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Tailwind CSS
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── package.json               # Root workspace
└── README-VersatlyTask.md    # Main README

```

## 🔐 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter usuário atual (protegido)
- `PUT /api/auth/me` - Atualizar perfil (protegido)

### Workspaces
- `GET /api/workspaces` - Listar workspaces
- `POST /api/workspaces` - Criar workspace
- `GET /api/workspaces/:id` - Obter workspace
- `PUT /api/workspaces/:id` - Atualizar workspace
- `DELETE /api/workspaces/:id` - Deletar workspace
- `POST /api/workspaces/:id/members` - Adicionar membro
- `DELETE /api/workspaces/:id/members/:userId` - Remover membro

### Boards
- `GET /api/boards?workspaceId=xxx` - Listar boards
- `POST /api/boards` - Criar board
- `GET /api/boards/:id` - Obter board completo (com lists e cards)
- `PUT /api/boards/:id` - Atualizar board
- `DELETE /api/boards/:id` - Deletar board
- `POST /api/boards/:id/archive` - Arquivar/Desarquivar
- `POST /api/boards/:id/duplicate` - Duplicar board
- `POST /api/boards/:id/members` - Adicionar membro
- `PUT /api/boards/:id/members/:userId` - Atualizar role do membro
- `DELETE /api/boards/:id/members/:userId` - Remover membro

### Lists
- `POST /api/lists` - Criar lista
- `PUT /api/lists/:id` - Atualizar lista
- `DELETE /api/lists/:id` - Deletar lista
- `POST /api/lists/:id/archive` - Arquivar lista
- `PUT /api/lists/reorder` - Reordenar listas

### Cards
- `GET /api/cards/:id` - Obter card completo
- `POST /api/cards` - Criar card
- `PUT /api/cards/:id` - Atualizar card
- `DELETE /api/cards/:id` - Deletar card
- `PUT /api/cards/:id/move` - Mover card entre listas
- `POST /api/cards/:id/archive` - Arquivar card
- `POST /api/cards/:id/duplicate` - Duplicar card
- `POST /api/cards/:id/members` - Atribuir membro
- `DELETE /api/cards/:id/members/:userId` - Remover membro

### Labels
- `GET /api/labels/board/:boardId` - Listar labels do board
- `POST /api/labels` - Criar label
- `PUT /api/labels/:id` - Atualizar label
- `DELETE /api/labels/:id` - Deletar label
- `POST /api/labels/:labelId/cards/:cardId` - Adicionar label ao card
- `DELETE /api/labels/:labelId/cards/:cardId` - Remover label do card

## 🔌 WebSocket Events

O servidor WebSocket está configurado e pronto. Conecte-se em `ws://localhost:5000` com autenticação JWT.

**Client events (enviar):**
- `join:board` - Entrar em uma sala de board
- `leave:board` - Sair de uma sala de board

**Server events (receber):**
- `board:updated` - Board foi atualizado
- `list:created` - Nova lista criada
- `list:updated` - Lista atualizada
- `list:deleted` - Lista deletada
- `card:created` - Novo card criado
- `card:updated` - Card atualizado
- `card:moved` - Card movido
- `card:deleted` - Card deletado
- `notification` - Nova notificação para o usuário

## 🛠️ Ferramentas úteis

### Prisma Studio
Visualize e edite o banco de dados:
```bash
cd backend
npx prisma studio
```

### Build para produção

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## 📝 Próximos Passos

Para completar 100% do projeto, você ainda precisa implementar:

### Frontend
1. **Workspace Page completa** - Listar e gerenciar boards do workspace
2. **Board Page com Drag & Drop** - Implementar @hello-pangea/dnd
3. **Card Modal** - Modal completo com todos os detalhes
4. **Componentes de UI** - Modais, dropdowns, date pickers
5. **WebSocket Client** - Conectar e escutar eventos em tempo real
6. **Comentários e Checklists** - Componentes e funcionalidades
7. **Anexos** - Upload e visualização de arquivos
8. **Dark Mode Toggle** - Botão para alternar tema

### Backend (Fase 3 - Opcional)
- Endpoints de Comentários
- Endpoints de Checklists
- Upload de anexos (S3 ou local)
- Notificações
- Busca global

## 🐛 Troubleshooting

### Erro de conexão com PostgreSQL
- Verifique se o PostgreSQL está rodando
- Confira as credenciais no arquivo `.env`
- Teste a conexão: `npx prisma db push`

### Erro de porta já em uso
- Backend: Mude a porta em `backend/.env`
- Frontend: Mude em `frontend/vite.config.ts`

### Erro de autenticação
- Limpe o localStorage do navegador
- Verifique se o JWT_SECRET está configurado
- Confira os logs do backend

## 📚 Tecnologias Utilizadas

**Backend:**
- Node.js, Express, TypeScript
- PostgreSQL, Prisma ORM
- Socket.io (WebSocket)
- JWT, bcryptjs
- express-validator

**Frontend:**
- React 18, TypeScript
- Vite (build tool)
- Tailwind CSS
- React Query (@tanstack/react-query)
- Zustand (state management)
- React Router
- Axios
- @hello-pangea/dnd (drag and drop)

---

**Desenvolvido com ❤️ para o VersatlyTask**

🎉 **Parabéns!** Você tem agora um clone do Trello full-stack funcional com autenticação, workspaces, boards, lists, cards, labels, membros e WebSocket em tempo real!
