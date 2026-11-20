import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { ROLES, findNavItem, initials } from '../roles'
import BrandLogo from './BrandLogo'
import Icon from './Icon'

/**
 * Shared shell for signed-in pages: teal top bar, role sidebar, breadcrumbs, page header.
 * Breadcrumbs are built from the sidebar (Home › Group › Page) unless `crumbs` is passed.
 */
export default function AppLayout({ title, description, actions, crumbs, narrow, children }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg = ROLES[user.role]

  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const trail = crumbs ?? defaultCrumbs(cfg, findNavItem(user.role, pathname), pathname)
  const notifPath = cfg.groups.flatMap((g) => g.items).find((i) => i.icon === 'bell')?.path

  const signOut = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="iconbtn menu-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen} aria-controls="side-nav" onClick={() => setMenuOpen((o) => !o)}>
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
        <Link to={cfg.home} className="brand-link" aria-label="CourtConnect home"><BrandLogo /></Link>
        <span className="topbar-gap" />
        {cfg.showBell && notifPath && (
          <Link className="iconbtn" to={notifPath} aria-label="Notifications"><Icon name="bell" size={21} /></Link>
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
              {group.items.map((item) => (
                <NavLink key={item.path} to={item.path} end className={({ isActive }) => 'side-link' + (isActive ? ' on' : '')}>
                  <Icon name={item.icon} size={19} /><span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {menuOpen && <div className="side-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

        <main className={'page' + (narrow ? ' page-narrow' : '')}>
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

function defaultCrumbs(cfg, match, pathname) {
  if (pathname === cfg.home || !match) return [{ label: cfg.homeLabel }]
  return [{ label: cfg.homeLabel, to: cfg.home }, { label: match.group.title }, { label: match.item.label }]
}
