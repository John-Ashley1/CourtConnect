import { request } from './client'

// System administrator: user accounts. (The signed-in user's own profile uses /api/users/me in pages/Profile.jsx.)

/** Every account, newest first; is_me marks the signed-in admin. GET /api/admin/users */
export const listUsers = () => request('/admin/users')

/** Not for your own account; keeps at least one active system admin. PATCH /api/admin/users/{userId} { role } */
export const setUserRole = (userId, role) => request(`/admin/users/${userId}`, { method: 'PATCH', body: { role } })

/** status: ACTIVE | DEACTIVATED. PATCH /api/admin/users/{userId} { status } */
export const setUserStatus = (userId, status) => request(`/admin/users/${userId}`, { method: 'PATCH', body: { status } })
