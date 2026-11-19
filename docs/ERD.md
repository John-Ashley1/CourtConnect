# CourtConnect ERD

Paste the code below into https://mermaid.live to view or export it as PNG/SVG.
`APP_USER` (table `app_user`) is already implemented in the backend. The other tables are added as each feature is built.

```mermaid
erDiagram
    APP_USER ||--o{ FACILITY : "administers"
    APP_USER ||--o{ BOOKING : "makes"
    APP_USER ||--o{ OPEN_GAME : "creates"
    APP_USER ||--o{ JOIN_REQUEST : "submits"
    APP_USER ||--o{ NOTIFICATION : "receives"
    FACILITY ||--o{ COURT : "contains"
    COURT ||--o{ TIME_SLOT : "generates"
    TIME_SLOT ||--o{ BOOKING : "reserved by"
    BOOKING ||--o| PAYMENT : "paid through"
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
        string address
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
        time open_time
        time close_time
        int slot_minutes
        string photo_url
    }

    TIME_SLOT {
        bigint slot_id PK
        bigint court_id FK
        date slot_date
        time start_time
        time end_time
        string status "Available, Pending, Booked, Blocked"
    }

    BOOKING {
        bigint booking_id PK
        bigint player_id FK
        bigint slot_id FK
        string status
        decimal total_fee
        string qr_code
        datetime payment_deadline
        datetime created_at
    }

    PAYMENT {
        bigint payment_id PK
        bigint booking_id FK
        string paymongo_reference
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
    }
```
