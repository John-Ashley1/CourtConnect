import { request } from './client'

// PayMongo: the backend creates a checkout, the player pays on PayMongo's page and comes back to
// /player/checkout/{id}?paid=1; the backend then asks PayMongo whether it was paid (and, when deployed,
// a PayMongo webhook confirms it too).

export const PAYMENT_METHODS = ['GCash', 'Maya', 'Credit / debit card', 'GrabPay']

/** { online_payment }: false until PayMongo is set up; then the facility confirms bookings instead. GET /api/payments/config */
export const getPaymentConfig = () => request('/payments/config')

/** Starts paying a Pending booking → { checkout_url }. POST /api/payments/checkout { bookingId, method } */
export const startPayment = (bookingId, method) => request('/payments/checkout', { method: 'POST', body: { bookingId, method } })

/** Asks the backend to check the booking's PayMongo checkout; returns the (possibly now Confirmed) booking. POST /api/payments/{bookingId}/verify */
export const verifyPayment = (bookingId) => request(`/payments/${bookingId}/verify`, { method: 'POST' })
