import { request } from './client'

/** Fired after marking notifications read, so the bell's unread count refreshes. */
export const NOTIFICATIONS_CHANGED = 'cc:notifications-changed'
const changed = (r) => { window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED)); return r }

// The backend knows the signed-in user from the JWT; `role` is accepted for symmetry with the pages.

/** Newest first. GET /api/notifications */
export const listMyNotifications = () => request('/notifications')

/** For the bell in the top bar. GET /api/notifications/unread-count → { count } */
export const unreadCount = () => request('/notifications/unread-count').then((r) => r.count)

/** POST /api/notifications/{id}/read */
export const markRead = (_role, notificationId) => request(`/notifications/${notificationId}/read`, { method: 'POST' }).then(changed)

/** POST /api/notifications/read-all */
export const markAllRead = () => request('/notifications/read-all', { method: 'POST' }).then(changed)
