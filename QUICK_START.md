# Quick Start Guide

Get the Local Service CRM up and running in 5 minutes!

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))
- Git

## Step 1: Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Step 2: Database Setup

```bash
# Create database
createdb local_service_crm

# Or using psql
psql -U postgres -c "CREATE DATABASE local_service_crm;"
```

## Step 3: Configure Backend

```bash
cd backend

# Create .env file (copy from .env.example)
# On Windows:
copy .env.example .env

# On Mac/Linux:
cp .env.example .env
```

Edit `.env` file:
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-key-change-this
DATABASE_URL=postgresql://postgres:password@localhost:5432/local_service_crm
```

Replace `postgres` and `password` with your PostgreSQL credentials.

## Step 4: Run Database Migrations

```bash
cd backend
npm run migrate
```

This creates all necessary tables.

## Step 5: Start Backend

```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:5000`

## Step 6: Start Frontend

Open a new terminal:

```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:3000`

## Step 7: Create Your Account

1. Open `http://localhost:3000` in your browser
2. Click "Get Started" or go to `/signup`
3. Fill in the registration form
4. You'll be automatically logged in!

## Troubleshooting

### Database Connection Error

- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env` matches your PostgreSQL setup
- Ensure database exists: `psql -l | grep local_service_crm`

### Port Already in Use

- Backend: Change `PORT` in `.env`
- Frontend: Change port in `vite.config.js`

### Module Not Found

- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

## Next Steps

- Add your first lead
- Schedule a follow-up
- Explore the dashboard
- Check out the reports

## Need Help?

- Check `ARCHITECTURE.md` for system overview
- See `DEPLOYMENT.md` for production setup
- Review `backend/README.md` for API documentation

