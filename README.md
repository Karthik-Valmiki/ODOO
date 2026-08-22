# WorkDesk — Human Resource Management System (HRMS)

**WorkDesk** is a full-stack, enterprise-grade Human Resource Management System designed to handle core HR operations cleanly and efficiently.

## ⚡ Quick Start with Docker (Recommended)

Run the entire stack and automatically open all links in your browser with one command:

```powershell
.\start.ps1
```

> **That's it.** The script builds the images, starts all 4 containers, waits for them to be healthy, prints the links, and opens them in your browser automatically.

### 🔗 Application Links

Once running, the services are available at:

* 🌐 **Frontend Web App:** [http://localhost](http://localhost)
* 📑 **API Documentation (Swagger UI):** [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
* 🗄️ **Database Admin (pgAdmin):** [http://localhost:5050](http://localhost:5050)
  * **Email:** `admin@workdesk.dev`
  * **Password:** `admin123`

---

## 🛠️ Local Development Setup

If you prefer running backend and frontend services separately without Docker:

### 1. Database (PostgreSQL)
```bash
docker-compose up -d db pgadmin
```
*(Runs Postgres on port `5433` and pgAdmin on port `5050`)*

### 2. Backend (Django Ninja REST API)
```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies & run migrations
pip install -r requirements.txt
python manage.py migrate

# Start backend server
python manage.py runserver 8000
```

### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*(Runs Vite frontend at [http://localhost:5173](http://localhost:5173))*

---

## 🏗️ Architecture & Features

### Tech Stack
- **Backend:** Python 3.11, Django 5.x, Django Ninja (Pydantic schemas)
- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons
- **Auth:** Stateless JWT (Bearer Access Tokens + Refresh Tokens) with RBAC
- **Database:** PostgreSQL 16

### Key Endpoints & Functionality
- `POST /api/auth/login` / `POST /api/auth/signup` — Authentication & onboarding
- `POST /api/employees` — Admin employee provisioning with auto-generated ID (`WD...`)
- `POST /api/attendance/punch-in` & `punch-out` — Real-time attendance logging
- `GET /api/payroll/payslip` — Automated statutory salary slip calculations
- `GET /api/leaves/balance` — Real-time paid/sick leave quota tracking
