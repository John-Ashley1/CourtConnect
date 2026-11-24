// Status values from the SRS / ERD. Stored UPPERCASE (like the backend's Role enum); shown in Title case.
// tone → badge colour class in components.css (b-ok, b-pend, b-bad, b-mute, b-info, b-org).

export const STATUS = {
  slot: {
    AVAILABLE: { label: 'Available', tone: 'ok' },
    PENDING: { label: 'Pending', tone: 'pend' },
    BOOKED: { label: 'Booked', tone: 'mute' },
    BLOCKED: { label: 'Blocked', tone: 'mute' },
  },
  booking: {
    PENDING: { label: 'Pending', tone: 'pend' },
    CONFIRMED: { label: 'Confirmed', tone: 'ok' },
    CANCELLED: { label: 'Cancelled', tone: 'bad' },
    EXPIRED: { label: 'Expired', tone: 'mute' },
  },
  payment: {
    PENDING: { label: 'Pending', tone: 'pend' },
    PAID: { label: 'Paid', tone: 'ok' },
    FAILED: { label: 'Failed', tone: 'bad' },
  },
  join: {
    PENDING: { label: 'Pending', tone: 'pend' },
    APPROVED: { label: 'Approved', tone: 'ok' },
    DECLINED: { label: 'Declined', tone: 'bad' },
  },
  game: {
    OPEN: { label: 'Open', tone: 'ok' },
    FULL: { label: 'Full', tone: 'org' },
    CLOSED: { label: 'Closed', tone: 'mute' },
  },
  user: {
    ACTIVE: { label: 'Active', tone: 'ok' },
    DEACTIVATED: { label: 'Deactivated', tone: 'mute' },
  },
  notification: {
    BOOKING: { label: 'Booking', tone: 'ok' },
    GAME: { label: 'Game', tone: 'info' },
    REMINDER: { label: 'Reminder', tone: 'org' },
    PAYMENT: { label: 'Payment', tone: 'pend' },
    CANCELLED: { label: 'Cancelled', tone: 'bad' },
    CHANGE: { label: 'Schedule change', tone: 'mute' },
  },
}

export const SPORTS = ['Basketball', 'Badminton', 'Volleyball', 'Pickleball', 'Tennis']

export const ROLE_LABELS = {
  PLAYER: 'Player',
  FACILITY_ADMIN: 'Facility Administrator',
  SYSTEM_ADMIN: 'System Administrator',
}

/** Minutes a player has to pay before a Pending booking's slot is released. */
export const PAYMENT_HOLD_MINUTES = 15
