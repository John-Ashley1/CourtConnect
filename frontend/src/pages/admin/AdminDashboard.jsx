import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import AppLayout from '../../components/AppLayout'
import Card from '../../components/Card'
import { AccountCard, LaterBlock } from '../../components/LaterIncrement'

/** admin-dashboard: real account details; system-wide summaries arrive in later increments. */
export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <AppLayout title="Dashboard" description={`${greeting(user.fullName)} System-wide overview of accounts, facilities and bookings.`}>
      <div className="dash-grid dash-grid-3">
        <Card title="Accounts" actions={<Link className="card-link" to="/admin/users">Users & roles</Link>}>
          <LaterBlock icon="users">Counts of players, facility administrators and system administrators will show here.</LaterBlock>
        </Card>
        <Card title="Bookings by status">
          <LaterBlock icon="chart">Confirmed, pending, cancelled and expired bookings across all facilities will show here.</LaterBlock>
        </Card>
        <AccountCard />
      </div>
      <div className="dash-grid dash-grid-2">
        <Card title="Most-booked facilities" actions={<Link className="card-link" to="/admin/facilities">All facilities</Link>}>
          <LaterBlock icon="building">The busiest facilities will be ranked here once bookings are recorded.</LaterBlock>
        </Card>
        <Card title="External services">
          <LaterBlock icon="info">Status of Google Maps, PayMongo, OpenWeatherMap and Firebase Cloud Messaging will show here once they’re connected.</LaterBlock>
        </Card>
      </div>
    </AppLayout>
  )
}
