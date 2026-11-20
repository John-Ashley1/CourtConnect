import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { homeFor } from '../roles'
import BrandLogo from '../components/BrandLogo'
import Icon from '../components/Icon'

const SPORTS = ['Basketball', 'Badminton', 'Volleyball', 'Pickleball', 'Tennis']
const DISTANCES = ['Near me', 'Within 3 km', 'Within 5 km', 'Within 10 km']

/** The next `n` days as select options, starting with today. */
function upcomingDays(n = 7) {
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { value, label: (i === 0 ? 'Today · ' : '') + fmt.format(d) }
  })
}

const STEPS = [
  { icon: 'pin', title: 'Find nearby courts', text: 'Browse courts on a map, filter by sport, date and distance, and get directions.' },
  { icon: 'ticket', title: 'Book and pay online', text: 'See open slots, pay the booking fee through PayMongo, and get a QR code for check-in.' },
  { icon: 'users', title: 'Find players', text: 'Post an open game or ask to join one. The host approves who plays.', id: 'games' },
]

export default function Landing() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const days = useMemo(() => upcomingDays(), [])
  const [form, setForm] = useState({ sport: '', distance: DISTANCES[0], date: days[0].value })
  const [error, setError] = useState('')
  const [searched, setSearched] = useState('')

  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); if (k === 'sport') setError('') }

  const search = (e) => {
    e.preventDefault()
    if (!form.sport) { setError('Choose a sport to search for courts.'); setSearched(''); return }
    if (!user) { setSearched(form.sport); return }
    navigate(user.role === 'PLAYER' ? '/player/find-courts' : homeFor(user.role))
  }

  return (
    <div className="landing">
      <header className="site-bar">
        <Link to="/" className="brand-link" aria-label="CourtConnect home"><BrandLogo /></Link>
        <nav className="site-nav" aria-label="Public">
          <a className="btn ghost" href="#how">Find Courts</a>
          <a className="btn ghost" href="#games">Open Games</a>
          <a className="btn ghost" href="#owners">For Court Owners</a>
        </nav>
        <span className="topbar-gap" />
        <div className="site-actions">
          {user ? (
            <Link className="btn navy" to={homeFor(user.role)}>Go to dashboard</Link>
          ) : (
            <>
              <Link className="btn sec" to="/login">Sign in</Link>
              <Link className="btn navy" to="/register">Register</Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <span className="badge b-ok hero-badge">Book · Play · Connect</span>
          <h1>Find a court. Book a slot. <span>Game on.</span></h1>
          <p className="hero-sub">Discover nearby courts, reserve your time online, and join players in your community.</p>

          <form className="search" onSubmit={search} noValidate>
            <div className="field">
              <label className="lbl" htmlFor="l-sport">Sport</label>
              <select id="l-sport" className={'inp' + (error ? ' bad' : '')} value={form.sport} onChange={set('sport')}
                aria-invalid={!!error} aria-describedby={error ? 'l-sport-err' : undefined}>
                <option value="">Choose a sport</option>
                {SPORTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="l-loc">Location</label>
              <select id="l-loc" className="inp" value={form.distance} onChange={set('distance')}>
                {DISTANCES.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl" htmlFor="l-date">Date</label>
              <select id="l-date" className="inp" value={form.date} onChange={set('date')}>
                {days.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <button className="btn pri" type="submit"><Icon name="search" size={18} /> Search courts</button>
            {error && <p className="ferr search-err" id="l-sport-err">{error}</p>}
          </form>

          {searched && (
            <div className="banner bn-info search-banner" role="status">
              <Icon name="alert" />
              <span>Sign in or create a free player account to see available slots for <b>{searched}</b> courts.</span>
              <Link className="btn pri sm" to="/login">Sign in to continue</Link>
            </div>
          )}
        </section>

        <section id="how" className="how">
          <h2>How CourtConnect works</h2>
          <div className="how-grid">
            {STEPS.map((s) => (
              <div className="card" key={s.title} id={s.id}>
                <div className="state-icon"><Icon name={s.icon} size={26} /></div>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="owners" className="owners">
          <div className="owners-inner">
            <div>
              <h2>Own or manage a court?</h2>
              <p>Facility administrators list courts, set hours, rates and slot lengths, manage bookings, verify QR check-ins, and see peak-hour reports. Administrator accounts are set up by the CourtConnect system administrator.</p>
            </div>
            <Link className="btn sec" to="/login">Administrator sign in</Link>
          </div>
        </section>
      </main>

      <footer className="site-foot">© {new Date().getFullYear()} CourtConnect · IT342-G01</footer>
    </div>
  )
}
