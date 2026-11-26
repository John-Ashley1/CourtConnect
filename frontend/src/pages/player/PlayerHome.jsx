import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import { SPORTS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { listMyBookings } from '../../services/bookingService'
import { fmtBookingWhen, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import { AccountCard, LaterBlock } from '../../components/LaterIncrement'
import { SkeletonPage } from '../../components/Skeleton'

const isUpcoming = (b) => (b.status === 'PENDING' || b.status === 'CONFIRMED') && new Date(`${b.slot.slot_date}T${b.end_time}`).getTime() > Date.now()

/** player-home: next booking and account details; games and notifications arrive in later increments. */
export default function PlayerHome() {
  const { user } = useAuth()
  const q = useAsync(() => listMyBookings(), [])
  return (
    <AppLayout title="Home" description={`${greeting(user.fullName)} Here is what is coming up.`}
      actions={<>
        <Button to="/player/courts" icon="search">Find courts</Button>
        <Button to="/player/games/new" variant="sec" icon="plus">Post a game</Button>
      </>}>
      <div className="dash-grid dash-grid-3">
        <Card title="Your next booking" actions={<Link className="card-link" to="/player/bookings">All bookings</Link>}>
          <AsyncContent state={q} loading={<SkeletonPage rows={1} />} errorTitle="Can’t load your bookings">
            {(rows) => {
              const upcoming = rows.filter(isUpcoming)
              const b = upcoming[0]
              if (!b) return (
                <EmptyState compact icon="ticket" title="No upcoming bookings" action={<Button size="sm" to="/player/courts">Find a court</Button>}>
                  Book a court and it shows up here.
                </EmptyState>
              )
              return (
                <div className="stack-12">
                  <div className="row-wrap gap-8"><b className="md">{b.court.court_name}</b><StatusBadge kind="booking" status={b.status} /></div>
                  <p className="muted small">{b.facility.name} · {fmtBookingWhen(b)}</p>
                  <p className="xsmall">Ref {b.qr_code} · {peso(b.total_fee)}</p>
                  <div className="row-wrap">
                    {b.status === 'PENDING'
                      ? <Button size="sm" to={`/player/checkout/${b.booking_id}`}>View booking</Button>
                      : <Button size="sm" icon="qr" to={`/player/bookings/${b.booking_id}/confirmed`}>Show QR</Button>}
                    {upcoming.length > 1 && <span className="muted xsmall">+{upcoming.length - 1} more upcoming</span>}
                  </div>
                </div>
              )
            }}
          </AsyncContent>
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
