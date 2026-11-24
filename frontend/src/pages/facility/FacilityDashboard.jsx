import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import AppLayout from '../../components/AppLayout'
import Button from '../../components/Button'
import Card from '../../components/Card'
import { AccountCard, LaterBlock } from '../../components/LaterIncrement'

/** facility-dashboard: real account details; today's figures and peak hours arrive in later increments. */
export default function FacilityDashboard() {
  const { user } = useAuth()
  return (
    <AppLayout title="Dashboard" description={`${greeting(user.fullName)} Here’s today at your facilities.`}
      actions={<Button to="/facility/check-in" icon="qr">QR check-in</Button>}>
      <div className="dash-grid dash-grid-3">
        <Card title="Today at a glance">
          <LaterBlock icon="chart">Bookings today, payments waiting, money received and blocked slots will show here once booking is built.</LaterBlock>
        </Card>
        <Card title="Today’s schedule" actions={<Link className="card-link" to="/facility/schedule">Open schedule</Link>}>
          <LaterBlock icon="calendar">Today’s bookings and blocked slots will be listed here.</LaterBlock>
        </Card>
        <AccountCard />
      </div>
      <div className="dash-grid dash-grid-2">
        <Card title="Peak hours · last 7 days" actions={<Link className="card-link" to="/facility/reports">Full report</Link>}>
          <LaterBlock icon="chart">A chart of your busiest booking hours will appear here once bookings are recorded.</LaterBlock>
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
