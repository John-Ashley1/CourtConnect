import { useNavigate } from 'react-router-dom'
import Logo from '../Logo'
import { useAuth } from '../auth'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  return (
    <div className="dash">
      <header className="dash-bar">
        <Logo size={28} />
        <span className="who">{user.fullName} · {user.role.replace('_', ' ').toLowerCase()}</span>
        <button className="btn btn-danger" onClick={() => { logout(); nav('/') }}>Log out</button>
      </header>
      <main className="dash-body"><h1>Welcome, {user.fullName.split(' ')[0]}</h1><p className="muted">Your courts, bookings, and games will appear here.</p></main>
    </div>
  )
}
