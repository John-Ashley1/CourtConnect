import { request } from './client'

// PayMongo: the backend creates a checkout, the player pays on PayMongo's page, and a PayMongo
// webhook marks the booking Confirmed.

export const PAYMENT_METHODS = ['GCash', 'Maya', 'Credit / debit card', 'GrabPay']

/** Starts paying a Pending booking → { checkout_url }. POST /api/payments/checkout { bookingId, method } */
export const startPayment = (bookingId, method) => request('/payments/checkout', { method: 'POST', body: { bookingId, method } })
