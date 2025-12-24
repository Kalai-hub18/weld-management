# 🔥 Welding Management System

A comprehensive enterprise-level welding workforce management solution built with the MERN stack.

## 🚀 Tech Stack

### Frontend
- React 18 + Vite
- TailwindCSS + Material UI (Hybrid)
- Framer Motion (Animations)
- React Router DOM v6
- Dark/Light Theme Toggle

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Role-Based Access Control (RBAC)
- Zod Validation

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access - Manage workers, projects, tasks, salary, attendance |
| **Manager** | View/Edit workers, manage attendance, daily tasks, view salary & projects |
| **Worker** | View personal profile, assigned tasks, mark own attendance |

## 🎨 Branding

- **Primary Color:** `#FF6A00` (Welding Orange)
- **Secondary:** `#1E293B` (Slate Dark)
- **Typography:** Inter (Primary), Roboto (Secondary)

## 📁 Project Structure

```
weld-management/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── theme/
│   │   ├── data/
│   │   ├── router/
│   │   ├── utils/
│   │   └── assets/
│   └── ...
├── backend/           # Express.js API
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── utils/
│   └── server.js
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd weld-management
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

4. **Environment Setup**

Create `.env` file in backend folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/weld-management
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

5. **Seed Demo Data**
```bash
cd backend
npm run seed
```

6. **Run Development Servers**

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

## 🔐 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Worker | worker | worker123 |

## 📝 License

MIT License - Feel free to use for your projects!

---

Built with ❤️ for the welding industry
