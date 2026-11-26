import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { getCourt, listCourtsByFacility } from '../../services/courtService'
import { listSlots } from '../../services/slotService'
import { holdSlots } from '../../services/bookingService'
import { addDays, areaOf, fmtDate, fmtTime, fmtTimeRange, isoDate, parseDate, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'
import { ConfirmDialog } from '../../components/Modal'
import MapView from '../../components/MapView'
import Placeholder from '../../components/Placeholder'
import { SkeletonPage } from '../../components/Skeleton'
import SlotGrid, { SlotLegend } from '../../components/SlotGrid'
import Tabs, { TabPanel } from '../../components/Tabs'
import { useToast } from '../../components/Toast'

const DAYS = 7
const MAX_HOURS = 4

/** player-court-details: a facility's courts as tabs, date picker, slot grid, fee summary, weather, location. */
export default function CourtDetails() {
  const { courtId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const today = isoDate()
  const date = params.get('date') && params.get('date') >= today ? params.get('date') : today
  const [sel, setSel] = useState([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const courtQ = useAsync(() => getCourt(courtId).then((court) =>
    listCourtsByFacility(court.facility_id).then((courts) => ({ court, courts }))), [courtId])
  const slotsQ = useAsync(() => listSlots(courtId, date), [courtId, date])

  useEffect(() => { setSel([]); setMsg('') }, [courtId, date])

  const facility = courtQ.data?.court.facility
  const court = courtQ.data?.court
  // Hours on the selected date (operating_hours: day_of_week 0 = Sunday).
  const dayHours = court?.operating_hours?.find((h) => h.day_of_week === parseDate(date).getDay())

  const pickCourt = (id) => navigate(`/player/courts/${id}?date=${date}`, { replace: true })
  const pickDate = (d) => { const p = new URLSearchParams(params); p.set('date', d); setParams(p, { replace: true }) }

  // Times earlier today can't be booked.
  const nowTime = new Date().toTimeString().slice(0, 8)
  const allSlots = slotsQ.data ?? []
  const slots = date === today ? allSlots.filter((s) => s.start_time > nowTime) : allSlots
  const hiddenPast = allSlots.length - slots.length

  const toggle = (slot) => {
    setMsg('')
    const at = (id) => slots.findIndex((s) => s.slot_id === id)
    const i = at(slot.slot_id)
    if (sel.includes(slot.slot_id)) {
      if (slot.slot_id === sel[0]) setSel(sel.slice(1))
      else if (slot.slot_id === sel[sel.length - 1]) setSel(sel.slice(0, -1))
      else setSel([slot.slot_id])
      return
    }
    if (!sel.length) { setSel([slot.slot_id]); return }
    const first = at(sel[0]), last = at(sel[sel.length - 1])
    const extendsAfter = i === last + 1 && slots[last].end_time === slot.start_time
    const extendsBefore = i === first - 1 && slot.end_time === slots[first].start_time
    if (!extendsAfter && !extendsBefore) { setSel([slot.slot_id]); return }
    if (sel.length >= MAX_HOURS) { setMsg(`You can book up to ${MAX_HOURS} slots at a time.`); return }
    setSel(extendsAfter ? [...sel, slot.slot_id] : [slot.slot_id, ...sel])
  }

  const picked = slots.filter((s) => sel.includes(s.slot_id))
  const hours = court ? picked.length * (court.slot_minutes / 60) : 0
  const fee = court ? court.rental_rate * hours : 0

  const book = async () => {
    setBusy(true)
    setConfirming(false)
    try {
      const b = await holdSlots({ courtId: court.court_id, slotIds: sel })
      navigate(`/player/checkout/${b.booking_id}`)
    } catch (ex) {
      setBusy(false)
      setMsg(ex.message)
      if (ex.status === 409) { setSel([]); slotsQ.reload() }
      else toast(ex.message, 'err')
    }
  }

  const describe = (courts) => {
    const io = courts.every((c) => c.is_indoor) ? 'Indoor' : courts.every((c) => !c.is_indoor) ? 'Outdoor' : 'Indoor and outdoor'
    const sports = [...new Set(courts.map((c) => c.sport_type.toLowerCase()))]
    return `${io} ${sports.join(' and ')} ${courts.length === 1 ? 'court' : 'courts'} in ${areaOf(facility.address)}. Pick a court, date and time.`
  }

  return (
    <AppLayout title={facility?.name ?? 'Court details'}
      description={courtQ.status === 'ready' ? describe(courtQ.data.courts) : 'Pick a court, date and time.'}
      actions={<Button variant="sec" to={`/player/courts?date=${date}`} icon="chevronLeft">Back to results</Button>}>
      <AsyncContent state={courtQ} loading={<SkeletonPage kind="cards" />} errorTitle="Can’t load this court">
        {({ courts }) => (
          <div className="split">
            <div className="split-main stack">
              <Card>
                <Tabs idPrefix="court" label="Courts at this facility" value={court.court_id} onChange={pickCourt}
                  tabs={courts.map((c) => ({ id: c.court_id, label: c.court_name }))} />
                <TabPanel idPrefix="court" value={court.court_id}>
                <div className="photo-row">
                  {court.photo_url
                    ? <img className="photo" src={court.photo_url} alt={`Photo of ${court.court_name}`} style={{ objectFit: 'cover' }} />
                    : <div className="ph-box photo"><Icon name="camera" size={20} /><span>No photo yet</span></div>}
                </div>
                <div className="facts">
                  <span><b>Sport</b> · {court.sport_type}</span>
                  <span><b>Type</b> · {court.is_indoor ? 'Indoor' : 'Outdoor'}</span>
                  <span><b>Rate</b> · {peso(court.rental_rate)} per hour</span>
                  <span><b>Hours on {fmtDate(date)}</b> · {dayHours?.is_open ? `${fmtTime(dayHours.open_time)} – ${fmtTime(dayHours.close_time)}` : 'Closed'}</span>
                  <span><b>Slot length</b> · {court.slot_minutes % 60 === 0 ? `${court.slot_minutes / 60} hour${court.slot_minutes === 60 ? '' : 's'}` : `${court.slot_minutes} minutes`}</span>
                </div>
                </TabPanel>
              </Card>

              <Card title="Choose a time slot" subtitle={`Pick 1 to ${MAX_HOURS} slots in a row.`} actions={<SlotLegend />}>
                <div className="date-chips" role="group" aria-label="Date">
                  {Array.from({ length: DAYS }, (_, i) => addDays(today, i)).map((d) => {
                    const on = d === date
                    const dt = parseDate(d)
                    return (
                      <button key={d} type="button" className={'chip date-chip' + (on ? ' on' : '')} aria-pressed={on}
                        aria-label={fmtDate(d)} onClick={() => pickDate(d)}>
                        <span className="xsmall">{dt.toLocaleDateString('en-PH', { weekday: 'short' })}</span>
                        <span>{dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-12">
                  <AsyncContent state={slotsQ} loading={<SkeletonPage rows={2} />} errorTitle="Can’t load time slots"
                    reassurance="Nothing has been booked."
                    isEmpty={() => slots.length === 0}
                    empty={<EmptyState compact icon="clock" title={hiddenPast ? 'No more slots today' : 'No slots on this date'}>
                      {hiddenPast ? 'All of today’s times have passed. Pick another date.' : 'This court has no time slots on this date. Pick another date.'}
                    </EmptyState>}>
                    {() => <>
                      <SlotGrid slots={slots} selected={sel} onToggle={toggle} label={`Time slots for ${fmtDate(date)}`} />
                      {hiddenPast > 0 && <p className="hint">Earlier times today have already passed.</p>}
                    </>}
                  </AsyncContent>
                  {msg && <p className="ferr" role="alert">{msg}</p>}
                </div>
              </Card>
            </div>

            <aside className="split-side stack">
              <Card title="Booking summary" aria-live="polite">
                {!picked.length ? (
                  <p className="muted small">Pick an <b>Available</b> slot to see the booking fee.</p>
                ) : <>
                  <dl className="sum">
                    <div><dt>Court</dt><dd>{court.court_name}</dd></div>
                    <div><dt>Date</dt><dd>{fmtDate(date)}</dd></div>
                    <div><dt>Time</dt><dd>{fmtTimeRange(picked[0].start_time, picked[picked.length - 1].end_time)}</dd></div>
                    <div><dt>Rate × hours</dt><dd className="normal">{peso(court.rental_rate)} × {hours} hr</dd></div>
                    <div className="sum-total"><dt>Booking fee</dt><dd>{peso(fee)}</dd></div>
                  </dl>
                  <Button block className="mt-16" busy={busy} onClick={() => setConfirming(true)}>Book {fmtTimeRange(picked[0].start_time, picked[picked.length - 1].end_time)}</Button>
                  <p className="hint">Booking holds the slot as <b>Pending</b> for {court.payment_hold_minutes} minutes until it’s paid or confirmed. Holds that aren’t confirmed in time are released automatically.</p>
                </>}
              </Card>

              <Card title="Weather forecast">
                {court.is_indoor
                  ? <p className="muted small">This is an indoor court, so no forecast is shown.</p>
                  : <Placeholder icon="cloud" title="Forecast loads in a later increment">
                      The OpenWeatherMap forecast for {picked.length ? `${fmtDate(date)}, ${fmtTime(picked[0].start_time)}` : 'the time you pick'} will show here.
                    </Placeholder>}
              </Card>

              <Card title="Location">
                <div className="mt-12">
                  <MapView height={170} markers={[{ id: facility.facility_id, label: facility.name, latitude: facility.latitude, longitude: facility.longitude }]}
                    selectedId={facility.facility_id} label={`Map showing ${facility.name}`} />
                </div>
                <p className="muted small mt-8">{facility.name}, {areaOf(facility.address)}</p>
                <Button variant="sec" size="sm" icon="map" className="mt-12"
                  onClick={() => toast('Directions open in Google Maps in a later increment.')}>Get directions</Button>
              </Card>
            </aside>
          </div>
        )}
      </AsyncContent>
      {court && picked.length > 0 && (
        <ConfirmDialog open={confirming} busy={busy} title={`Book ${court.court_name}?`} confirmLabel={`Book for ${peso(fee)}`} cancelLabel="Go back"
          onCancel={() => setConfirming(false)} onConfirm={book}>
          {`${facility.name}
${fmtDate(date)} · ${fmtTimeRange(picked[0].start_time, picked[picked.length - 1].end_time)}

`
            + `Booking fee: ${peso(court.rental_rate)} × ${hours} hr = ${peso(fee)}

`
            + `The slot is held as Pending for ${court.payment_hold_minutes} minutes. If the booking isn’t paid or confirmed by then, it is released automatically.`}
        </ConfirmDialog>
      )}
    </AppLayout>
  )
}
