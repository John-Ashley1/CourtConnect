import { useAuth } from '../../auth'
import { greeting } from '../../greeting'
import AppLayout from '../../components/AppLayout'
import { AccountCard, DashCard, Kpi, LaterPhase } from '../../components/Dashboard'

export default function AdminDashboard() {
  const { user } = useAuth()
  return (
    <AppLayout title="Dashboard" description={`${greeting(user.fullName)} System-wide overview of accounts, facilities and bookings.`}>
      <div className="kpi-grid">
        <Kpi label="User accounts" />
        <Kpi label="Registered facilities" />
        <Kpi label="Bookings" />
        <Kpi label="Paid bookings value" />
      </div>
      <div className="dash-grid dash-grid-wide">
        <DashCard title="Bookings by status">
          <LaterPhase icon="chart">Confirmed, pending, cancelled and expired totals across all facilities appear once booking is built.</LaterPhase>
        </DashCard>
        <DashCard title="External services">
          <LaterPhase icon="offline">Live status for Google Maps, PayMongo, OpenWeatherMap and Firebase appears once those integrations are connected.</LaterPhase>
        </DashCard>
      </div>
      <div className="dash-grid dash-grid-wide">
        <DashCard title="Most-booked facilities" link={{ to: '/admin/facilities', label: 'All facilities' }}>
          <LaterPhase icon="building">Facilities ranked by bookings appear once facilities and booking are built.</LaterPhase>
        </DashCard>
        <AccountCard />
      </div>
    </AppLayout>
  )
}
