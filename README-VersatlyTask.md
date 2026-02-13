# 🚀 VersatlyTask

Modern Trello clone with real-time collaboration, built with React, Node.js, and PostgreSQL.

## 🎯 Features

### Phase 1 - Foundation
- ✅ User authentication (JWT)
- ✅ Workspaces management
- ✅ Boards CRUD
- ✅ Lists CRUD
- ✅ Cards CRUD
- ✅ Database with PostgreSQL + Prisma

### Phase 2 - Core Features
- ✅ Drag & Drop (cards and lists)
- ✅ Members and permissions system
- ✅ Customizable labels
- ✅ WebSocket for real-time updates
- ✅ Complete card modal

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Beautiful DnD
- React Query
- Zustand
- Socket.io Client
- React Router

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL
- Prisma ORM
- Socket.io
- JWT Authentication
- bcrypt

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd versatly-task
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables

**Backend (.env in /backend):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/versatlytask"
JWT_SECRET="your-secret-key"
PORT=5000
```

**Frontend (.env in /frontend):**
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

4. Setup database
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. Run the application
```bash
# From root directory
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 📁 Project Structure

```
versatly-task/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   └── types/         # TypeScript types
│   └── package.json
├── backend/               # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   ├── utils/         # Utilities
│   │   └── types/         # TypeScript types
│   ├── prisma/           # Database schema
│   └── package.json
├── shared/               # Shared types and utilities
└── package.json          # Root workspace config
```

## 🔧 Development

### Running tests
```bash
npm run test
```

### Building for production
```bash
npm run build
```

## 📝 API Documentation

API documentation is available at `/api/docs` when running the backend.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines first.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Version**: 1.0.0
**Built with** ❤️ using React, Node.js, and PostgreSQL
