import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import { SPORTS } from '../../constants/status'
import AppLayout from '../../components/AppLayout'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { AccountCard, LaterBlock } from '../../components/LaterIncrement'

/** player-home: real account details; bookings, games and notifications arrive in later increments. */
export default function PlayerHome() {
  const { user } = useAuth()
  return (
    <AppLayout title="Home" description={`${greeting(user.fullName)} Here is what is coming up.`}
      actions={<>
        <Button to="/player/courts" icon="search">Find courts</Button>
        <Button to="/player/games/new" variant="sec" icon="plus">Post a game</Button>
      </>}>
      <div className="dash-grid dash-grid-3">
        <Card title="Your next booking" actions={<Link className="card-link" to="/player/bookings">All bookings</Link>}>
          <LaterBlock icon="ticket">Your upcoming bookings, QR codes and payment reminders will show here once court booking is built.</LaterBlock>
        </Card>
        <Card title="Quick search">
          <p className="muted small">Pick a sport to see courts near you.</p>
          <div className="chips mt-14">
            {SPORTS.map((s) => <Link key={s} className="chip" to={`/player/courts?sport=${encodeURIComponent(s)}`}>{s}</Link>)}
          </div>
        </Card>
        <AccountCard />
      </div>
      <div className="dash-grid dash-grid-2">
        <Card title="Open games near you" actions={<Link className="card-link" to="/player/games">See all</Link>}>
          <LaterBlock icon="users">Games posted by other players will appear here when Find Players is built.</LaterBlock>
        </Card>
        <Card title="Latest notifications" actions={<Link className="card-link" to="/player/notifications">View all</Link>}>
          <LaterBlock icon="bell">Booking confirmations, reminders and join requests will appear here when notifications are built.</LaterBlock>
        </Card>
      </div>
    </AppLayout>
  )
}
