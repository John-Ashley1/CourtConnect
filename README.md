# CourtConnect

A sports court time-slot booking and player-finder system built with React, Spring Boot, and Supabase (PostgreSQL).

This version includes the landing page, sign in, register, and a dashboard with Log out.

## Tech stack
- **Frontend:** React (Vite)
- **Backend:** Spring Boot 3.3, Spring Security, JWT
- **Database:** Supabase (PostgreSQL)

## Project structure
```
CourtConnect/
├── frontend/   React app
├── backend/    Spring Boot API
└── docs/       ERD.md
```

## Requirements
- Java 21 (JDK)
- Node.js 18 or newer
- A Supabase project

## 1. Set up the database
1. Open your Supabase project, go to **SQL Editor > New query**.
2. Paste the contents of `supabase/schema.sql` and click **Run**.
3. Click **Connect** and copy the **Session pooler** details (host, port, user).

## 2. Run the backend
In PowerShell, from the `backend` folder, set your Supabase details and start the server:

```powershell
$env:DB_URL='jdbc:postgresql://<pooler-host>:5432/postgres?sslmode=require'
$env:DB_USER='postgres.<project-ref>'
$env:DB_PASSWORD='<your-database-password>'
$env:JWT_SECRET='<a-long-random-secret-of-32-or-more-characters>'
.\mvnw.cmd spring-boot:run
```

The backend runs on http://localhost:8080.
Never commit your real password or JWT secret to GitHub.

## 3. Run the frontend
```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## API
- `POST /api/auth/register` with `{fullName, email, password}`. Creates a PLAYER and returns `{token, user}`.
- `POST /api/auth/login` with `{email, password}`. Returns `{token, user}`.
- `GET /api/auth/me`. Requires the header `Authorization: Bearer <token>`.

## Roles
PLAYER, FACILITY_ADMIN, SYSTEM_ADMIN. Self-registration creates players only. The first system administrator is created on backend startup when the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables are set (only if that email does not exist yet). Passwords are hashed with BCrypt.

## Database design
See `docs/ERD.md` for the entity relationship diagram and `supabase/schema.sql` for the tables.
