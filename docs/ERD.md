# CourtConnect ERD

Paste the code below into https://mermaid.live to view or export it as PNG/SVG.
Implemented so far: `app_user`, `password_reset_token` (Increment 2), and `facility`, `court`, `court_hours`, `time_slot`, `booking`, `payment`, `notification` (Increment 3, see `docs/sql/increment-3.sql`). `OPEN_GAME` and `JOIN_REQUEST` come with Find Players.

```mermaid
erDiagram
    APP_USER ||--o{ FACILITY : "administers"
    APP_USER ||--o{ BOOKING : "makes"
    APP_USER ||--o{ OPEN_GAME : "creates"
    APP_USER ||--o{ JOIN_REQUEST : "submits"
    APP_USER ||--o{ NOTIFICATION : "receives"
    FACILITY ||--o{ COURT : "contains"
    COURT ||--o{ COURT_HOURS : "open on"
    COURT ||--o{ TIME_SLOT : "generates"
    COURT ||--o{ BOOKING : "booked as"
    BOOKING |o--o{ TIME_SLOT : "holds"
    BOOKING ||--o{ PAYMENT : "paid through"
    OPEN_GAME ||--o{ JOIN_REQUEST : "receives"

    APP_USER {
        bigint user_id PK
        string full_name
        string email
        string password_hash "one-way hash"
        string role "Player, Facility Administrator, System Administrator"
        string fcm_token
    }

    FACILITY {
        bigint facility_id PK
        bigint admin_id FK
        string name
        string phone
        string address
        string city
        decimal latitude
        decimal longitude
    }

    COURT {
        bigint court_id PK
        bigint facility_id FK
        string court_name
        string sport_type
        boolean is_indoor
        decimal rental_rate
        int slot_minutes
        int payment_hold_minutes
        string photo_url
        boolean removed
    }

    COURT_HOURS {
        bigint id PK
        bigint court_id FK
        int day_of_week "0 = Sunday"
        boolean is_open
        time open_time
        time close_time
    }

    TIME_SLOT {
        bigint slot_id PK
        bigint court_id FK
        date slot_date
        time start_time
        time end_time
        string status "Available, Pending, Booked, Blocked"
        string block_reason
        bigint booking_id FK "booking holding the slot"
    }

    BOOKING {
        bigint booking_id PK
        bigint player_id FK
        bigint court_id FK
        date slot_date
        time start_time
        time end_time
        decimal hours
        string status "Pending, Confirmed, Cancelled, Expired"
        decimal total_fee
        string qr_code "booking reference"
        datetime payment_deadline
        datetime created_at
        datetime cancelled_at
        string cancelled_by
    }

    PAYMENT {
        bigint payment_id PK
        bigint booking_id FK
        string paymongo_reference
        string paymongo_payment_id
        string method
        decimal amount
        string status
        datetime paid_at
    }

    OPEN_GAME {
        bigint game_id PK
        bigint creator_id FK
        string sport_type
        datetime game_schedule
        string location
        int max_players
        string status
    }

    JOIN_REQUEST {
        bigint request_id PK
        bigint game_id FK
        bigint player_id FK
        string status
    }

    NOTIFICATION {
        bigint notification_id PK
        bigint user_id FK
        string type
        string message
        datetime sent_at
        datetime read_at
    }
```
