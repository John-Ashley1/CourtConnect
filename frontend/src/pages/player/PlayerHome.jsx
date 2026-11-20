import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { AccountCard, DashCard, LaterPhase } from '../../components/Dashboard'

const SPORTS = ['Basketball', 'Badminton', 'Volleyball', 'Pickleball', 'Tennis']

export default function PlayerHome() {
  const { user } = useAuth()
  return (
    <AppLayout title="Home" description={`${greeting(user.fullName)} Here is what is coming up.`}
      actions={<>
        <Link className="btn pri" to="/player/find-courts"><Icon name="search" size={18} /> Find courts</Link>
        <Link className="btn sec" to="/player/post-game"><Icon name="plus" size={18} /> Post a game</Link>
      </>}>
      <div className="dash-grid dash-grid-3">
        <DashCard title="Your next booking" link={{ to: '/player/bookings', label: 'All bookings' }}>
          <LaterPhase icon="ticket">Your upcoming bookings, QR codes and payment reminders will show here once court booking is built.</LaterPhase>
        </DashCard>
        <DashCard title="Quick search">
          <p className="muted card-text">Pick a sport to see courts near you.</p>
          <div className="chips">
            {SPORTS.map((s) => <Link key={s} className="chip" to="/player/find-courts">{s}</Link>)}
          </div>
        </DashCard>
        <AccountCard />
      </div>
      <div className="dash-grid dash-grid-2">
        <DashCard title="Open games near you" link={{ to: '/player/open-games', label: 'See all' }}>
          <LaterPhase icon="users">Games posted by other players will appear here when Find Players is built.</LaterPhase>
        </DashCard>
        <DashCard title="Latest notifications" link={{ to: '/player/notifications', label: 'View all' }}>
          <LaterPhase icon="bell">Booking confirmations, reminders and join requests will appear here when notifications are built.</LaterPhase>
        </DashCard>
      </div>
    </AppLayout>
  )
}
