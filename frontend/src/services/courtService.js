import { request, qs } from './client'

/** Where distances are measured from until the player shares their location (Cebu City). */
export const DEFAULT_ORIGIN = { latitude: 10.3157, longitude: 123.8854, label: 'Cebu City' }

// ---- Players ----

/**
 * Courts players can book, with facility, distance_km and open_slots for a date.
 * filters: { sport, date ('YYYY-MM-DD'), maxKm, sort: 'distance' | 'rate', origin: { latitude, longitude } }
 * GET /api/courts?sport=&date=&maxKm=&sort=&lat=&lng=
 */
export function searchCourts({ sport, date, maxKm, sort = 'distance', origin = DEFAULT_ORIGIN } = {}) {
  return request('/courts' + qs({ sport: sport === 'All' ? '' : sport, date, maxKm, sort, lat: origin.latitude, lng: origin.longitude }))
}

/** One court with its facility. GET /api/courts/{courtId} */
export const getCourt = (courtId) => request(`/courts/${courtId}`)

/** Courts of one facility. GET /api/facilities/{facilityId}/courts */
export const listCourtsByFacility = (facilityId) => request(`/facilities/${facilityId}/courts`)

// ---- Facility administrator ----

/** Courts at the signed-in admin's facilities, each with its facility. GET /api/courts/mine */
export const listMyCourts = () => request('/courts/mine')

/** data: { court_name, sport_type, is_indoor, rental_rate }. POST /api/facilities/{facilityId}/courts */
export const createCourt = (facilityId, data) => request(`/facilities/${facilityId}/courts`, { method: 'POST', body: data })

/** PUT /api/courts/{courtId} */
export const updateCourt = (courtId, data) => request(`/courts/${courtId}`, { method: 'PUT', body: data })

/** Refused while the court has upcoming bookings. DELETE /api/courts/{courtId} */
export const removeCourt = (courtId) => request(`/courts/${courtId}`, { method: 'DELETE' })

/**
 * Slot length, unpaid-hold limit and weekly hours; the backend regenerates future slots.
 * data: { slot_minutes, payment_hold_minutes, operating_hours: [{ day_of_week, is_open, open_time, close_time }] }
 * PUT /api/courts/{courtId}/hours
 */
export const saveCourtHours = (courtId, data) => request(`/courts/${courtId}/hours`, { method: 'PUT', body: data })
