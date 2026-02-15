# Hack For Hope — SOS Villages d'Enfants Tunisia

> **SupBots** | Hackathon *Hack For Hope 2026*

A full-stack child-protection signalement platform built for **SOS Villages d'Enfants Tunisia**. It enables field staff to report incidents, specialists to investigate and classify them through a structured workflow, and governance to oversee analytics and closures — all behind strict role-based access control.

---

## Project Structure

```
SOS_SupBots_HackForHope/
├── frontend/          # React 18 + Vite + Tailwind CSS 4
├── backend/           # Express 5 + MongoDB (Mongoose) + Socket.IO
│   ├── src/
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/     # Auth, RBAC, audit logging, uploads
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # REST endpoints
│   │   └── services/       # Socket.IO helpers
│   ├── seed.js             # Database seeder (villages + users + sample data)
│   └── addUser.js          # CLI tool to create users
└── README.md
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (Atlas or local) — connection string goes in `backend/.env`

### 1. Backend

```bash
cd backend
npm install
```

Create / update the `.env` file:

```env
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<your-secret>
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

Seed the database (first run only):

```bash
npm run seed
```

> This creates **4 villages** (Gammarth, Siliana, Mahres, Akouda), **4 user accounts**, and **5 sample signalements**.

Start the server:

```bash
npm run dev          # nodemon — auto-restarts on changes
# or
npm start            # production
```

Backend runs on **http://localhost:5000**.

**Add a new user (CLI):**

```bash
npm run adduser
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000** (Vite proxies `/api` requests to the backend).

---

## Features

| Area | Details |
|------|---------|
| **Authentication** | JWT-based login. No public registration — all accounts created by admins. |
| **4-Level RBAC** | **Level 1** (SOS Mothers, Educators) → **Level 2** (Psychologists, Social Workers) → **Level 3** (Village Directors, National Office) → **Level 4** (Super Admin) |
| **Signalement Management** | Create, assign, classify, close, and archive incident reports with multi-file uploads |
| **7-Stage Workflow** | Structured process for Level 2: Initial → DPE → Evaluation → Action Plan → Follow-up → Final Report → Closure |
| **AI-Assisted DPE** | Draft DPE reports generated via Ollama (local LLM) |
| **Real-Time Notifications** | Socket.IO events for new/updated signalements |
| **Analytics Dashboard** | Heatmaps, village ratings, and export for Level 3 governance |
| **Audit Logging** | Every significant action is recorded with user, timestamp, and details |
| **Village Scoping** | Users only access data from their assigned villages |
| **Sauvegarde (Emergency)** | One-click emergency flag for critical signalements |

---

## Tech Stack

### Frontend

- React 18 + React Router 6
- Vite 5
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Axios
- Lucide React (icons)

### Backend

- Express.js
- MongoDB + Mongoose 8
- JSON Web Tokens (jsonwebtoken)
- bcryptjs (password hashing)
- Multer (file uploads)
- Socket.IO (real-time events)
- Ollama SDK (AI-assisted DPE generation)
- Nodemon (dev)

---

## API Endpoints

### Auth

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/auth/login` | Login (returns JWT + user info) |

### Signalements

| Method | Route | Description | Role |
|--------|-------|-------------|------|
| `GET` | `/api/signalements` | List signalements (filtered by role & village) | Level 1+ |
| `POST` | `/api/signalements` | Create signalement (with file uploads) | Level 1+ |
| `GET` | `/api/signalements/my-deadlines` | Deadline tracking | Level 2+ |
| `GET` | `/api/signalements/:id` | Get single signalement | All |
| `GET` | `/api/signalements/:id/attachments/:filename` | Download attachment | All |
| `PUT` | `/api/signalements/:id` | Update signalement | Level 2 (assigned) |
| `PUT` | `/api/signalements/:id/assign` | Assign to Level 2 user | Level 2+ |
| `PUT` | `/api/signalements/:id/sauvegarder` | Emergency save | Level 2+ |
| `PUT` | `/api/signalements/:id/close` | Close signalement | Level 3+ |
| `PUT` | `/api/signalements/:id/archive` | Archive signalement | Level 3+ |
| `DELETE` | `/api/signalements/:id` | Delete signalement | Level 3+ |

### Workflows

