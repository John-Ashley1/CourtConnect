import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { listMyCourts, saveCourtHours } from '../../services/courtService'
import { fmtTime } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Input from '../../components/Input'
import { ConfirmDialog } from '../../components/Modal'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ORDER = [1, 2, 3, 4, 5, 6, 0] // Monday first
// Opening/closing choices in minutes from midnight: 5:00 AM … 11:30 PM in 30-minute steps.
const TIMES = Array.from({ length: 38 }, (_, i) => 300 + i * 30)
const DURATIONS = [{ value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }, { value: '90', label: '1 hour 30 minutes' }, { value: '120', label: '2 hours' }]
/** 450 → '07:30:00' */
const t = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
/** '07:30:00' → 450 */
const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
const fmtMin = (m) => fmtTime(t(m))
/** The choices, plus a saved time that isn't on the 30-minute grid (so it still shows correctly). */
const timeOptions = (current) => (TIMES.includes(current) ? TIMES : [...TIMES, current].sort((a, b) => a - b))

/** facility-hours-slots: per-court weekly hours, slot length, payment limit, live slot calculation. */
export default function HoursSlots() {
  const [params, setParams] = useSearchParams()
  const q = useAsync(() => listMyCourts(), [])
  const courtId = Number(params.get('court'))

  return (
    <AppLayout title="Hours & slots" description="Set when each court is open and how long each bookable slot is. Slots are generated from these settings.">
      <AsyncContent state={q} loading={<SkeletonPage kind="table" rows={7} />} errorTitle="Can’t load court hours"
        reassurance="Nothing was changed."
        isEmpty={(d) => !d.length}
        empty={<EmptyState icon="clock" title="Add a court first" action={<Button to="/facility/courts">Add a court</Button>}>
          Time slots are generated per court. Add a court to set its hours.
        </EmptyState>}>
        {(courts) => {
          const court = courts.find((c) => c.court_id === courtId) ?? courts[0]
          return (
            <HoursForm key={court.court_id} court={court} courts={courts}
              onPick={(id) => setParams({ court: id }, { replace: true })}
              onSaved={(c) => q.setData((cs) => cs.map((x) => (x.court_id === c.court_id ? c : x)))} />
          )
        }}
      </AsyncContent>
    </AppLayout>
  )
}

