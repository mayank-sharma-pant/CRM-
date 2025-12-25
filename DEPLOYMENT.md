# Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- npm or yarn package manager

## Local Development Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb local_service_crm

# Or using psql
psql -U postgres
CREATE DATABASE local_service_crm;
\q
```

### 2. Backend Setup

```bash
cd backend
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL=postgresql://user:password@localhost:5432/local_service_crm
# JWT_SECRET=your-secret-key-here

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

Backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## Production Deployment

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

#### Backend Deployment

1. **Install Node.js and PostgreSQL on server**
2. **Clone repository**
3. **Set up environment variables**
4. **Run migrations**
5. **Use PM2 for process management:**

```bash
npm install -g pm2
cd backend
pm2 start server.js --name crm-backend
pm2 save
pm2 startup
```

6. **Set up Nginx reverse proxy:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Frontend Deployment

1. **Build the frontend:**

```bash
cd frontend
npm run build
```

2. **Serve with Nginx:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: local_service_crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: yourpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:yourpassword@postgres:5432/local_service_crm
      JWT_SECRET: your-secret-key
      PORT: 5000
    depends_on:
      - postgres
    ports:
      - "5000:5000"

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```

### Option 3: Platform-as-a-Service

#### Heroku

**Backend:**
```bash
cd backend
heroku create your-app-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set JWT_SECRET=your-secret-key
git push heroku main
```

**Frontend:**
```bash
cd frontend
heroku create your-app-frontend
# Add buildpack: heroku/nodejs
git push heroku main
```

#### Railway / Render

Similar process - connect GitHub repo and configure environment variables.

## Environment Variables

### Backend (.env)

```
PORT=5000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
DATABASE_URL=postgresql://user:password@host:5432/local_service_crm
```

### Frontend

No environment variables needed for basic setup. API URL is configured in `vite.config.js`.

## Security Checklist

- [ ] Change JWT_SECRET to a strong random string
- [ ] Use HTTPS in production
- [ ] Set secure CORS origins
- [ ] Enable rate limiting
- [ ] Use environment variables for all secrets
- [ ] Regular database backups
- [ ] Keep dependencies updated

## Monitoring

Consider adding:
- Error tracking (Sentry)
- Analytics (Google Analytics, Plausible)
- Uptime monitoring (UptimeRobot, Pingdom)
- Log aggregation (Logtail, Papertrail)

