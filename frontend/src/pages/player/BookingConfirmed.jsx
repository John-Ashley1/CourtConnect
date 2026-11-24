import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import { useAsync } from '../../hooks/useAsync'
import { getBooking } from '../../services/bookingService'
import { areaOf, fmtDateLong, fmtTimeRange, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge, { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'
import QrCode from '../../components/QrCode'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

/** player-booking-confirmed: QR code for check-in, booking and payment details. */
export default function BookingConfirmed() {
  const { bookingId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const q = useAsync(() => getBooking(bookingId), [bookingId])
  const confirmed = q.status === 'ready' && q.data.status === 'CONFIRMED'

  return (
    <AppLayout title={q.status === 'ready' && !confirmed ? 'Booking details' : 'You’re booked!'}
      description={confirmed ? 'Payment verified. Here is your QR confirmation and booking details.' : 'Your booking confirmation and QR code.'}>
      <AsyncContent state={q} loading={<SkeletonPage kind="cards" rows={2} />} errorTitle="Can’t load your confirmation"
        reassurance="Your booking is still confirmed. We just can’t show it right now.">
        {(b) => b.status !== 'CONFIRMED' ? (
          <EmptyState icon="ticket" title={b.status === 'PENDING' ? 'This booking isn’t paid yet' : 'Confirmation not available'}
            action={b.status === 'PENDING'
              ? <Button to={`/player/checkout/${b.booking_id}`}>Pay now</Button>
              : <Button to="/player/bookings">Go to my bookings</Button>}>
            {b.status === 'PENDING'
              ? `Booking ${b.qr_code} is waiting for payment. Its QR code appears once PayMongo confirms the payment.`
              : `Booking ${b.qr_code} is ${b.status.toLowerCase()}, so there is no QR code to show.`}
          </EmptyState>
        ) : (
          <div className="split align-start">
            <Card className="qr-card">
              <StatusBadge kind="booking" status="CONFIRMED" />
              <QrCode value={b.qr_code} size={200} caption={null} />
              <b className="ref">{b.qr_code}</b>
              <p className="muted small">Show this QR code at the facility. Staff will scan it to check you in.</p>
            </Card>

            <div className="split-main stack">
              <Card title="Booking details">
                <dl className="facts-grid">
                  <div><dt>Facility</dt><dd>{b.facility.name}</dd></div>
                  <div><dt>Court</dt><dd>{b.court.court_name} · {b.court.is_indoor ? 'Indoor' : 'Outdoor'}</dd></div>
                  <div><dt>Date</dt><dd>{fmtDateLong(b.slot.slot_date)}</dd></div>
                  <div><dt>Time</dt><dd>{fmtTimeRange(b.slot.start_time, b.end_time)}</dd></div>
                  <div><dt>Booked by</dt><dd>{user.fullName}</dd></div>
                  <div><dt>Address</dt><dd>{areaOf(b.facility.address)}</dd></div>
                </dl>
              </Card>
              <Card title="Payment">
                <dl className="facts-grid">
                  <div><dt>Amount paid</dt><dd>{peso(b.payment?.amount ?? b.total_fee)}</dd></div>
                  <div><dt>Method</dt><dd>{b.payment?.method ? `${b.payment.method} via PayMongo` : 'PayMongo'}</dd></div>
                  <div><dt>Payment status</dt><dd>{b.payment ? <StatusBadge kind="payment" status={b.payment.status} /> : <Badge>Unknown</Badge>}</dd></div>
                  <div><dt>PayMongo reference</dt><dd>{b.payment?.paymongo_reference ?? '—'}</dd></div>
                </dl>
              </Card>
              <div className="banner bn-info"><Icon name="bell" />
                <span>Push reminders before your game and the weather forecast for this slot arrive in a later increment.</span>
              </div>
              <div className="row-wrap">
                <Button to="/player/bookings">Go to my bookings</Button>
                <Button variant="sec" icon="map" onClick={() => toast('Directions open in Google Maps in a later increment.')}>Directions</Button>
                <Button variant="sec" to={`/player/games/new?bookingId=${b.booking_id}`}>Post an open game for this slot</Button>
              </div>
            </div>
          </div>
        )}
      </AsyncContent>
    </AppLayout>
  )
}
