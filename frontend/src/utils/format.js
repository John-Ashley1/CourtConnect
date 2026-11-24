// Display helpers. Data stays in ERD formats: dates 'YYYY-MM-DD', times 'HH:mm:ss', datetimes ISO 8601.

const LOCALE = 'en-PH'

export const peso = (n) =>
  '₱' + Number(n || 0).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 'YYYY-MM-DD' for a Date in local time. */
export function isoDate(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Date for 'YYYY-MM-DD' (local midnight, not UTC). */
export function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s, n) {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** 'Sat, Nov 21' */
export const fmtDate = (s) =>
  parseDate(s).toLocaleDateString(LOCALE, { weekday: 'short', month: 'short', day: 'numeric' })

/** 'Saturday, November 21, 2026' */
export const fmtDateLong = (s) =>
  parseDate(s).toLocaleDateString(LOCALE, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

/** '18:00:00' → '6:00 PM' */
export function fmtTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const x = h % 12 === 0 ? 12 : h % 12
  return `${x}:${String(m).padStart(2, '0')} ${ap}`
}

/** '6:00–7:00 PM' (drops the first AM/PM when both match) */
export function fmtTimeRange(start, end) {
  const a = fmtTime(start), b = fmtTime(end)
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`
}

/** 'Sat, Nov 21 · 6:00–7:00 PM' */
export const fmtSlot = (date, start, end) => `${fmtDate(date)} · ${fmtTimeRange(start, end)}`

/** ISO datetime → 'Nov 21, 2026, 6:00 PM' */
export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

/** ISO datetime → '5 minutes ago', 'Yesterday', 'Nov 9' */
export function timeAgo(iso, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(iso).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })
}

/** Minutes between two 'HH:mm:ss' times. */
export function minutesBetween(start, end) {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  return toMin(end) - toMin(start)
}

const hms = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`

/** OPEN_GAME schedule → 'Sat, Nov 21 · 4:00–6:00 PM' */
export function fmtGameWhen(isoStart, durationMinutes) {
  const s = new Date(isoStart)
  const e = new Date(s.getTime() + durationMinutes * 60000)
  return fmtSlot(isoDate(s), hms(s), hms(e))
}

/** Booking view → 'Sat, Nov 21 · 6:00–7:00 PM' (covers multi-hour bookings) */
export const fmtBookingWhen = (b) => fmtSlot(b.slot.slot_date, b.slot.start_time, b.end_time ?? b.slot.end_time)

/** '[Street], Mabolo, Cebu City' → 'Mabolo, Cebu City' */
export const areaOf = (address = '') => address.split(', ').slice(1).join(', ') || address

/** 125 → '2:05' (mm:ss), for countdowns. */
export function fmtCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
