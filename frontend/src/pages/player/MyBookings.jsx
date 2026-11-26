import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { useCountdown } from '../../hooks/useCountdown'
import { cancelBooking, listMyBookings } from '../../services/bookingService'
import { fmtBookingWhen, fmtCountdown, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import EmptyState from '../../components/EmptyState'
import Modal, { ConfirmDialog } from '../../components/Modal'
import QrCode from '../../components/QrCode'
import { SkeletonPage } from '../../components/Skeleton'
import Tabs, { TabPanel } from '../../components/Tabs'
import { useToast } from '../../components/Toast'

/** Current = upcoming and still Pending or Confirmed. Everything else is Previous. */
const isCurrent = (b) => (b.status === 'PENDING' || b.status === 'CONFIRMED')
  && new Date(`${b.slot.slot_date}T${b.end_time}`).getTime() > Date.now()

/** player-my-bookings: current/previous tabs, QR, pay now, cancel. */
export default function MyBookings() {
  const toast = useToast()
  const q = useAsync(() => listMyBookings(), [])
  const [tab, setTab] = useState('cur')
  const [qr, setQr] = useState(null)
  const [cancelling, setCancelling] = useState(null)
  const [busy, setBusy] = useState(false)

  const doCancel = async () => {
    setBusy(true)
    try {
      const updated = await cancelBooking(cancelling.booking_id)
      q.setData((rows) => rows.map((r) => (r.booking_id === updated.booking_id ? updated : r)))
      toast(`Booking ${updated.qr_code} cancelled. The slot is available again.`)
      setCancelling(null)
    } catch (ex) {
      toast(ex.message, 'err')
    } finally { setBusy(false) }
  }

  return (
    <AppLayout title="My bookings" description="Your current and previous bookings, QR codes and cancellations."
      actions={<Button to="/player/courts" icon="plus">Book a court</Button>}>
      <AsyncContent state={q} loading={<SkeletonPage rows={4} />} errorTitle="Can’t load your bookings"
        reassurance="Your bookings haven’t changed."
        isEmpty={(d) => !d.length}
        empty={<EmptyState icon="ticket" title="No bookings yet" action={<Button to="/player/courts">Find a court</Button>}>
          When you book a court, it shows up here with its QR code.
        </EmptyState>}>
        {(rows) => {
          const current = rows.filter(isCurrent)
          const previous = rows.filter((b) => !isCurrent(b)).reverse()
          const list = tab === 'cur' ? current : previous
          return <>
            <Tabs idPrefix="bk" label="Booking period" value={tab} onChange={setTab}
              tabs={[{ id: 'cur', label: 'Current', count: current.length }, { id: 'prev', label: 'Previous', count: previous.length }]} />
            <TabPanel idPrefix="bk" value={tab}>
              {!list.length ? (
                <EmptyState icon="ticket" title={tab === 'cur' ? 'No upcoming bookings' : 'No previous bookings'}
                  action={tab === 'cur' && <Button to="/player/courts">Find a court</Button>}>
                  {tab === 'cur' ? 'Bookings you make will show up here.' : 'Past, cancelled and expired bookings show up here.'}
                </EmptyState>
              ) : (
                <div className="stack-12">
                  {list.map((b) => (
                    <BookingRow key={b.booking_id} b={b} current={tab === 'cur'} onQr={() => setQr(b)} onCancel={() => setCancelling(b)} />
                  ))}
                </div>
              )}
            </TabPanel>
          </>
        }}
      </AsyncContent>

      <Modal open={!!qr} title={qr?.qr_code ?? ''} onClose={() => setQr(null)}
        footer={<>
          <Button variant="sec" to={qr ? `/player/bookings/${qr.booking_id}/confirmed` : '#'}>Booking details</Button>
          <Button onClick={() => setQr(null)}>Close</Button>
        </>}>
        {qr && <div className="qr-modal">
          <QrCode value={qr.qr_code} size={200} caption={null} />
          <p className="muted small">{qr.court.court_name} · {qr.facility.name} · {fmtBookingWhen(qr)}</p>
          <p className="hint">Show this code at the facility to check in.</p>
        </div>}
      </Modal>

      <ConfirmDialog open={!!cancelling} danger busy={busy} title={`Cancel booking ${cancelling?.qr_code ?? ''}?`}
        confirmLabel="Cancel booking" cancelLabel="Keep booking" onCancel={() => setCancelling(null)} onConfirm={doCancel}>
        {cancelling && `${cancelling.court.court_name} · ${fmtBookingWhen(cancelling)}\n\nThe slot will be released and the facility will be notified. This can’t be undone. Refunds aren’t automatic; contact the facility about payment.`}
      </ConfirmDialog>
    </AppLayout>
  )
}

function BookingRow({ b, current, onQr, onCancel }) {
  const pending = current && b.status === 'PENDING'
  return (
    <article className="card booking-row">
      <div className="grow min0">
        <div className="row-wrap gap-8"><b className="md">{b.court.court_name}</b><StatusBadge kind="booking" status={b.status} /></div>
        <p className="muted small mt-2">{b.facility.name} · {fmtBookingWhen(b)}</p>
        <p className="xsmall mt-2">Ref {b.qr_code} · {peso(b.total_fee)}</p>
        {pending && <PayDeadline deadline={b.payment_deadline} />}
      </div>
      <div className="row-wrap">
        {b.status === 'CONFIRMED' && <Button variant="sec" size="sm" icon="qr" onClick={onQr}>Show QR</Button>}
        {pending && <Button size="sm" to={`/player/checkout/${b.booking_id}`}>View booking</Button>}
        {current && <Button variant="link" size="sm" className="danger-text" onClick={onCancel}>Cancel</Button>}
      </div>
    </article>
  )
}

function PayDeadline({ deadline }) {
  const secs = useCountdown(deadline)
  return <p className="hint warn-text">{secs > 0 ? <>Must be paid or confirmed within <b className="tabular">{fmtCountdown(secs)}</b> or the slot is released.</> : 'Time ran out. Refresh to see the update.'}</p>
}