function HoursForm({ court, courts, onPick, onSaved }) {
  const toast = useToast()
  const [dur, setDur] = useState(String(court.slot_minutes))
  const [lim, setLim] = useState(String(court.payment_hold_minutes ?? 15))
  const [limErr, setLimErr] = useState('')
  const [days, setDays] = useState(() => Object.fromEntries((court.operating_hours ?? []).map((d) => [d.day_of_week, {
    open: d.is_open, from: toMin(d.open_time), to: toMin(d.close_time),
  }])))
  const [ask, setAsk] = useState(false)
  const [busy, setBusy] = useState(false)

  const upd = (dow, k, v) => setDays({ ...days, [dow]: { ...days[dow], [k]: v } })
  const len = Number(dur)
  let weekly = 0, openDays = 0, leftover = 0
  const rows = ORDER.map((dow) => {
    const d = days[dow] ?? { open: false, from: 360, to: 1320 }
    const span = d.to - d.from
    const bad = d.open && span <= 0
    const n = d.open && !bad ? Math.floor(span / len) : 0
    if (d.open && !bad) { weekly += n; openDays++; leftover = Math.max(leftover, span % len) }
    return { dow, ...d, bad, n }
  })
  const first = rows.find((r) => r.open && !r.bad)
  const preview = []
  if (first) for (let m = first.from; m + len <= first.to; m += len) preview.push(`${fmtMin(m)}–${fmtMin(m + len)}`)

  const save = () => {
    const ok = Number(lim) >= 5 && Number(lim) <= 60 && Number.isInteger(Number(lim))
    setLimErr(ok ? '' : 'Enter 5 to 60 minutes.')
    if (!ok || rows.some((r) => r.bad)) { toast('Fix the highlighted fields before saving.', 'err'); return }
    setAsk(true)
  }
  const doSave = async () => {
    setBusy(true)
    try {
      const saved = await saveCourtHours(court.court_id, {
        slot_minutes: len, payment_hold_minutes: Number(lim),
        operating_hours: rows.map((r) => ({ day_of_week: r.dow, is_open: r.open, open_time: t(r.from), close_time: t(r.to) })),
      })
      onSaved(saved)
      toast('Hours and slots saved. New slots are ready for booking.')
    } catch (ex) {
      if (ex.fieldErrors?.lim) setLimErr(ex.fieldErrors.lim)
      toast(ex.offline ? 'The server didn’t respond. Nothing was changed.' : ex.message, 'err')
    } finally { setBusy(false); setAsk(false) }
  }

  return (
    <div className="split align-start">
      <Card className="split-main">
        <div className="form-grid">
          <Select id="hs-court" label="Court" value={court.court_id} onChange={(e) => onPick(e.target.value)}
            options={courts.map((c) => ({ value: c.court_id, label: `${c.facility.name} · ${c.court_name}` }))} />
          <Select id="hs-dur" label="Slot length" options={DURATIONS} value={dur} onChange={(e) => setDur(e.target.value)} />
          <Input id="hs-lim" label="Payment time limit (minutes)" type="number" min={5} max={60} inputMode="numeric"
            value={lim} onChange={(e) => { setLim(e.target.value); setLimErr('') }} error={limErr}
            hint="Unpaid Pending bookings are released after this time." />
        </div>
        <h3 className="h-sm mt-20 mb-12">Operating hours</h3>
        <div className="tblw" role="region" aria-label="Operating hours" tabIndex={0}>
          <table className="tbl tbl-tight">
            <thead><tr><th scope="col">Day</th><th scope="col">Open</th><th scope="col">Opens at</th><th scope="col">Closes at</th><th scope="col" className="num">Slots</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const name = DAY_NAMES[r.dow]
                return (
                  <tr key={r.dow}>
                    <th scope="row">{name}</th>
                    <td><input type="checkbox" className="cb" aria-label={`Open on ${name}`} checked={r.open} onChange={(e) => upd(r.dow, 'open', e.target.checked)} /></td>
                    <td><select className="inp" aria-label={`${name} opening time`} value={r.from} disabled={!r.open} onChange={(e) => upd(r.dow, 'from', Number(e.target.value))}>
                      {timeOptions(r.from).map((m) => <option key={m} value={m}>{fmtMin(m)}</option>)}</select></td>
                    <td>
                      <select className={'inp' + (r.bad ? ' bad' : '')} aria-label={`${name} closing time`} aria-invalid={r.bad}
                        aria-describedby={r.bad ? `hs-bad-${r.dow}` : undefined} value={r.to} disabled={!r.open} onChange={(e) => upd(r.dow, 'to', Number(e.target.value))}>
                        {timeOptions(r.to).map((m) => <option key={m} value={m}>{fmtMin(m)}</option>)}</select>
                      {r.bad && <p className="ferr" id={`hs-bad-${r.dow}`}>Closing must be after opening.</p>}
                    </td>
                    <td className="num"><b>{!r.open ? 'Closed' : r.bad ? '—' : r.n}</b></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="row-wrap mt-16">
          <Button onClick={save}>Save hours and slots</Button>
          <Button variant="sec" to={`/facility/courts?facility=${court.facility_id}`}>Back to courts</Button>
        </div>
      </Card>

      <aside className="split-side">
        <Card title="Generated slots" aria-live="polite">
          <div className="kpi-grid kpi-2 mt-12">
            <div className="kpi"><span>Per week</span><b>{weekly}</b></div>
            <div className="kpi"><span>Open days</span><b>{openDays}</b></div>
          </div>
          <p className="hint">Slots per day = (closing − opening) ÷ slot length, rounded down.</p>
          {leftover > 0 && <p className="hint warn-text">The last {leftover} minutes of some days are too short for a full slot and won’t be bookable.</p>}
        </Card>
        <Card title={`Preview · ${first ? DAY_NAMES[first.dow] : 'no open day'}`}>
          <div className="chips mt-12">
            {preview.slice(0, 24).map((p) => <Badge key={p} tone="ok">{p}</Badge>)}
            {preview.length > 24 && <span className="muted xsmall">+{preview.length - 24} more</span>}
            {!preview.length && <p className="muted small">Open at least one day to see its slots.</p>}
          </div>
        </Card>
      </aside>

      <ConfirmDialog open={ask} busy={busy} title="Save new hours and slots?" confirmLabel="Save"
        onCancel={() => setAsk(false)} onConfirm={doSave}>
        {`${weekly} slots per week will be generated from these hours for ${court.court_name}. Slots that are already Pending, Booked or Blocked keep their status.`}
      </ConfirmDialog>
    </div>
  )
}
