# Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Auth

#### POST `/auth/register`
Register a new user and business.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "businessName": "My Business",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

#### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe"
  }
}
```

#### GET `/auth/me`
Get current user information.

---

### Leads

#### GET `/leads`
Get all leads for the authenticated user's business.

**Query Parameters:**
- `status` (optional): Filter by status (New, Contacted, Follow-up, Converted, Lost)
- `search` (optional): Search by name, email, or phone

#### GET `/leads/:id`
Get a single lead by ID.

#### POST `/leads`
Create a new lead.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "serviceType": "Plumbing",
  "source": "Website",
  "status": "New"
}
```

#### PUT `/leads/:id`
Update a lead.

#### DELETE `/leads/:id`
Delete a lead.

---

### Follow-ups

#### GET `/follow-ups`
Get all follow-ups.

**Query Parameters:**
- `date` (optional): Filter by scheduled date (YYYY-MM-DD)
- `status` (optional): Filter by status (Pending, Completed, Missed)

#### GET `/follow-ups/today`
Get today's pending follow-ups.

#### GET `/follow-ups/overdue`
Get overdue pending follow-ups.

#### POST `/follow-ups`
Create a new follow-up.

**Request Body:**
```json
{
  "leadId": "uuid",
  "scheduledDate": "2024-01-15",
  "scheduledTime": "14:30",
  "notes": "Call about pricing",
  "status": "Pending"
}
```

#### PUT `/follow-ups/:id`
Update a follow-up.

#### DELETE `/follow-ups/:id`
Delete a follow-up.

---

### Notes

#### GET `/notes/lead/:leadId`
Get all notes for a lead.

#### POST `/notes`
Create a new note.

**Request Body:**
```json
{
  "leadId": "uuid",
  "content": "Customer interested in premium package"
}
```

#### PUT `/notes/:id`
Update a note.

#### DELETE `/notes/:id`
Delete a note.

---

### Reports

#### GET `/reports/dashboard`
Get dashboard statistics.

**Response:**
```json
{
  "totalLeads": 100,
  "convertedLeads": 25,
  "lostLeads": 10,
  "conversionRate": 25.0,
  "recentLeads": 15,
  "leadsByStatus": [...],
  "leadsBySource": [...]
}
```

#### GET `/reports/overview`
Get weekly/monthly overview.

**Query Parameters:**
- `period` (optional): "week" or "month" (default: "month")

---

### Settings

#### GET `/settings/business`
Get business settings.

#### PUT `/settings/business`
Update business settings.

#### GET `/settings/profile`
Get user profile.

#### PUT `/settings/profile`
Update user profile.

#### PUT `/settings/password`
Change password.

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

