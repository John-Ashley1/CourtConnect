# CourtConnect (React + Spring Boot + MySQL)

Implements the screens in the design: landing page, sign in, register, and a dashboard with Log out.

## Run
1. **MySQL:** start MySQL (the `courtconnect` database is created automatically).
2. **Backend** (Java 17 and Maven):
   `cd backend` then `mvn spring-boot:run`. Optional environment variables: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.
   It runs on http://localhost:8080.
3. **Frontend** (Node 18+):
   `cd frontend`, `npm install`, `npm run dev`, then open http://localhost:5173.

## API
- `POST /api/auth/register` with `{fullName, email, password}`. Creates a PLAYER and returns `{token, user}`.
- `POST /api/auth/login` with `{email, password}`. Returns `{token, user}`.
- `GET /api/auth/me`. Requires `Authorization: Bearer <token>`.

Roles: PLAYER, FACILITY_ADMIN, SYSTEM_ADMIN. Passwords are BCrypt-hashed. The database design is in `docs/ERD.md`.
