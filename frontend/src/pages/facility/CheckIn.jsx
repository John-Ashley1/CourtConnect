import { useState } from 'react'
import { useAuth } from '../../auth'
import { useAsync } from '../../hooks/useAsync'
import { confirmCheckIn, listFacilityBookings, verifyBookingCode } from '../../services/facilityBookingService'
import { fmtBookingWhen, fmtDate, fmtDateTime, fmtTime, isoDate } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import Icon from '../../components/Icon'
import LaterIncrement from '../../components/LaterIncrement'
import Placeholder from '../../components/Placeholder'
import Skeleton from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

const CODE = /^CC-\d{4}-\d{4}$/

/** facility-check-in: verify a booking code (QR content) and confirm the player's check-in. */
export default function CheckIn() {
  const { user } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { booking } | { error, offline }
  const todayQ = useAsync(() => listFacilityBookings({ period: 'today', status: 'CONFIRMED' }), [])

  const verify = async (e) => {
    e?.preventDefault()
    const c = code.trim().toUpperCase()
    setResult(null)
    if (!c) { setErr('Enter the booking code shown under the player’s QR.'); return }
    if (!CODE.test(c)) { setErr('Codes look like CC-2611-0000 (CC, 4 digits, 4 digits).'); return }
    setErr('')
    setBusy(true)
    try {
      setResult({ booking: await verifyBookingCode(c) })
    } catch (ex) {
      setResult({ error: ex.offline ? 'We can’t reach the server to verify codes right now. Don’t admit players on an unverified code. Try again.' : ex.message, offline: ex.offline })
    } finally { setBusy(false) }
  }

  const checkIn = async () => {
    setBusy(true)
    try {
      const b = await confirmCheckIn(result.booking.booking_id)
      setResult({ booking: b })
      todayQ.setData((rows) => rows?.map((r) => (r.booking_id === b.booking_id ? b : r)))
      toast(`Check-in verified for ${b.qr_code}.`)
    } catch (ex) { toast(ex.message, 'err') } finally { setBusy(false) }
  }

  const b = result?.booking
  const notToday = b && b.slot.slot_date !== isoDate()

  if (todayQ.notBuilt) {
    return (
      <AppLayout title="QR check-in" description="Scan or type the player’s booking code to confirm their booking at the court.">
        <LaterIncrement icon="qr" />
      </AppLayout>
    )
  }

  return (
    <AppLayout title="QR check-in" description="Scan or type the player’s booking code to confirm their booking at the court.">
      <div className="split align-start">
        <div className="split-side">
          <Card title="Scan QR code">
            <Placeholder icon="camera" title="Camera scanning comes in a later increment" style={{ marginTop: 12, minHeight: 200 }}>
              Type the booking code printed under the player’s QR code instead.
            </Placeholder>
          </Card>
          <Card title="Today’s confirmed bookings">
            {todayQ.status === 'loading' && <Skeleton height={60} style={{ marginTop: 12 }} />}
            {todayQ.status === 'error' && <p className="muted small mt-8">Can’t load today’s list. Codes can still be verified.</p>}
            {todayQ.status === 'ready' && (!todayQ.data.length
              ? <p className="muted small mt-8">No confirmed bookings at your facilities today.</p>
              : <ul className="plain mt-8">
                  {todayQ.data.map((r) => (
                    <li className="list-row" key={r.booking_id}>
                      <b className="time-col">{fmtTime(r.slot.start_time)}</b>
                      <div className="grow min0"><b className="small">{r.court.court_name}</b><p className="muted xsmall">{r.player?.full_name} · {r.qr_code}</p></div>
                      {r.checked_in_at ? <Badge tone="ok">Checked in</Badge>
                        : <Button variant="link" size="sm" onClick={() => setCode(r.qr_code)} aria-label={`Use code ${r.qr_code}`}>Use code</Button>}
                    </li>
                  ))}
                </ul>)}
          </Card>
        </div>

        <div className="split-main stack">
          <Card as="form" title="Enter booking code" onSubmit={verify} noValidate>
            <label className="lbl mt-12" htmlFor="ci-code">Booking code</label>
            <div className="row-wrap nowrap-row">
              <input id="ci-code" className={'inp mono' + (err ? ' bad' : '')} placeholder="CC-2611-0000" autoComplete="off" autoCapitalize="characters"
                value={code} onChange={(e) => { setCode(e.target.value); setErr('') }} aria-invalid={!!err} aria-describedby={err ? 'ci-err' : undefined} />
              <Button type="submit" busy={busy && !b}>Verify</Button>
            </div>
            {err && <p className="ferr" id="ci-err">{err}</p>}
          </Card>

          {result?.error && <div className="banner bn-err" role="alert"><Icon name={result.offline ? 'offline' : 'alert'} /><span>{result.error}</span>
            {result.offline && <Button variant="sec" size="sm" onClick={verify}>Try again</Button>}</div>}

          {b && b.status !== 'CONFIRMED' && (
            <div className="banner bn-err" role="alert"><Icon name="ban" />
              <span>Booking {b.qr_code} is <b>{b.status === 'PENDING' ? 'not paid yet' : b.status.toLowerCase()}</b>. Don’t admit this player for that booking.</span>
            </div>
          )}

          {b && b.status === 'CONFIRMED' && (
            <Card role="status">
              <div className="row-wrap gap-8">
                <span className="row-icon" aria-hidden="true"><Icon name="check" size={24} /></span>
                <div><b className="md">Valid booking</b><p className="muted small">Paid and confirmed</p></div>
              </div>
              <dl className="facts-grid">
                <div><dt>Player</dt><dd>{b.player?.full_name}</dd></div>
                <div><dt>Ref</dt><dd>{b.qr_code}</dd></div>
                <div><dt>Court</dt><dd>{b.court.court_name} · {b.facility.name}</dd></div>
                <div><dt>Time</dt><dd>{fmtBookingWhen(b)}</dd></div>
              </dl>
              {notToday && !b.checked_in_at && (
                <div className="banner bn-warn mt-16"><Icon name="alert" /><span>This booking is for <b>{fmtDate(b.slot.slot_date)}</b>, not today. Check the date with the player.</span></div>
              )}
              {b.checked_in_at
                ? <p className="badge b-ok req-note mt-16">Checked in {fmtDateTime(b.checked_in_at)} · verified by {user.fullName}</p>
                : <Button className="mt-16" busy={busy} onClick={checkIn}>Confirm check-in</Button>}
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
