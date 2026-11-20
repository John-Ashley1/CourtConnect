import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { AccountCard, DashCard, Kpi, LaterPhase } from '../../components/Dashboard'

export default function FacilityDashboard() {
  const { user } = useAuth()
  return (
    <AppLayout title="Dashboard" description={`${greeting(user.fullName)} Here’s today at your facilities.`}
      actions={<Link className="btn pri" to="/facility/check-in"><Icon name="qr" size={18} /> QR check-in</Link>}>
      <div className="kpi-grid">
        <Kpi label="Bookings today" />
        <Kpi label="Waiting for payment" />
        <Kpi label="Paid today" />
        <Kpi label="Blocked slots today" />
      </div>
      <div className="dash-grid dash-grid-2">
        <DashCard title="Today’s schedule" link={{ to: '/facility/schedule', label: 'Open schedule' }}>
          <LaterPhase icon="calendar">Today’s bookings, pending payments and blocked slots will list here once facilities, courts and booking are built.</LaterPhase>
        </DashCard>
        <DashCard title="Peak hours" link={{ to: '/facility/reports', label: 'Full report' }}>
          <LaterPhase icon="chart">Busiest booking hours are calculated from recorded bookings, so this chart appears once bookings exist.</LaterPhase>
        </DashCard>
      </div>
      <div className="dash-grid dash-grid-2">
        <DashCard title="Get started">
          <p className="muted card-text">Set up runs in this order: register a facility, add its courts, then set hours and slot lengths.</p>
          <div className="row-start">
            <Link className="btn sec" to="/facility/facilities"><Icon name="building" size={18} /> Facilities</Link>
            <Link className="btn sec" to="/facility/courts"><Icon name="grid" size={18} /> Courts</Link>
            <Link className="btn sec" to="/facility/hours"><Icon name="clock" size={18} /> Hours & slots</Link>
          </div>
        </DashCard>
        <AccountCard />
      </div>
    </AppLayout>
  )
}
