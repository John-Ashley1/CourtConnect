import { request, qs } from './client'

/** A court's time slots for one date, in start-time order. GET /api/courts/{courtId}/slots?date= */
export const listSlots = (courtId, date) => request(`/courts/${courtId}/slots` + qs({ date }))
