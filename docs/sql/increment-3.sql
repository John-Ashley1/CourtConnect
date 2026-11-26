-- CourtConnect · Increment 3 (Core Booking Features) · schema changes
-- The backend creates these automatically on startup (spring.jpa.hibernate.ddl-auto=update).
-- This file documents them; it is safe to run by hand in the Supabase SQL editor (idempotent).

-- FR-007 / FR-010 · Facilities, with the map position found from the address
create table if not exists facility (
  id          bigserial primary key,
  admin_id    bigint not null references app_user(id),
  name        varchar(100) not null,
  phone       varchar(20)  not null,                 -- 09XXXXXXXXX or landline with area code
  address     varchar(255) not null,                 -- "street, city"
  city        varchar(100) not null,
  latitude    double precision not null,
  longitude   double precision not null,             -- lat/lng from Google geocoding; a facility is never saved without them
  created_at  timestamptz not null default now()
);
create index if not exists idx_facility_admin on facility(admin_id);
-- An earlier draft of this script had a "geocoded" column; it is no longer used.
alter table facility drop column if exists geocoded;

-- FR-008 / FR-009 / FR-011 · Courts; slot length and unpaid-hold time are per court
create table if not exists court (
  id                    bigserial primary key,
  facility_id           bigint not null references facility(id),
  court_name            varchar(60)  not null,
  sport_type            varchar(30)  not null,       -- Basketball, Badminton, Volleyball, Pickleball, Tennis
  is_indoor             boolean not null,
  rental_rate           numeric(10,2) not null,      -- pesos per hour
  slot_minutes          integer not null default 60, -- 30, 60, 90 or 120
  payment_hold_minutes  integer not null default 15, -- 5 to 60
  photo_url             varchar(500),
  removed               boolean not null default false, -- removed courts are hidden but kept for booking history
  created_at            timestamptz not null default now()
);

-- FR-011 · Weekly operating hours, one row per court per day (0 = Sunday … 6 = Saturday)
create table if not exists court_hours (
  id           bigserial primary key,
  court_id     bigint not null references court(id),
  day_of_week  integer not null,
  is_open      boolean not null,
  open_time    time not null,
  close_time   time not null,
  unique (court_id, day_of_week)
);

-- FR-015 / FR-021 / FR-052 · Bookings (date and times copied from the slots so history survives)
create table if not exists booking (
  id                bigserial primary key,
  player_id         bigint not null references app_user(id),
  court_id          bigint not null references court(id),
  status            varchar(12) not null,             -- PENDING, CONFIRMED, CANCELLED, EXPIRED
  qr_code           varchar(20) not null unique,      -- booking reference, e.g. CC-2611-7KQ4M2
  slot_date         date not null,
  start_time        time not null,
  end_time          time not null,
  hours             numeric(5,2) not null,
  total_fee         numeric(10,2) not null,           -- rental_rate × hours
  payment_deadline  timestamptz not null,             -- Pending bookings expire after this (FR-019)
  created_at        timestamptz not null default now(),
  cancelled_at      timestamptz,
  cancelled_by      varchar(20)                       -- PLAYER or FACILITY_ADMIN
);
create index if not exists idx_booking_player on booking(player_id);
create index if not exists idx_booking_court_date on booking(court_id, slot_date);
create index if not exists idx_booking_status_deadline on booking(status, payment_deadline);

-- FR-013 / FR-014 / FR-016 / FR-020 · Time slots. The unique key means a period can't exist twice;
-- booking_id is the booking currently holding the slot (cleared when the slot is released).
create table if not exists time_slot (
  id            bigserial primary key,
  court_id      bigint not null references court(id),
  slot_date     date not null,
  start_time    time not null,
  end_time      time not null,
  status        varchar(12) not null,                 -- AVAILABLE, PENDING, BOOKED, BLOCKED
  block_reason  varchar(40),                          -- Maintenance, Private event
  booking_id    bigint references booking(id),
  unique (court_id, slot_date, start_time)
);
create index if not exists idx_time_slot_court_date on time_slot(court_id, slot_date);
-- FR-016 in the database: Pending/Booked exactly when the slot points to a booking, so a slot can never be held twice.
do $$ begin
  alter table time_slot add constraint ck_time_slot_holder check ((status in ('PENDING','BOOKED')) = (booking_id is not null));
exception when duplicate_object then null; end $$;

-- FR-022 – FR-025 (optional this increment) · PayMongo payments; the newest row is the booking's payment
create table if not exists payment (
  id                   bigserial primary key,
  booking_id           bigint not null references booking(id),
  paymongo_reference   varchar(100) unique,           -- checkout session id (cs_…)
  paymongo_payment_id  varchar(100),                  -- payment id (pay_…) once paid
  method               varchar(30) not null,          -- GCash, Maya, Credit / debit card, GrabPay
  amount               numeric(10,2) not null,
  status               varchar(10) not null,          -- PENDING, PAID, FAILED
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists idx_payment_booking on payment(booking_id);

-- In-app notifications for booking changes (push delivery comes in a later increment)
create table if not exists notification (
  id        bigserial primary key,
  user_id   bigint not null references app_user(id),
  type      varchar(12) not null,                     -- BOOKING, CANCELLED, PAYMENT, …
  message   varchar(500) not null,
  sent_at   timestamptz not null default now(),
  read_at   timestamptz
);
create index if not exists idx_notification_user on notification(user_id, sent_at);