| Method | Route | Description | Role |
|--------|-------|-------------|------|
| `GET` | `/api/workflows/my-workflows` | Get assigned workflows | Level 2+ |
| `GET` | `/api/workflows/:signalementId` | Get workflow for a signalement | Level 2+ |
| `POST` | `/api/workflows` | Create workflow | Level 2+ |
| `PUT` | `/api/workflows/:workflowId/stage` | Advance workflow stage (with file upload) | Level 2 (assigned) |
| `PUT` | `/api/workflows/:workflowId/classify` | Classify signalement | Level 2+ |
| `PUT` | `/api/workflows/:workflowId/escalate` | Escalate to Level 3 | Level 2+ |
| `POST` | `/api/workflows/:workflowId/notes` | Add workflow notes | Level 2+ |
| `GET` | `/api/workflows/templates/:templateName` | Download report template | Level 2+ |

### DPE (AI-Assisted Reports)

| Method | Route | Description | Role |
|--------|-------|-------------|------|
| `POST` | `/api/dpe/:id/generate` | Generate DPE draft via AI | Level 2+ |
| `GET` | `/api/dpe/:id` | Get DPE draft | Level 2+ |
| `PUT` | `/api/dpe/:id` | Update DPE draft | Level 2+ |
| `POST` | `/api/dpe/:id/submit` | Submit final DPE | Level 2+ |

### Level 2 Dedicated Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/level2/signalements` | List signalements for treatment |
| `GET` | `/api/level2/signalements/:id` | Signalement details |
| `PATCH` | `/api/level2/signalements/:id/classification` | Classify |
| `PATCH` | `/api/level2/signalements/:id/workflow` | Update workflow step |
| `PUT` | `/api/level2/signalements/:id/reports/dpe` | Save DPE report |
| `POST` | `/api/level2/signalements/:id/escalate` | Escalate to Level 3 |
| `POST` | `/api/level2/signalements/:id/close` | Close / archive |
| `GET` | `/api/level2/notifications` | Get notifications |
| `PATCH` | `/api/level2/notifications/:id/read` | Mark notification read |

### Villages

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/villages` | List all villages |
| `GET` | `/api/villages/:id` | Village details |
| `GET` | `/api/villages/:id/statistics` | Village statistics |

### Analytics (Level 3+)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/analytics` | Dashboard analytics |
| `GET` | `/api/analytics/heatmap` | Heatmap data |
| `GET` | `/api/analytics/village-ratings` | Village performance ratings |
| `GET` | `/api/analytics/export` | Export data (CSV/blob) |

---

## Database Models

| Model | Key Fields |
|-------|------------|
| **User** | name, email, password (hashed), role (`LEVEL1`–`LEVEL4`), roleDetails, village, accessibleVillages |
| **Village** | name, location, region, programs, coordinates, director, totalSignalements |
| **Signalement** | title, description, village, program, incidentType, urgencyLevel, status, isAnonymous, childName, abuserName, attachments, assignedTo, classification, aiSuspicionScore |
| **Workflow** | signalement, assignedTo, currentStage, stages[], status, classification |
| **AuditLog** | user, action, resourceType, resourceId, details, timestamp |
| **Notification** | user, type, message, read, relatedSignalement |

---

## Test Accounts

After running `npm run seed`:

| Role | Email | Password | Details |
|------|-------|----------|---------|
| **Level 3** — National Office | `admin@sos.tn` | `admin123` | Access to all villages |
| **Level 2** — Psychologist | `psy@sos.tn` | `psy123` | Village: Gammarth |
| **Level 1** — SOS Mother | `fatma@sos.tn` | `fatma123` | Village: Gammarth · 8 children |
| **Level 1** — Educator | `ahmed@sos.tn` | `ahmed123` | Village: Siliana · 6 children |

---

## Security Notes

- All API routes (except `/api/auth/login`) require a valid JWT
- **No public registration** — accounts are created only via `npm run seed` or `npm run adduser`
- Passwords are hashed with bcrypt before storage
- Village-scoped access prevents cross-village data leaks
- Audit logs track every significant operation
- Anonymous signalements mask sensitive fields (child/abuser names)
- Update `JWT_SECRET` and `MONGODB_URI` before any production deployment

---

## Team

**SupBots** — Hack For Hope 2026
