import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { useCountdown } from '../../hooks/useCountdown'
import { cancelBooking, getBooking } from '../../services/bookingService'
import { PAYMENT_METHODS, startPayment } from '../../services/paymentService'
import { fmtCountdown, fmtDateLong, fmtTime, fmtTimeRange, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'
import { ConfirmDialog } from '../../components/Modal'
import Placeholder from '../../components/Placeholder'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

/** player-checkout: 15-minute hold countdown, payment method, PayMongo (placeholder), cancel. */
export default function Checkout() {
  const { bookingId } = useParams()
  const q = useAsync(() => getBooking(bookingId), [bookingId])
  return (
    <AppLayout title="Review and pay" description="Check the details and pay the booking fee to confirm your slot.">
      <AsyncContent state={q} loading={<SkeletonPage kind="cards" rows={2} />} errorTitle="Can’t load this booking"
        reassurance="If you already started paying, you haven’t been charged twice.">
        {(b) => <CheckoutBody key={b.booking_id} initial={b} />}
      </AsyncContent>
    </AppLayout>
  )
}

function CheckoutBody({ initial }) {
  const toast = useToast()
  const [b, setB] = useState(initial)
  // hold → waiting (at PayMongo) → paid | failed (back to hold rules); also expired / cancelled
  const [phase, setPhase] = useState(initial.status === 'PENDING' ? 'hold' : null)
  const [method, setMethod] = useState(initial.payment?.method ?? '')
  const [methodErr, setMethodErr] = useState('')
  const [ask, setAsk] = useState(null) // 'pay' | 'cancel'
  const [busy, setBusy] = useState(false)
  const secs = useCountdown(b.status === 'PENDING' ? b.payment_deadline : null)
  const active = phase === 'hold' || phase === 'waiting' || phase === 'failed'

  // Hold ran out → the server expires it; reflect that here.
  useEffect(() => {
    if (active && secs === 0) {
      setPhase('expired')
      setB((x) => ({ ...x, status: 'EXPIRED' }))
      getBooking(b.booking_id).then(setB).catch(() => {})
    }
  }, [secs, active]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === null) {
    // Opened a booking that isn't waiting for payment any more.
    return b.status === 'CONFIRMED'
      ? <EmptyState icon="check" title="This booking is already paid" action={<Button to={`/player/bookings/${b.booking_id}/confirmed`} icon="qr">View QR confirmation</Button>}>
          Booking {b.qr_code} is confirmed. Show its QR code at the facility.
        </EmptyState>
      : <EmptyState icon="ticket" title="No booking to pay for" action={<Button to="/player/bookings">Go to my bookings</Button>}>
          Booking {b.qr_code} was {b.status === 'EXPIRED' ? 'not paid in time and has expired' : 'cancelled'}. Pick a slot again to book.
        </EmptyState>
  }

  const pay = () => {
    if (!method) { setMethodErr('Choose a payment method to continue.'); return }
    setAsk('pay')
  }
  const goPay = async () => {
    setBusy(true)
    try {
      const r = await startPayment(b.booking_id, method)
      setAsk(null)
      if (r.checkout_url) { window.location.assign(r.checkout_url); return }
      setPhase('waiting')
    } catch (ex) {
      setAsk(null)
      toast(ex.offline ? 'PayMongo isn’t responding. You haven’t been charged. Try again.' : ex.message, 'err')
    } finally { setBusy(false) }
  }
  const doCancel = async () => {
    setBusy(true)
    try {
      setB(await cancelBooking(b.booking_id))
      setPhase('cancelled')
      toast('Booking cancelled. The slot is available again.')
    } catch (ex) { toast(ex.message, 'err') } finally { setBusy(false); setAsk(null) }
  }

  const shownStatus = { paid: 'CONFIRMED', cancelled: 'CANCELLED', expired: 'EXPIRED' }[phase] ?? 'PENDING'
  const canAct = phase === 'hold' || phase === 'failed'
  const time = fmtTimeRange(b.slot.start_time, b.end_time)

  return (
    <div className="split">
      <div className="split-main stack">
        {active && (
          <div className="banner bn-warn" role="timer" aria-live="off">
            <Icon name="clock" />
            <span>This slot is held for you as <b>Pending</b>. Complete payment within{' '}
              <b className="tabular lg">{fmtCountdown(secs)}</b> or it will be released.</span>
          </div>
        )}
        {phase === 'expired' && (
          <div className="banner bn-err" role="alert"><Icon name="clock" />
            <span>Payment time ran out. Booking {b.qr_code} is now <b>Expired</b> and the slot was released for others.</span>
            <Button variant="sec" size="sm" to={`/player/courts/${b.court.court_id}?date=${b.slot.slot_date}`}>Pick a slot again</Button>
          </div>
        )}
        {phase === 'failed' && (
          <div className="banner bn-err" role="alert"><Icon name="alert" />
            <span>Payment didn’t go through. Your booking is still <b>Pending</b> and you weren’t charged. You can try again before the timer runs out.</span>
          </div>
        )}
        {phase === 'paid' && (
          <div className="banner bn-ok" role="status"><Icon name="check" />
            <span>PayMongo confirmed your payment. Booking {b.qr_code} is <b>Confirmed</b>.</span>
            <Button size="sm" icon="qr" to={`/player/bookings/${b.booking_id}/confirmed`}>View QR confirmation</Button>
          </div>
        )}
        {phase === 'cancelled' && (
          <div className="banner bn-info" role="status"><Icon name="info" />
            <span>Booking {b.qr_code} was cancelled and the slot is available again.</span>
            <Button variant="sec" size="sm" to="/player/courts">Find another court</Button>
          </div>
        )}

        <Card title="Payment method" subtitle="Paid securely through PayMongo. CourtConnect never stores your card details.">
          <fieldset className="pay-methods" aria-describedby={methodErr ? 'pm-err' : undefined} disabled={!canAct}>
            <legend className="sr-only">Payment method</legend>
            {PAYMENT_METHODS.map((m) => (
              <label key={m} className={'chip pay-opt' + (method === m ? ' on' : '')}>
                <input type="radio" name="pay-method" className="sr-only" value={m} checked={method === m}
                  onChange={() => { setMethod(m); setMethodErr('') }} />
                {m}
              </label>
            ))}
          </fieldset>
          {methodErr && <p className="ferr" id="pm-err" role="alert">{methodErr}</p>}

          {phase === 'waiting' && (
            <Placeholder icon="card" title="Waiting for PayMongo to confirm your payment…" style={{ marginTop: 16 }}>
              PayMongo checkout connects in a later increment. In the live app you finish paying on PayMongo’s page.
            </Placeholder>
          )}

          <div className="row-wrap mt-16">
            <Button onClick={pay} disabled={!canAct}>Pay {peso(b.total_fee)} with PayMongo</Button>
            <Button variant="sec" onClick={() => setAsk('cancel')} disabled={!canAct}>Cancel and release slot</Button>
          </div>
        </Card>
      </div>

      <aside className="split-side">
        <Card title="Booking summary">
          <dl className="sum">
            <div><dt>Booking ref</dt><dd>{b.qr_code}</dd></div>
            <div><dt>Facility</dt><dd>{b.facility.name}</dd></div>
            <div><dt>Court</dt><dd>{b.court.court_name}</dd></div>
            <div><dt>Date</dt><dd>{fmtDateLong(b.slot.slot_date)}</dd></div>
            <div><dt>Time</dt><dd>{time}</dd></div>
            <div><dt>Status</dt><dd><StatusBadge kind="booking" status={shownStatus} /></dd></div>
          </dl>
          <dl className="sum sum-split">
            <div><dt>Court rate</dt><dd className="normal">{peso(b.court.rental_rate)} / hr</dd></div>
            <div><dt>Duration</dt><dd className="normal">{b.hours} hr</dd></div>
            <div className="sum-total"><dt>Total</dt><dd>{peso(b.total_fee)}</dd></div>
          </dl>
          <p className="hint">Booking fee = court rate × number of hours.</p>
        </Card>
      </aside>

      <ConfirmDialog open={ask === 'pay'} title={`Pay ${peso(b.total_fee)} now?`} confirmLabel="Continue to PayMongo" busy={busy}
        onCancel={() => setAsk(null)} onConfirm={goPay}>
        You’ll go to PayMongo to pay with {method}. Your booking is confirmed only after PayMongo verifies the payment.
      </ConfirmDialog>
      <ConfirmDialog open={ask === 'cancel'} danger title="Cancel this booking?" confirmLabel="Cancel booking" cancelLabel="Keep booking" busy={busy}
        onCancel={() => setAsk(null)} onConfirm={doCancel}>
        The {fmtTime(b.slot.start_time)} slot on {fmtDateLong(b.slot.slot_date)} will be released so others can book it. This can’t be undone.
      </ConfirmDialog>
    </div>
  )
}
