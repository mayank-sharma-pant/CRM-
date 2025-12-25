# Architecture Overview

## System Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)   │
└──────┬──────┘
       │
       │ HTTP/HTTPS
       │
┌──────▼─────────────────────────────────┐
│         Frontend (React)                │
│  - React 18 + Vite                     │
│  - Tailwind CSS                        │
│  - React Router                        │
│  - Axios for API calls                 │
└──────┬─────────────────────────────────┘
       │
       │ REST API
       │
┌──────▼─────────────────────────────────┐
│      Backend (Express.js)              │
│  - Express.js                          │
│  - JWT Authentication                  │
│  - RESTful API                         │
│  - Input Validation                    │
└──────┬─────────────────────────────────┘
       │
       │ SQL Queries
       │
┌──────▼─────────────────────────────────┐
│      Database (PostgreSQL)             │
│  - Users                               │
│  - Businesses                          │
│  - Leads                               │
│  - Follow-ups                          │
│  - Notes                               │
└────────────────────────────────────────┘
```

## Database Schema

### Entity Relationship Diagram

```
User (1) ──── (1) Business
                │
                │ (1-to-many)
                │
                ▼
              Lead
                │
                ├─── (1-to-many) ──── Notes
                │
                └─── (1-to-many) ──── FollowUps
```

### Tables

1. **users** - User accounts
   - id (UUID, PK)
   - email (unique)
   - password_hash
   - full_name
   - created_at, updated_at

2. **businesses** - Business information (1-to-1 with users)
   - id (UUID, PK)
   - user_id (FK to users)
   - name
   - phone, address
   - created_at, updated_at

3. **leads** - Customer leads
   - id (UUID, PK)
   - business_id (FK to businesses)
   - name, email, phone
   - service_type, source
   - status (New, Contacted, Follow-up, Converted, Lost)
   - created_at, updated_at

4. **follow_ups** - Scheduled follow-ups
   - id (UUID, PK)
   - lead_id (FK to leads)
   - scheduled_date, scheduled_time
   - status (Pending, Completed, Missed)
   - notes
   - completed_at
   - created_at, updated_at

5. **notes** - Internal notes per lead
   - id (UUID, PK)
   - lead_id (FK to leads)
   - content
   - created_at, updated_at

## API Architecture

### Authentication Flow

1. User registers/logs in
2. Backend validates credentials
3. JWT token generated and returned
4. Frontend stores token in localStorage
5. Token sent in Authorization header for protected routes
6. Backend middleware validates token on each request

### Request Flow

```
Client Request
    ↓
Frontend Router (React Router)
    ↓
API Service (Axios)
    ↓
Backend Middleware (Auth, Validation)
    ↓
Route Handler
    ↓
Database Query (PostgreSQL)
    ↓
Response
```

## Security Considerations

1. **Authentication**: JWT tokens with expiration
2. **Password Security**: bcrypt hashing (10 rounds)
3. **Input Validation**: express-validator on all inputs
4. **SQL Injection**: Parameterized queries (pg library)
5. **CORS**: Configured for specific origins in production
6. **Environment Variables**: Secrets stored in .env

## Scalability Considerations

### Current Architecture (MVP)
- Single database instance
- Stateless API server
- Client-side routing

### Future Enhancements
- Database connection pooling (already using pg Pool)
- Redis for session management
- CDN for static assets
- Load balancing for multiple API instances
- Database read replicas
- Caching layer

## Extension Points

The architecture is designed to easily add:

1. **Multi-user teams**: Add team_id to businesses, implement role-based access
2. **Email/SMS notifications**: Add notification service, integrate with Twilio/SendGrid
3. **WhatsApp integration**: Add webhook endpoints, integrate with WhatsApp Business API
4. **Mobile app**: API is RESTful, can be consumed by mobile clients
5. **Payments**: Add subscription table, integrate Stripe/PayPal
6. **White-label**: Add branding settings to businesses table

## Technology Choices

### Frontend
- **React 18**: Modern, component-based UI
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client with interceptors

### Backend
- **Node.js + Express**: Fast, JavaScript ecosystem
- **PostgreSQL**: Relational database, ACID compliance
- **JWT**: Stateless authentication
- **bcryptjs**: Password hashing
- **express-validator**: Input validation

### Why These Choices?
- **Simplicity**: Easy to understand and maintain
- **Performance**: Fast development and runtime
- **Ecosystem**: Large package ecosystem
- **Scalability**: Can scale horizontally
- **Developer Experience**: Great tooling and documentation

