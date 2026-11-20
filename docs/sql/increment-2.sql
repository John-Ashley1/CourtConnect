-- CourtConnect · Increment 2 (User Profile and Password Management) · schema changes
-- The backend applies these automatically on startup (spring.jpa.hibernate.ddl-auto=update).
-- This file documents them; it is safe to run by hand in the Supabase SQL editor (idempotent).

-- Step (a) · Profile (FR-005)
alter table app_user add column if not exists phone_no varchar(20);              -- optional PH mobile, 09XXXXXXXXX
alter table app_user add column if not exists token_version integer not null default 0;
-- token_version is copied into every JWT ("ver" claim). Raising it (password change / reset)
-- makes every previously issued token invalid → the user is signed out everywhere.
