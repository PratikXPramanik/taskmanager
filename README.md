# TaskFlow — Team Task Manager

A full-stack task management web app with role-based access control.

## 🚀 Live Demo
- Frontend: https://energetic-harmony-production-efcd.up.railway.app
- Backend health: https://taskmanager-production-0b94.up.railway.app/health

## ✨ Features

- **Authentication** — JWT-based signup/login
- **Projects** — Create and manage projects
- **Team Members** — Invite by email, assign roles (Admin/Member)
- **Tasks** — Create, assign, filter, and track with Kanban board
- **Dashboard** — Personal stats: overdue, in-progress, recent activity
- **Role-Based Access** — Admins manage team & all tasks; members manage their own
- **Fully Responsive** — Mobile-friendly dark UI

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router 6, Axios |
| Backend | Node.js, Express 4 |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcryptjs |
| Deployment | Railway (Docker) |

## 📁 Project Structure

```
taskmanager/
├── backend/
│   ├── src/
│   │   ├── db/database.js       # SQLite schema & connection
│   │   ├── middleware/auth.js   # JWT + role middleware
│   │   └── routes/
│   │       ├── auth.js          # /api/auth/*
│   │       ├── projects.js      # /api/projects/*
│   │       ├── tasks.js         # /api/projects/:id/tasks/*
│   │       └── dashboard.js     # /api/dashboard
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/axios.js
│   │   ├── context/AuthContext.js
│   │   ├── components/
│   │   │   ├── Layout.js + Layout.css
│   │   │   └── Modal.js + Modal.css
│   │   └── pages/
│   │       ├── Login.js / Signup.js
│   │       ├── Dashboard.js
│   │       ├── Projects.js
│   │       ├── ProjectDetail.js
│   │       └── Tasks.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml
```

## 🔧 Local Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (optional)

### Option A — Docker Compose (recommended)
```bash
git clone <your-repo>
cd taskmanager
docker-compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

### Option B — Manual
```bash
# Backend
cd backend
cp .env.example .env    # Edit JWT_SECRET
npm install
npm run dev             # Starts on :5000

# Frontend (new terminal)
cd frontend
npm install
npm start               # Starts on :3000
```

## 🌐 Deploy to Railway

### Step 1 — Push to GitHub
```bash
git init && git add . && git commit -m "Initial commit"
gh repo create taskflow --public --push
```

### Step 2 — Deploy Backend
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo → choose the `backend/` directory
3. Set environment variables:
   - `JWT_SECRET` → any long random string
   - `PORT` → `5000`
   - `NODE_ENV` → `production`
   - `DB_PATH` → `/data/taskmanager.db`
4. Add a **Volume** mounted at `/data` for persistent SQLite storage
5. Copy the generated backend URL (e.g. `https://taskflow-backend.up.railway.app`)

### Step 3 — Deploy Frontend
1. New Service → same repo → choose `frontend/` directory
2. Set build variable:
   - `REACT_APP_API_URL` → `https://your-backend.up.railway.app/api`
3. Railway auto-detects Dockerfile and deploys

### Step 4 — Done! 🎉
Your app is live. Share the frontend Railway URL.

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List my projects |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Project details + members |
| PUT | /api/projects/:id | Update (admin) |
| DELETE | /api/projects/:id | Delete (owner) |
| POST | /api/projects/:id/members | Add member (admin) |
| PUT | /api/projects/:id/members/:uid/role | Change role (admin) |
| DELETE | /api/projects/:id/members/:uid | Remove member (admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects/:id/tasks | List tasks (filterable) |
| POST | /api/projects/:id/tasks | Create task |
| GET | /api/projects/:id/tasks/:tid | Task detail |
| PUT | /api/projects/:id/tasks/:tid | Update task |
| DELETE | /api/projects/:id/tasks/:tid | Delete task |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Stats + my tasks + recent |

## 🔐 Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| Create project | ✅ | ✅ |
| Invite members | ✅ | ❌ |
| Change member role | ✅ | ❌ |
| Remove member | ✅ | ❌ |
| Delete project | ✅ (owner) | ❌ |
| Create task | ✅ | ✅ |
| Edit any task | ✅ | Own/assigned only |
| Delete any task | ✅ | Own only |
