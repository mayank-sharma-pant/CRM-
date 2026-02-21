# Local Service CRM Platform

A simple, fast, and affordable CRM platform designed for local service businesses, small agencies, freelancers, clinics, and field service providers.

## 🚀 Features

- **Authentication**: Email + password login with JWT
- **Leads Management**: Track leads with status, source, and service type
- **Follow-ups**: Set reminders and track follow-up status
- **Notes**: Internal notes per lead with timestamps
- **Reminders Dashboard**: View today's and overdue follow-ups
- **Basic Reports**: Conversion rates, lead statistics, and charts

## 🏗️ Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT Authentication
- bcrypt

## 📁 Project Structure

```
App/
├── backend/          # Express.js API server
├── frontend/         # React application
├── database/         # Database schema and migrations
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Database Setup

The app uses **Alembic** for migrations (schema is defined in `backend/app/models/`). Do **not** run `database/schema.sql`—it is legacy and does not match the app.

1. **Create the database** (PostgreSQL only; skip if using SQLite):
   ```bash
   createdb local_service_crm
   ```

2. **Configure and run migrations**:
   ```bash
   cd backend
   cp .env.example .env
   # Set DATABASE_URL in .env (e.g. postgresql://user:pass@localhost:5432/local_service_crm
   # or sqlite:///./crm.db for SQLite)
   pip install -r requirements.txt
   alembic upgrade head
   ```

3. **Start the backend** (same `DATABASE_URL` from .env is used):
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

See `database/README.md` for more detail.

## 📝 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/local_service_crm
```

## 🔐 API Endpoints

See `backend/README.md` for complete API documentation.

## 📄 License

MIT

