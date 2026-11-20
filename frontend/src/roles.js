// Navigation and home page for each role the backend returns.
// Items whose page isn't built yet render the "Coming soon" page (see App.jsx).

export const ROLES = {
  PLAYER: {
    label: 'Player',
    home: '/player',
    homeLabel: 'Home',
    showBell: true,
    groups: [
      { title: 'Overview', items: [{ label: 'Home', path: '/player', icon: 'home' }] },
      {
        title: 'Courts & booking',
        items: [
          { label: 'Find courts', path: '/player/find-courts', icon: 'pin' },
          { label: 'My bookings', path: '/player/bookings', icon: 'ticket' },
        ],
      },
      {
        title: 'Find players',
        items: [
          { label: 'Open games', path: '/player/open-games', icon: 'users' },
          { label: 'Post a game', path: '/player/post-game', icon: 'plus' },
          { label: 'My games', path: '/player/my-games', icon: 'flag' },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Notifications', path: '/player/notifications', icon: 'bell' },
          { label: 'Profile', path: '/player/profile', icon: 'user' },
        ],
      },
    ],
  },
  FACILITY_ADMIN: {
    label: 'Facility Administrator',
    home: '/facility',
    homeLabel: 'Dashboard',
    showBell: true,
    groups: [
      { title: 'Overview', items: [{ label: 'Dashboard', path: '/facility', icon: 'home' }] },
      {
        title: 'Facility setup',
        items: [
          { label: 'Facilities', path: '/facility/facilities', icon: 'building' },
          { label: 'Courts', path: '/facility/courts', icon: 'grid' },
          { label: 'Hours & slots', path: '/facility/hours', icon: 'clock' },
        ],
      },
      {
        title: 'Bookings',
        items: [
          { label: 'Schedule', path: '/facility/schedule', icon: 'calendar' },
          { label: 'Booking records', path: '/facility/bookings', icon: 'list' },
          { label: 'QR check-in', path: '/facility/check-in', icon: 'qr' },
        ],
      },
      { title: 'Insights', items: [{ label: 'Reports', path: '/facility/reports', icon: 'chart' }] },
      {
        title: 'Account',
        items: [
          { label: 'Notifications', path: '/facility/notifications', icon: 'bell' },
          { label: 'Profile', path: '/facility/profile', icon: 'user' },
        ],
      },
    ],
  },
  SYSTEM_ADMIN: {
    label: 'System Administrator',
    home: '/admin',
    homeLabel: 'Dashboard',
    showBell: false,
    groups: [
      { title: 'Overview', items: [{ label: 'Dashboard', path: '/admin', icon: 'home' }] },
      {
        title: 'Management',
        items: [
          { label: 'Users & roles', path: '/admin/users', icon: 'users' },
          { label: 'Facilities', path: '/admin/facilities', icon: 'building' },
        ],
      },
      { title: 'Account', items: [{ label: 'Profile', path: '/admin/profile', icon: 'user' }] },
    ],
  },
}

export const homeFor = (role) => ROLES[role]?.home ?? '/login'

/** The sidebar group and item that match a path, or null. */
export function findNavItem(role, pathname) {
  const cfg = ROLES[role]
  if (!cfg) return null
  for (const group of cfg.groups) {
    const item = group.items.find((i) => i.path === pathname)
    if (item) return { group, item }
  }
  return null
}

export function initials(name = '') {
  return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
