import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { STATUS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { listMyFacilities } from '../../services/facilityService'
import { blockSlot, getFacilitySchedule, unblockSlot } from '../../services/scheduleService'
import { addDays, fmtDate, fmtSlot, fmtTime, isoDate, parseDate } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import { StatusBadge } from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import { ConfirmDialog } from '../../components/Modal'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import { SlotLegend } from '../../components/SlotGrid'
import { useToast } from '../../components/Toast'

const DAYS = 7
const REASONS = ['Maintenance', 'Private event']
const CLS = { AVAILABLE: 's-av', PENDING: 's-pe', BOOKED: 's-bo', BLOCKED: 's-bl' }
const shortTime = (t) => fmtTime(t).replace(':00', '')

/** facility-schedule: every court's slots for a day; block / unblock; see who booked. */
export default function Schedule() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const today = isoDate()
  const date = params.get('date') && params.get('date') >= today ? params.get('date') : today
  const facQ = useAsync(() => listMyFacilities(), [])
  const facId = Number(params.get('facility')) || facQ.data?.[0]?.facility_id
  const schedQ = useAsync(() => (facId ? getFacilitySchedule(facId, date) : Promise.resolve([])), [facId, date])
  const [selId, setSelId] = useState(null)
  const [reason, setReason] = useState(REASONS[0])
  const [ask, setAsk] = useState(null) // 'block' | 'unblock'
  const [busy, setBusy] = useState(false)

  useEffect(() => setSelId(null), [facId, date])
  const setParam = (k, v) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p, { replace: true }) }

  const courts = schedQ.data ?? []
  const selCourt = courts.find((c) => c.slots.some((s) => s.slot_id === selId))
  const sel = selCourt?.slots.find((s) => s.slot_id === selId)
  const started = sel && new Date(`${sel.slot_date}T${sel.start_time}`).getTime() <= Date.now()

  const apply = async () => {
    setBusy(true)
    try {
      const updated = ask === 'block' ? await blockSlot(sel.slot_id, reason) : await unblockSlot(sel.slot_id)
      schedQ.setData((cs) => cs.map((c) => ({ ...c, slots: c.slots.map((s) => (s.slot_id === updated.slot_id ? updated : s)) })))
      toast(ask === 'block' ? 'Slot blocked.' : 'Slot unblocked and available again.')
    } catch (ex) {
      toast(ex.message, 'err')
      schedQ.reload()
    } finally { setBusy(false); setAsk(null) }
  }

  // Columns: every start time used by any court that day.
  const times = [...new Set(courts.flatMap((c) => c.slots.map((s) => s.start_time)))].sort()

  return (
    <AppLayout title="Schedule" description="See every court’s slots by day, and block or unblock slots for maintenance or private events.">
      <AsyncContent state={facQ} loading={<SkeletonPage kind="table" />} errorTitle="Can’t load the schedule" reassurance="No slots were changed."
        isEmpty={(d) => !d.length}
        empty={<EmptyState icon="building" title="No facilities yet" action={<Button to="/facility/facilities">Register a facility</Button>}>Register a facility and add courts to see their schedule.</EmptyState>}>
        {(facilities) => <>
          <div className="toolbar">
            <Select id="sc-fac" label="Facility" value={facId} onChange={(e) => setParam('facility', e.target.value)}
              options={facilities.map((f) => ({ value: f.facility_id, label: f.name }))} />
            <div className="date-chips grow-2" role="group" aria-label="Date">
              {Array.from({ length: DAYS }, (_, i) => addDays(today, i)).map((d, i) => (
                <button key={d} type="button" className={'chip' + (d === date ? ' on' : '')} aria-pressed={d === date} onClick={() => setParam('date', d)}>
                  {i === 0 ? 'Today' : parseDate(d).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          </div>
          <SlotLegend withSelected />

          <div className="split align-start mt-16">
            <div className="split-main min0">
              <AsyncContent state={schedQ} loading={<SkeletonPage kind="table" />} errorTitle="Can’t load the schedule" reassurance="No slots were changed."
                isEmpty={() => !courts.length || !times.length}
                empty={<EmptyState icon="calendar" title={courts.length ? 'No slots for this day' : 'No courts at this facility'}
                  action={<Button variant="sec" to={courts.length ? `/facility/hours?court=${courts[0].court_id}` : '/facility/courts'}>{courts.length ? 'Change hours' : 'Add a court'}</Button>}>
                  {courts.length ? 'The courts are closed on the selected day. Change their hours to add slots.' : 'Add a court to start taking bookings.'}
                </EmptyState>}>
                {() => (
                  <div className="tblw" role="region" aria-label={`Slots on ${fmtDate(date)}`} tabIndex={0}>
                    <table className="tbl sched">
                      <caption className="sr-only">Slots for each court on {fmtDate(date)}</caption>
                      <thead><tr><th scope="col">Court</th>{times.map((t) => <th key={t} scope="col">{shortTime(t)}</th>)}</tr></thead>
                      <tbody>
                        {courts.map((c) => (
                          <tr key={c.court_id}>
                            <th scope="row">{c.court_name}</th>
                            {times.map((t) => {
                              const s = c.slots.find((x) => x.start_time === t)
                              if (!s) return <td key={t}><span className="muted" aria-hidden="true">—</span><span className="sr-only">No slot</span></td>
                              const on = s.slot_id === selId
                              const label = STATUS.slot[s.status].label
                              return (
                                <td key={t}>
                                  <button type="button" className={'slot slot-cell ' + (on ? 's-sel' : CLS[s.status])} aria-pressed={on}
                                    aria-label={`${c.court_name}, ${fmtTime(s.start_time)}, ${label}`} onClick={() => setSelId(on ? null : s.slot_id)}>
                                    {on ? 'Selected' : label}
                                  </button>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </AsyncContent>
            </div>

            <aside className="split-side">
              <Card aria-live="polite">
                {!sel ? <>
                  <h2>Select a slot</h2>
                  <p className="muted small mt-8">Click any slot to see who booked it, or to block an Available slot for maintenance or a private event.</p>
                </> : <>
                  <StatusBadge kind="slot" status={sel.status} />
                  <h2 className="mt-8">{selCourt.court_name}</h2>
                  <p className="muted small">{fmtSlot(sel.slot_date, sel.start_time, sel.end_time)}</p>
                  {sel.status === 'AVAILABLE' && (started
                    ? <p className="hint">This slot has already started, so it can’t be blocked.</p>
                    : <div className="stack-12 mt-12">
                        <Select id="sc-reason" label="Reason for blocking" options={REASONS} value={reason} onChange={(e) => setReason(e.target.value)} />
                        <Button icon="ban" onClick={() => setAsk('block')}>Block this slot</Button>
                      </div>)}
                  {sel.status === 'BLOCKED' && <>
                    <p className="small mt-12">Reason: <b>{sel.block_reason ?? 'Maintenance'}</b></p>
                    <Button variant="sec" className="mt-12" onClick={() => setAsk('unblock')}>Unblock slot</Button>
                  </>}
                  {(sel.status === 'BOOKED' || sel.status === 'PENDING') && sel.booking && <>
                    <p className="small mt-12">{sel.status === 'PENDING' ? 'Held for' : 'Booked by'} <b>{sel.booking.player?.full_name}</b><br />Ref {sel.booking.qr_code}</p>
                    {sel.status === 'PENDING' && <p className="hint">Waiting for payment. It’s released automatically if unpaid.</p>}
                    <p className="hint">Blocked and booked slots can’t be booked by players.</p>
                    <Button variant="sec" size="sm" className="mt-8" to={`/facility/bookings?q=${sel.booking.qr_code}&period=all`}>Open booking record</Button>
                  </>}
                </>}
              </Card>
            </aside>
          </div>
        </>}
      </AsyncContent>

      <ConfirmDialog open={!!ask} busy={busy} title={ask === 'block' ? 'Block this slot?' : 'Unblock this slot?'}
        confirmLabel={ask === 'block' ? 'Block slot' : 'Unblock'} onCancel={() => setAsk(null)} onConfirm={apply}>
        {sel && `${selCourt.court_name}\n${fmtSlot(sel.slot_date, sel.start_time, sel.end_time)}\n${ask === 'block'
          ? `Reason: ${reason}\n\nPlayers won’t be able to book it until you unblock it.`
          : '\nIt will become Available for players to book.'}`}
      </ConfirmDialog>
    </AppLayout>
  )
}
