import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import { useAsync } from '../../hooks/useAsync'
import { listFacilityBookings } from '../../services/facilityBookingService'
import { fmtTimeRange, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import { AccountCard, LaterBlock } from '../../components/LaterIncrement'
import { SkeletonPage } from '../../components/Skeleton'

/** facility-dashboard: today's bookings and figures (FR-060); peak hours arrive with reports in a later increment. */
export default function FacilityDashboard() {
  const { user } = useAuth()
  const q = useAsync(() => listFacilityBookings({ period: 'today' }), [])

  return (
    <AppLayout title="Dashboard" description={`${greeting(user.fullName)} Here’s today at your facilities.`}
      actions={<Button to="/facility/check-in" icon="qr">QR check-in</Button>}>
      <div className="dash-grid dash-grid-3">
        <Card title="Today at a glance" actions={<Link className="card-link" to="/facility/bookings?period=today">Today’s bookings</Link>}>
          <AsyncContent state={q} loading={<SkeletonPage rows={1} />} errorTitle="Can’t load today’s figures">
            {(rows) => {
              const confirmed = rows.filter((b) => b.status === 'CONFIRMED')
              const pending = rows.filter((b) => b.status === 'PENDING')
              const received = confirmed.filter((b) => b.payment?.status === 'PAID').reduce((a, b) => a + Number(b.total_fee), 0)
              return (
                <div className="kpi-grid kpi-2 mt-12">
                  <div className="kpi"><span>Confirmed today</span><b>{confirmed.length}</b></div>
                  <div className="kpi"><span>Waiting for payment</span><b>{pending.length}</b></div>
                  <div className="kpi"><span>Paid for today</span><b>{peso(received)}</b></div>
                  <div className="kpi"><span>Cancelled / expired</span><b>{rows.length - confirmed.length - pending.length}</b></div>
                </div>
              )
            }}
          </AsyncContent>
        </Card>
        <Card title="Today’s schedule" actions={<Link className="card-link" to="/facility/schedule">Open schedule</Link>}>
          <AsyncContent state={q} loading={<SkeletonPage rows={2} />} errorTitle="Can’t load today’s schedule">
            {(rows) => {
              const active = rows.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
              if (!active.length) return <EmptyState compact icon="calendar" title="No bookings today">Bookings for today will be listed here.</EmptyState>
              return (
                <ul className="stack-12 mt-12" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {active.slice(0, 6).map((b) => (
                    <li key={b.booking_id} className="list-row">
                      <div className="grow min0">
                        <b>{fmtTimeRange(b.slot.start_time, b.end_time)}</b> · {b.court.court_name}
                        <p className="muted xsmall">{b.player?.full_name} · {b.facility.name}</p>
                      </div>
                      <StatusBadge kind="booking" status={b.status} />
                    </li>
                  ))}
                  {active.length > 6 && <li className="muted xsmall">+{active.length - 6} more in Booking records</li>}
                </ul>
              )
            }}
          </AsyncContent>
        </Card>
        <AccountCard />
      </div>
      <div className="dash-grid dash-grid-2">
        <Card title="Peak hours · last 7 days" actions={<Link className="card-link" to="/facility/reports">Full report</Link>}>
          <LaterBlock icon="chart">A chart of your busiest booking hours will appear here with reports in a later increment.</LaterBlock>
        </Card>
        <Card title="Manage your facilities">
          <p className="muted small">Set up facilities, courts and opening hours.</p>
          <div className="row-wrap mt-14">
            <Button variant="sec" to="/facility/facilities" icon="building">Facilities</Button>
            <Button variant="sec" to="/facility/courts" icon="grid">Courts</Button>
            <Button variant="sec" to="/facility/hours" icon="clock">Hours & slots</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
