import { request, qs } from './client'

/**
 * Booking summary for the admin's facilities over the last `days` days (today included):
 * { total, confirmed, cancelled, expired, pending, paid_value, utilization (0–1),
 *   peak: [{ hour, count }], by_court: [{ court_id, court_name, facility_name, count }] }
 * GET /api/reports/facility?days=&facilityId=
 */
export const getFacilityReport = ({ days = 7, facilityId = '' } = {}) => request('/reports/facility' + qs({ days, facilityId }))
