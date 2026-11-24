// Which page each signed-in URL shows, per role. Paths are relative to the role's home (roles.js).
// Feature pages load on first visit (lazy), so the charts library etc. only download when needed.

import { lazy } from 'react'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'

const PlayerHome = lazy(() => import('./pages/player/PlayerHome'))
const FacilityDashboard = lazy(() => import('./pages/facility/FacilityDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const FindCourts = lazy(() => import('./pages/player/FindCourts'))
const CourtDetails = lazy(() => import('./pages/player/CourtDetails'))
const Checkout = lazy(() => import('./pages/player/Checkout'))
const BookingConfirmed = lazy(() => import('./pages/player/BookingConfirmed'))
const MyBookings = lazy(() => import('./pages/player/MyBookings'))
const OpenGames = lazy(() => import('./pages/player/OpenGames'))
const PostGame = lazy(() => import('./pages/player/PostGame'))
const MyGames = lazy(() => import('./pages/player/MyGames'))
const Facilities = lazy(() => import('./pages/facility/Facilities'))
const Courts = lazy(() => import('./pages/facility/Courts'))
const HoursSlots = lazy(() => import('./pages/facility/HoursSlots'))
const Schedule = lazy(() => import('./pages/facility/Schedule'))
const BookingRecords = lazy(() => import('./pages/facility/BookingRecords'))
const CheckIn = lazy(() => import('./pages/facility/CheckIn'))
const Reports = lazy(() => import('./pages/facility/Reports'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminFacilities = lazy(() => import('./pages/admin/AdminFacilities'))

const FacilityNotifications = () => <Notifications description="Booking, cancellation and payment updates for your facilities." />

export const ROLE_ROUTES = {
  PLAYER: [
    { index: true, Page: PlayerHome },                       // player-home
    { path: 'courts', Page: FindCourts },                    // player-find-courts
    { path: 'courts/:courtId', Page: CourtDetails },           // player-court-details
    { path: 'checkout/:bookingId', Page: Checkout },       // player-checkout
    { path: 'bookings/:bookingId/confirmed', Page: BookingConfirmed }, // player-booking-confirmed
    { path: 'bookings', Page: MyBookings },                  // player-my-bookings
    { path: 'games', Page: OpenGames },                     // player-open-games
    { path: 'games/new', Page: PostGame },                 // player-post-game
    { path: 'my-games', Page: MyGames },                  // player-my-games
    { path: 'notifications', Page: Notifications },          // player-notifications
    { path: 'profile', Page: Profile },
  ],
  FACILITY_ADMIN: [
    { index: true, Page: FacilityDashboard },                // facility-dashboard
    { path: 'facilities', Page: Facilities },                // facility-facilities
    { path: 'courts', Page: Courts },                    // facility-courts
    { path: 'hours', Page: HoursSlots },                     // facility-hours-slots
    { path: 'schedule', Page: Schedule },                  // facility-schedule
    { path: 'bookings', Page: BookingRecords },                  // facility-bookings
    { path: 'check-in', Page: CheckIn },                  // facility-check-in
    { path: 'reports', Page: Reports },                   // facility-reports
    { path: 'notifications', Page: FacilityNotifications },             // facility-notifications
    { path: 'profile', Page: Profile },
  ],
  SYSTEM_ADMIN: [
    { index: true, Page: AdminDashboard },                   // admin-dashboard
    { path: 'users', Page: AdminUsers },                     // admin-users
    { path: 'facilities', Page: AdminFacilities },                // admin-facilities
    { path: 'profile', Page: Profile },
  ],
}
