import { Link, useNavigate } from 'react-router-dom'
import Logo from '../Logo'
import { useAuth } from '../auth'

export default function Landing() {
  const { user } = useAuth()
  const nav = useNavigate()
  const search = (e) => { e.preventDefault(); nav(user ? '/dashboard' : '/login') }
  return (
    <div className="landing">
      <header className="topbar">
        <Logo />
        <nav className="topnav" aria-label="Main">
          <a href="#find">Find Courts</a><a href="#games">Open Games</a><a href="#owners">For Courts Owners</a>
        </nav>
        <div className="topactions">
          {user ? <Link className="btn btn-light" to="/dashboard">Dashboard</Link> : <>
            <Link className="btn btn-outline" to="/login">Sign in</Link>
            <Link className="btn btn-light" to="/register">Register</Link></>}
        </div>
      </header>
      <main className="hero" id="find">
        <p className="tagline">Book • Play • Connect</p>
        <h1>Find a court. Book a slot. <span>Game on.</span></h1>
        <p className="sub">Discover nearby courts, reserve your time online, and join players in your community.</p>
        <form className="searchbar" onSubmit={search}>
          <label><span>Sport</span><select defaultValue=""><option value="" disabled>Select sport</option><option>Basketball</option><option>Badminton</option><option>Volleyball</option><option>Tennis</option><option>Pickleball</option></select></label>
          <label><span>Location</span><input defaultValue="Near me" /></label>
          <label><span>Date</span><input type="date" /></label>
          <button className="btn btn-dark" type="submit">Search Court</button>
        </form>
      </main>
    </div>
  )
}
