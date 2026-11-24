import { request } from './client'

/** Every facility with admin, courts and bookings_30d (confirmed, last 30 days). GET /api/admin/facilities */
export const listAllFacilities = () => request('/admin/facilities')
