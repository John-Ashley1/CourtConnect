import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STATUS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { listMyFacilities } from '../../services/facilityService'
import { cancelFacilityBooking, confirmFacilityBooking, listFacilityBookings } from '../../services/facilityBookingService'
import { fmtBookingWhen, fmtDateTime, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Input from '../../components/Input'
import { ConfirmDialog } from '../../components/Modal'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import Table from '../../components/Table'
import { useToast } from '../../components/Toast'

const PAGE = 50
const PERIODS = [
  { value: 'upcoming', label: 'Upcoming' }, { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' }, { value: 'month', label: 'Last 30 days' }, { value: 'all', label: 'All dates' },
]
const STATUSES = Object.entries(STATUS.booking).map(([value, s]) => ({ value, label: s.label }))
const isUpcoming = (b) => new Date(`${b.slot.slot_date}T${b.end_time}`).getTime() > Date.now()

/** facility-bookings: search and filter booking records; cancel upcoming bookings. ?q= &period= prefill. */
export default function BookingRecords() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState(params.get('q') ?? '')
  const q = params.get('q') ?? ''
  const status = params.get('status') ?? ''
  const facilityId = params.get('facility') ?? ''
  const period = PERIODS.some((p) => p.value === params.get('period')) ? params.get('period') : 'upcoming'
  const [shown, setShown] = useState(PAGE)
  const [cancelling, setCancelling] = useState(null)
  const [confirming, setConfirming] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }) }
  // Search as you type, after a short pause.
  useEffect(() => { const t = setTimeout(() => { if (text !== q) set('q', text.trim()) }, 300); return () => clearTimeout(t) }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setShown(PAGE), [q, status, facilityId, period])

  const facQ = useAsync(() => listMyFacilities(), [])
  const listQ = useAsync(() => listFacilityBookings({ q, status, facilityId, period }), [q, status, facilityId, period])

  const doConfirm = async () => {
    setBusy(true)
    try {
      const b = await confirmFacilityBooking(confirming.booking_id)
      listQ.setData((rows) => rows.map((r) => (r.booking_id === b.booking_id ? b : r)))
      toast(`${b.qr_code} confirmed. ${b.player?.full_name ?? 'The player'} was notified.`)
    } catch (ex) { toast(ex.message, 'err'); listQ.reload() } finally { setBusy(false); setConfirming(null) }
  }

  const doCancel = async () => {
    setBusy(true)
    try {
      const b = await cancelFacilityBooking(cancelling.booking_id)
      listQ.setData((rows) => rows.map((r) => (r.booking_id === b.booking_id ? b : r)))
      toast(`${b.qr_code} cancelled. ${b.player?.full_name ?? 'The player'} was notified.`)
    } catch (ex) { toast(ex.message, 'err') } finally { setBusy(false); setCancelling(null) }
  }

  return (
    <AppLayout title="Booking records" description="Review bookings at your facilities and cancel them when needed.">
      {!listQ.notBuilt && (<Card className="mb-16">
        <div className="toolbar mb-0">
          <Input id="bk-q" label="Search" type="search" placeholder="Booking ref or player" value={text} onChange={(e) => setText(e.target.value)} />
          <Select id="bk-st" label="Status" placeholder="All statuses" options={STATUSES} value={status} onChange={(e) => set('status', e.target.value)} />
          <Select id="bk-fac" label="Facility" placeholder="All my facilities" value={facilityId} onChange={(e) => set('facility', e.target.value)}
            options={(facQ.data ?? []).map((f) => ({ value: String(f.facility_id), label: f.name }))} />
          <Select id="bk-period" label="Dates" options={PERIODS} value={period} onChange={(e) => set('period', e.target.value === 'upcoming' ? '' : e.target.value)} />
        </div>
      </Card>)}

      <AsyncContent state={listQ} loading={<SkeletonPage kind="table" rows={5} />} errorTitle="Can’t load booking records"
        reassurance="No bookings were changed."
        isEmpty={(d) => !d.length}
        empty={q || status || facilityId || period !== 'all'
          ? <EmptyState icon="search" title="No bookings match">Try a different search, status or date range.</EmptyState>
          : <EmptyState icon="list" title="No bookings yet">Bookings at your facilities will appear here.</EmptyState>}>
        {(rows) => {
          const paid = rows.filter((b) => b.payment?.status === 'PAID' && b.status !== 'CANCELLED').reduce((a, b) => a + b.total_fee, 0)
          return <>
            <p className="b mb-12" aria-live="polite">{rows.length} {rows.length === 1 ? 'booking' : 'bookings'} · {peso(paid)} paid</p>
            <Table caption="Booking records" rowKey={(b) => b.booking_id} rows={rows.slice(0, shown)} minWidth={880} columns={[
              { key: 'ref', label: 'Ref', render: (b) => <b className="nowrap">{b.qr_code}</b> },
              { key: 'player', label: 'Player', render: (b) => b.player?.full_name ?? '—' },
              { key: 'court', label: 'Court', render: (b) => <>{b.court.court_name}<br /><span className="muted xsmall">{b.facility.name}</span></> },
              { key: 'when', label: 'Date and time', render: (b) => fmtBookingWhen(b) },
              { key: 'fee', label: 'Fee', num: true, render: (b) => peso(b.total_fee) },
              { key: 'pay', label: 'Payment', render: (b) => (b.payment ? <StatusBadge kind="payment" status={b.payment.status} /> : '—') },
              { key: 'st', label: 'Status', render: (b) => <>
                <StatusBadge kind="booking" status={b.status} />
                {b.status === 'PENDING' && <><br /><span className="muted xsmall nowrap">Confirm by {fmtDateTime(b.payment_deadline).split(', ').pop()}</span></>}
              </> },
              { key: 'act', label: <span className="sr-only">Actions</span>, render: (b) => ((b.status === 'CONFIRMED' || b.status === 'PENDING') && isUpcoming(b)
                ? <div className="row-wrap nowrap-row">
                    {b.status === 'PENDING' && <Button variant="link" size="sm" onClick={() => setConfirming(b)} aria-label={`Confirm booking ${b.qr_code}`}>Confirm</Button>}
                    <Button variant="link" size="sm" className="danger-text" onClick={() => setCancelling(b)} aria-label={`Cancel booking ${b.qr_code}`}>Cancel</Button>
                  </div>
                : null) },
            ]} />
            {rows.length > shown && (
              <div className="row-wrap center mt-16">
                <Button variant="sec" onClick={() => setShown((n) => n + PAGE)}>Show {Math.min(PAGE, rows.length - shown)} more</Button>
                <span className="muted small">Showing {shown} of {rows.length}</span>
              </div>
            )}
            <p className="hint mt-16">Confirm a Pending booking once the player has arranged payment with you. Pending bookings that aren’t confirmed by their time limit expire automatically and the slot is released.</p>
          </>
        }}
      </AsyncContent>

      <ConfirmDialog open={!!confirming} busy={busy} title={`Confirm booking ${confirming?.qr_code ?? ''}?`}
        confirmLabel="Confirm booking" cancelLabel="Not yet" onCancel={() => setConfirming(null)} onConfirm={doConfirm}>
        {confirming && `${confirming.player?.full_name} · ${confirming.court.court_name}
${fmtBookingWhen(confirming)}
Fee: ${peso(confirming.total_fee)}

Confirm only after the player has paid or arranged payment with you. The slot becomes Booked and the player is notified.`}
      </ConfirmDialog>

      <ConfirmDialog open={!!cancelling} danger busy={busy} title={`Cancel booking ${cancelling?.qr_code ?? ''}?`}
        confirmLabel="Cancel booking" cancelLabel="Keep booking" onCancel={() => setCancelling(null)} onConfirm={doCancel}>
        {cancelling && `${cancelling.player?.full_name} · ${cancelling.court.court_name}\n${fmtBookingWhen(cancelling)}\n\nThe slot is released and the player gets a notification. Refunds aren’t automatic; handle any refund with the player directly. This can’t be undone.`}
      </ConfirmDialog>
    </AppLayout>
  )
}
