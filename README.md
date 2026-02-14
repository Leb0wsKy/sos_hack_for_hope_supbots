# Hack For Hope - MERN Stack Project

A minimal MERN stack application for the Hack For Hope hackathon.

## Project Structure

```
SOS_SupBots_HackForHope/
├── frontend/          # React + Vite frontend
└── backend/           # Express + MongoDB backend
```

## Quick Start

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Update `.env` file with your MongoDB connection string

4. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Features

- **Authentication**: JWT-based auth with role-based access control
- **User Roles**: Level 1, Level 2, and Level 3 access
- **Signalement Management**: CRUD operations for reports
- **Analytics**: Dashboard for Level 3 users

## Tech Stack

### Frontend
- React 18
- Vite
- React Router
- Axios

### Backend
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt for password hashing

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Signalement
- `GET /api/signalement` - Get all signalements
- `POST /api/signalement` - Create new signalement
- `PUT /api/signalement/:id` - Update signalement (Level 2+)
- `DELETE /api/signalement/:id` - Delete signalement (Level 3)

### Analytics
- `GET /api/analytics` - Get analytics (Level 3 only)

## Database Models

### User
- name, email, password, role (1, 2, or 3)

### Signalement
- title, description, location, status, createdBy

## Notes

- Make sure MongoDB is running before starting the backend
- Update the JWT_SECRET in `.env` for production
- All API routes (except auth) require authentication
