// Sidebar navigation and home page for each role the backend returns (PLAYER, FACILITY_ADMIN, SYSTEM_ADMIN).
// Groups and labels match docs/ui-prototype. Which component each path renders is in routes.jsx.
// `match`: extra path prefixes that highlight the item (e.g. checkout belongs to "Find courts").

export const SIGN_IN = '/signin'
/** Login-only page for facility and system administrators (the landing page's "Administrator sign in"). */
export const ADMIN_SIGN_IN = '/admin/signin'

/** Where a role signs in: administrators → ADMIN_SIGN_IN, players and unknown → SIGN_IN. */
export const signInFor = (role) => (role === 'FACILITY_ADMIN' || role === 'SYSTEM_ADMIN' ? ADMIN_SIGN_IN : SIGN_IN)

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
          { label: 'Find courts', path: '/player/courts', icon: 'pin', match: ['/player/checkout'] },
          { label: 'My bookings', path: '/player/bookings', icon: 'ticket' },
        ],
      },
      {
        title: 'Find players',
        items: [
          { label: 'Open games', path: '/player/games', icon: 'users' },
          { label: 'Post a game', path: '/player/games/new', icon: 'plus' },
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

export const homeFor = (role) => ROLES[role]?.home ?? SIGN_IN

/**
 * The sidebar group and item a path belongs to: the item whose path (or a `match` prefix) is the
 * longest prefix of `pathname`. The home path only matches exactly. Returns null if none.
 */
export function findNavItem(role, pathname) {
  const cfg = ROLES[role]
  if (!cfg) return null
  const path = pathname.replace(/\/+$/, '') || '/'
  let best = null, bestLen = -1
  for (const group of cfg.groups) {
    for (const item of group.items) {
      for (const p of [item.path, ...(item.match ?? [])]) {
        const hit = p === cfg.home ? path === p : path === p || path.startsWith(p + '/')
        if (hit && p.length > bestLen) { best = { group, item }; bestLen = p.length }
      }
    }
  }
  return best
}

export function initials(name = '') {
  // Letters only, so "[Player Name]" gives "PN", not "[N".
  return name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
