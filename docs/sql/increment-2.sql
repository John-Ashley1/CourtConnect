-- CourtConnect · Increment 2 (User Profile and Password Management) · schema changes
-- The backend applies these automatically on startup (spring.jpa.hibernate.ddl-auto=update).
-- This file documents them; it is safe to run by hand in the Supabase SQL editor (idempotent).

-- Step (a) · Profile (FR-005)
alter table app_user add column if not exists phone_no varchar(20);              -- optional PH mobile, 09XXXXXXXXX
alter table app_user add column if not exists token_version integer not null default 0;
-- token_version is copied into every JWT ("ver" claim). Raising it (password change / reset)
-- makes every previously issued token invalid → the user is signed out everywhere.

-- Step (b) · Change password: no schema change (uses password_hash + token_version).

-- Step (c) · Forgot / reset password
create table if not exists password_reset_token (
  id          bigserial primary key,
  user_id     bigint not null references app_user(id) on delete cascade,
  token_hash  varchar(64) not null unique,   -- SHA-256 of the link's token; the token itself is never stored
  expires_at  timestamptz not null,          -- 30 minutes after creation
  used_at     timestamptz,                   -- set when used, or when a newer link replaces it
  created_at  timestamptz not null default now()
);
create index if not exists idx_password_reset_token_user on password_reset_token(user_id);
