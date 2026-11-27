import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { ROLES, findNavItem, initials } from '../roles'
import { useAsync } from '../hooks/useAsync'
import { NOTIFICATIONS_CHANGED, unreadCount } from '../services/notificationService'
import BrandLogo from './BrandLogo'
import Icon from './Icon'

// Each page renders its own AppLayout, so the previous path is remembered here (for focus on navigation).
let lastPath = null

/**
 * Shared shell for signed-in pages: teal top bar (navy text), role sidebar grouped by module with
 * the current page highlighted, breadcrumbs, and the page header (title, one-line description, actions).
 *
 * Breadcrumbs come from the sidebar: Home › Group › Page. On a detail page (e.g. /player/courts/5)
 * the parent item becomes a link and the page title is added at the end, unless `crumbs` is passed.
 * On phones the sidebar stacks above the content and opens with the menu button.
 */
export default function AppLayout({ title, description, actions, crumbs, narrow, children }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg = ROLES[user.role]
  const match = findNavItem(user.role, pathname)

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
    // After moving to another page (not on first load), put keyboard/screen-reader focus on the new content.
    if (lastPath !== null && lastPath !== pathname) document.getElementById('main')?.focus({ preventScroll: true })
    lastPath = pathname
  }, [pathname])
  useEffect(() => { document.title = title ? `${title} · CourtConnect` : 'CourtConnect' }, [title])

  const trail = crumbs ?? defaultCrumbs(cfg, match, pathname, title)
  const notifPath = cfg.groups.flatMap((g) => g.items).find((i) => i.icon === 'bell')?.path
  const unread = useAsync(() => (cfg.showBell ? unreadCount() : Promise.resolve(0)), [user.role, pathname])
  const count = unread.status === 'ready' ? unread.data : 0
  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED, unread.reload)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, unread.reload)
  }, [unread.reload])

  const signOut = () => logout() // players → /signin, administrators → /admin/signin (see App.jsx)

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="topbar">
        <button type="button" className="iconbtn menu-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen} aria-controls="side-nav" onClick={() => setMenuOpen((o) => !o)}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
        <Link to={cfg.home} className="brand-link" aria-label="CourtConnect home"><BrandLogo /></Link>
        <span className="topbar-gap" />
        {cfg.showBell && notifPath && (
          <Link className="iconbtn" to={notifPath}
            aria-label={count ? `Notifications, ${count} unread` : 'Notifications'}>
            <Icon name="bell" size={21} />
            {count > 0 && <span className="dot" aria-hidden="true">{count > 9 ? '9+' : count}</span>}
          </Link>
        )}
        <div className="who">
          <span className="avatar" aria-hidden="true">{initials(user.fullName)}</span>
          <span className="who-text"><b>{user.fullName}</b><span>{cfg.label}</span></span>
        </div>
        <button type="button" className="iconbtn" aria-label="Sign out" title="Sign out" onClick={signOut}>
          <Icon name="signout" />
        </button>
      </header>

      <div className="shell-body">
        <nav id="side-nav" className={'side' + (menuOpen ? ' open' : '')} aria-label={`${cfg.label} menu`}>
          {cfg.groups.map((group) => (
            <div key={group.title}>
              <p className="side-group">{group.title}</p>
              {group.items.map((item) => {
                const on = match?.item === item
                return (
                  <Link key={item.path} to={item.path} className={'side-link' + (on ? ' on' : '')} aria-current={on ? 'page' : undefined}>
                    <Icon name={item.icon} size={19} /><span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <main id="main" tabIndex={-1} className={'page' + (narrow ? ' page-narrow' : '')}>
          <nav aria-label="Breadcrumb" className="crumbs">
            <ol>
              {trail.map((c, i) => {
                const last = i === trail.length - 1
                return (
                  <li key={i}>
                    {c.to && !last ? <Link to={c.to}>{c.label}</Link> : <span aria-current={last ? 'page' : undefined}>{c.label}</span>}
                  </li>
                )
              })}
            </ol>
          </nav>
          <div className="page-head">
            <div>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

function defaultCrumbs(cfg, match, pathname, title) {
  if (pathname === cfg.home || !match) return [{ label: cfg.homeLabel }]
  const base = [{ label: cfg.homeLabel, to: cfg.home }, { label: match.group.title }]
  const onItem = pathname.replace(/\/+$/, '') === match.item.path
  return onItem
    ? [...base, { label: match.item.label }]
    : [...base, { label: match.item.label, to: match.item.path }, { label: title }]
}
