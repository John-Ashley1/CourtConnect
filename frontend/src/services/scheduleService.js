import { request, qs } from './client'

/** A facility's courts with their slots on `date` (Pending/Booked slots include the booking). GET /api/facilities/{facilityId}/schedule?date= */
export const getFacilitySchedule = (facilityId, date) => request(`/facilities/${facilityId}/schedule` + qs({ date }))

/** reason: 'Maintenance' | 'Private event'. POST /api/slots/{slotId}/block */
export const blockSlot = (slotId, reason) => request(`/slots/${slotId}/block`, { method: 'POST', body: { reason } })

/** POST /api/slots/{slotId}/unblock */
export const unblockSlot = (slotId) => request(`/slots/${slotId}/unblock`, { method: 'POST' })
