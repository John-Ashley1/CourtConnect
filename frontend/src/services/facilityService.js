import { request } from './client'

/** Every facility (players' map, system admin). GET /api/facilities */
export const listFacilities = () => request('/facilities')

/** Facilities the signed-in facility administrator manages (with court_count). GET /api/facilities/mine */
export const listMyFacilities = () => request('/facilities/mine')

/** data: { name, phone, address, city }; the backend finds the map position. POST /api/facilities */
export const createFacility = (data) => request('/facilities', { method: 'POST', body: data })

/** PUT /api/facilities/{facilityId} */
export const updateFacility = (facilityId, data) => request(`/facilities/${facilityId}`, { method: 'PUT', body: data })
