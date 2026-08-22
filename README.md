# Dayflow — Human Resource Management System (HRMS)

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![Django](https://img.shields.io/badge/Django-5.2-green.svg)
![Django Ninja](https://img.shields.io/badge/Django--Ninja-1.0+-orange.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)
![Status](https://img.shields.io/badge/Backend-Complete-brightgreen.svg)
![Frontend Status](https://img.shields.io/badge/Frontend-In--Progress-yellow.svg)

> **Note:** The backend API and database architecture are fully operational and documented. Frontend application integration is currently in active development.

---

## 🏗️ Architecture

```
┌─────────────────────────┐          http://localhost:8000
│  Frontend / API Client  │ ──────────────────────────────────────┐
└─────────────────────────┘                                       │
                                                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                      Django Backend (Ninja API)                   │
│  - Endpoint Routing & Pydantic Validation (/api/...)              │
│  - JWT Bearer Authentication & RBAC Middleware                    │
│  - Business Logic (Attendance, Leaves, Payroll Engine)           │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ PostgreSQL (port 5433)
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16 (Docker)                       │
│  - Tables: users, profiles, attendance, leave_requests            │
└───────────────────────────────────────────────────────────────────┘
```

The system uses a decoupled architecture where the backend runs as a high-performance RESTful API powered by **Django Ninja** and **Pydantic**. Database persistence runs in an isolated **PostgreSQL 16** Docker container.

---

## 🔐 JWT Authentication System

Dayflow implements stateless **JSON Web Token (JWT)** authentication with Role-Based Access Control (RBAC):

1. **Access Tokens:** Short-lived tokens containing `user_id` and `role` (`ADMIN` | `EMPLOYEE`). Must be passed in the HTTP request header:
   ```http
   Authorization: Bearer <access_token>
   ```
2. **Refresh Tokens:** Long-lived tokens used to issue fresh access tokens without requiring re-authentication via `/api/auth/refresh`.
3. **Role-Based Access Control (RBAC):**
   - `ADMIN`: Full access (create employees, approve/reject leaves, view company-wide analytics).
   - `EMPLOYEE`: Restricted access (view own profile/salary, clock-in/out attendance, apply for leaves).

---

## 🚀 Backend Quickstart Setup

### Prerequisites
- Python 3.11+
- Docker & Docker Desktop

### 1. Database Setup
Start the containerized PostgreSQL database:
```bash
docker-compose up -d db
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Settings
DB_NAME=dayflow_db
DB_USER=dayflow_user
DB_PASSWORD=dayflow_pass
DB_HOST=localhost
DB_PORT=5433

# Django Settings
SECRET_KEY=django-insecure-mv@#)dh93+*ovc_e987nc7g-i-x36acla--tdec$=si5vr*ul-
DEBUG=True
```

### 3. Backend Setup & Run
Navigate to the `backend/` directory, create a virtual environment, install dependencies, and start the server:

```bash
# Move to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies & run migrations
pip install -r requirements.txt
python manage.py migrate

# Start the development server
python manage.py runserver
```

---

## 📖 API Documentation & Testing

Once the backend server is running, interactive OpenAPI / Swagger documentation is available at:

👉 **`http://localhost:8000/api/docs`**

### Primary API Groups

| Endpoint Group | Base Path | Description |
|---|---|---|
| **Health** | `/api/db-check` | Database connectivity & status check |
| **Auth** | `/api/auth/*` | Admin signup, login (Email/Employee ID), refresh token |
| **Employees** | `/api/employees/*` | Profile details, company roster, employee creation (Admin) |
| **Attendance** | `/api/attendance/*` | Daily punch in/out, shift status, monthly summaries |
| **Leaves** | `/api/leaves/*` | Leave applications, leave balances, Admin approve/reject |
| **Company** | `/api/company/*` | Company-wide headcounts, attendance & leave metrics |

---

## 📂 Repository Structure

```text
.
├── backend/                  # Django project root
│   ├── core/                 # Models, Ninja API routes, schemas & auth
│   │   ├── api.py            # API Endpoints
│   │   ├── auth.py           # JWT generation & validation
│   │   ├── models.py         # Database ORM models
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   └── utils.py          # Helper functions (payroll, IDs)
│   ├── dayflow/              # Project settings & URL routing
│   └── manage.py
├── db/                       # PostgreSQL initialization scripts
│   └── init.sql
├── docker-compose.yml        # Docker service configuration for DB & pgAdmin
├── .gitignore                # Git exclusion rules
└── README.md
```
