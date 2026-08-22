# Dayflow — Human Resource Management System

> A full-stack HRMS built for the Odoo Hackathon.  
> Backend: Django + DRF | Database: PostgreSQL 16 (Docker) | Auth: JWT (simplejwt)

---

## Architecture

```
┌─────────────────────┐      localhost:8000
│  Django REST API    │  ←──────────────────  HTTP Clients / Frontend
│  (runs locally)     │
└────────┬────────────┘
         │ psycopg2 @ localhost:5433
         ▼
┌─────────────────────┐      localhost:5433 → container:5432
│  PostgreSQL 16      │  (Docker Container: dayflow_db)
│  (Docker)           │
└─────────────────────┘
         ↑
┌─────────────────────┐      localhost:5050
│  pgAdmin 4          │  (Docker Container: dayflow_pgadmin)
│  (Docker, Dev Only) │
└─────────────────────┘
```

The **backend and frontend run on your local machine**.  
Only the **database and pgAdmin run in Docker** — keeping your system clean.

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Docker Desktop | Latest | `docker --version` |
| Python | 3.11+ | `python --version` |
| pip | Latest | `pip --version` |

---

## Setup (First Time)

### 1. Clone the repo
```bash
git clone https://github.com/your-org/dayflow.git
cd dayflow
```

### 2. Create your `.env` file
```bash
cp .env.example .env
```

Then open `.env` and fill in:

```env
DB_PASSWORD=choose_a_strong_password
SECRET_KEY=<generate below>
```

**Generate your Django SECRET_KEY:**
```bash
# Option 1: openssl (recommended)
openssl rand -hex 32

# Option 2: Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 3. Start the Database Container
```bash
docker-compose up -d db
```

Wait ~5 seconds, then verify it's healthy:
```bash
docker ps
# dayflow_db should show "healthy"
```

The schema is **automatically applied** from `db/init.sql` on first start.

### 4. Verify the schema loaded
```bash
docker exec dayflow_db psql -U dayflow_user -d dayflow_db -c "\dt"
```

Expected output — 8 tables:
```
              List of relations
 Schema |        Name         | Type  |    Owner
--------+---------------------+-------+--------------
 public | attendance          | table | dayflow_user
 public | companies           | table | dayflow_user
 public | employee_profiles   | table | dayflow_user
 public | join_year_serials   | table | dayflow_user
 public | leave_requests      | table | dayflow_user
 public | salary_components   | table | dayflow_user
 public | salary_structures   | table | dayflow_user
 public | users               | table | dayflow_user
```

### 5. Setup Django backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

---

## Docker Commands Reference

```bash
# Start DB only (recommended — backend runs locally)
docker-compose up -d db

# Start DB + pgAdmin (visual DB browser)
docker-compose up -d db pgadmin

# Stop all containers
docker-compose down

# Stop and DELETE all data (⚠️ irreversible)
docker-compose down -v

# View DB logs
docker logs dayflow_db -f

# Open psql shell inside container
docker exec -it dayflow_db psql -U dayflow_user -d dayflow_db

# Re-apply schema (if you change init.sql — requires volume wipe first)
docker-compose down -v && docker-compose up -d db
```

---

## pgAdmin (Visual DB Manager)

1. Run: `docker-compose up -d pgadmin`
2. Open: http://localhost:5050
3. Login: `admin@dayflow.dev` / `admin123`
4. The **"Dayflow DB"** server is pre-configured — no manual setup needed

---

## Port Reference

| Service | Host Port | Container Port | URL |
|---|---|---|---|
| PostgreSQL | **5433** | 5432 | `localhost:5433` |
| pgAdmin | **5050** | 80 | http://localhost:5050 |
| Django API | **8000** | — | http://localhost:8000 |
| Django API docs | **8000** | — | http://localhost:8000/api/schema/swagger/ |

> **Why 5433?** Avoids conflict with any local PostgreSQL you might have running on 5432.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DB_USER` | ✅ | PostgreSQL username |
| `DB_PASSWORD` | ✅ | PostgreSQL password |
| `DB_NAME` | ✅ | Database name |
| `DB_HOST` | ✅ | `localhost` (local dev) or `db` (when API is also in Docker) |
| `DB_PORT` | ✅ | `5433` |
| `DATABASE_URL` | ✅ | Full connection string for dj-database-url |
| `SECRET_KEY` | ✅ | Django secret key — generate with `openssl rand -hex 32` |
| `DEBUG` | ✅ | `True` for dev, `False` for production |

---

## Database Schema

| Table | Description |
|---|---|
| `companies` | Company created by Admin on signup |
| `users` | Auth identity: login_id, email, role, password hash |
| `join_year_serials` | Serial counter for auto login_id generation |
| `employee_profiles` | All profile data: Resume, Private Info, Job Info, Bank Details |
| `salary_structures` | Base wage, work schedule, PF rates per employee |
| `salary_components` | 6 salary components with percentage-based auto-calculation |
| `attendance` | Daily check-in/out records with work_hours and extra_hours |
| `leave_requests` | Leave applications with approval workflow |

---

## User Roles

| Role | Can Do |
|---|---|
| `ADMIN` | Create employees, approve leaves, view all data, manage salary |
| `EMPLOYEE` | View own profile, check-in/out, apply for leave, view own salary |

> Employees **cannot self-register**. Admin creates all employee accounts.  
> System auto-generates login_id and a temporary password.  
> Employee is **forced to change password** on first login.

---

## Security Notes for Contributors

- **Never commit `.env`** — it's gitignored
- Generate your own `SECRET_KEY` — the one in `.env.example` is a placeholder
- `force_password_change = True` for all system-created accounts
- JWT tokens expire in 60 minutes (configurable)
- All passwords hashed with bcrypt

---

## Project Structure
```
dayflow/
├── docker-compose.yml        # DB + pgAdmin containers
├── .env.example              # Copy to .env and fill in
├── .gitignore
├── db/
│   ├── init.sql              # Full schema (auto-runs on container start)
│   └── pgadmin_servers.json  # pgAdmin auto-connect config
├── backend/                  # Django project (to be created)
│   ├── manage.py
│   ├── requirements.txt
│   └── ...
└── README.md
```
