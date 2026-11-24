import { request } from './client'

// Each booking comes with its slot (and slots), end_time, hours, court, facility, payment and player.

/** The signed-in player's bookings. GET /api/bookings/mine */
export const listMyBookings = () => request('/bookings/mine')

/** One booking of the signed-in player. GET /api/bookings/{bookingId} */
export const getBooking = (bookingId) => request(`/bookings/${bookingId}`)

/** Holds consecutive Available slots as a Pending booking while the player pays. POST /api/bookings { courtId, slotIds } */
export const holdSlots = ({ courtId, slotIds }) => request('/bookings', { method: 'POST', body: { courtId, slotIds } })

/** Cancels an upcoming Pending/Confirmed booking and releases its slots. POST /api/bookings/{bookingId}/cancel */
export const cancelBooking = (bookingId) => request(`/bookings/${bookingId}/cancel`, { method: 'POST' })
