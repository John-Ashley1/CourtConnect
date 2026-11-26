# CourtConnect

A sports court time-slot booking and player-finder system built with React, Spring Boot, and Supabase (PostgreSQL).

This version includes sign in and registration, profiles and password management, facility and court management, time slots, court booking with double-booking protection, cancellations and booking records, with optional PayMongo test payments.

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
2. Tables are created automatically when the backend starts. To create them by hand instead, run `docs/sql/increment-2.sql` and `docs/sql/increment-3.sql` in the SQL editor.
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

Optional settings (Increment 3):

| Variable | What it does |
| --- | --- |
| `PAYMONGO_SECRET_KEY` | PayMongo **test** secret key (`sk_test_…`) from dashboard.paymongo.com → Developers. Without it, bookings work but can't be paid, so they stay Pending and expire. |
| `PAYMONGO_WEBHOOK_SECRET` | Only when deployed: secret of a PayMongo webhook for `checkout_session.payment.paid` pointing to `<backend>/api/payments/webhook`. Locally, payments are confirmed when the player returns from PayMongo. |
| `APP_TIMEZONE` | Time zone of slot dates and times (default `Asia/Manila`). |

PayMongo test payments: pick GCash, Maya or GrabPay, then choose **Authorize Test Payment** on PayMongo's test page, or use the test card `4343 4343 4343 4345` with any future expiry date and any CVC.

## Tests
```powershell
cd backend
.\mvnw.cmd test
```
The tests use an in-memory H2 database, never Supabase. They cover the whole booking flow, double booking, expiry, cancellation, blocking, hours changes, roles and PayMongo webhook confirmation.

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
- Profile (Increment 2): `GET/PUT /api/users/me`, `POST /api/users/me/password`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.

Increment 3 (JSON uses snake_case; dates `YYYY-MM-DD`, times `HH:mm:ss`):

| Who | Endpoint | Purpose |
| --- | --- | --- |
| Facility admin | `GET /api/facilities/mine`, `POST /api/facilities`, `PUT /api/facilities/{id}` | Register and edit facilities; the address is geocoded (FR-007, FR-010) |
| Facility admin | `GET /api/courts/mine`, `POST /api/facilities/{id}/courts`, `PUT /api/courts/{id}`, `DELETE /api/courts/{id}` | Add, edit and remove courts (FR-008, FR-009) |
| Facility admin | `PUT /api/courts/{id}/hours` | Weekly hours, slot length and payment time limit; regenerates slots (FR-011, FR-013) |
| Facility admin | `GET /api/facilities/{id}/schedule?date=`, `POST /api/slots/{id}/block`, `POST /api/slots/{id}/unblock` | Schedule, block and unblock slots (FR-014, FR-020) |
| Facility admin | `GET /api/facility-bookings?q=&status=&facilityId=&period=`, `POST /api/facility-bookings/{id}/cancel` | Booking records and cancellation (FR-018, FR-059, FR-060) |
| Any signed-in user | `GET /api/courts?sport=&date=&maxKm=&sort=&lat=&lng=`, `GET /api/courts/{id}`, `GET /api/facilities/{id}/courts`, `GET /api/courts/{id}/slots?date=` | Find courts, court details and slot status (FR-012, FR-014) |
| Player | `POST /api/bookings` `{courtId, slotIds}` | Hold 1–4 consecutive slots as Pending, fee = rate × hours (FR-015 – FR-017, FR-021) |
| Player | `GET /api/bookings/mine`, `GET /api/bookings/{id}`, `POST /api/bookings/{id}/cancel` | Booking history and cancellation (FR-052 – FR-054) |
| Player | `POST /api/payments/checkout` `{bookingId, method}`, `POST /api/payments/{id}/verify` | PayMongo checkout and verification (FR-022 – FR-025, optional) |
| Any signed-in user | `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all` | In-app notifications about bookings |

Unpaid Pending bookings expire after the court's payment time limit and their slots become Available again (FR-019). A background job checks every 15 seconds, and every booking request checks first.

## Roles
PLAYER, FACILITY_ADMIN, SYSTEM_ADMIN. Self-registration creates players only. The first system administrator is created on backend startup when the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables are set (only if that email does not exist yet). Passwords are hashed with BCrypt.

## Database design
See `docs/ERD.md` for the entity relationship diagram and `docs/sql/` for the tables added in each increment.
