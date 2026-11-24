import { STATUS } from '../constants/status'
import { fmtTime } from '../utils/format'

const CLS = { AVAILABLE: 's-av', PENDING: 's-pe', BOOKED: 's-bo', BLOCKED: 's-bl' }

/**
 * Grid of time slots (TIME_SLOT rows) with their status.
 *   mode 'select' (player): only Available slots are clickable; selected ones turn green.
 *   mode 'manage' (facility admin): every slot is clickable (e.g. to block/unblock or see the booking).
 *   selected: array of slot_id · onToggle(slot)
 *   label: accessible group name, e.g. "Slots for Sat, Nov 21"
 */
export default function SlotGrid({ slots, selected = [], onToggle, mode = 'select', label }) {
  return (
    <div className="slots" role="group" aria-label={label}>
      {slots.map((s) => {
        const isSel = selected.includes(s.slot_id)
        const status = STATUS.slot[s.status]?.label ?? s.status
        const clickable = mode === 'manage' || s.status === 'AVAILABLE'
        const cls = 'slot ' + (isSel ? 's-sel' : CLS[s.status])
        const text = <>{fmtTime(s.start_time)}<small>{isSel ? 'Selected' : status}</small></>
        if (!onToggle) return <div key={s.slot_id} className={cls}>{text}</div>
        return (
          <button key={s.slot_id} type="button" className={cls} disabled={!clickable}
            aria-pressed={mode === 'select' ? isSel : undefined}
            aria-label={`${fmtTime(s.start_time)} to ${fmtTime(s.end_time)}, ${isSel ? 'selected' : status.toLowerCase()}`}
            onClick={() => onToggle(s)}>
            {text}
          </button>
        )
      })}
    </div>
  )
}

/** Colour key for the slot grid. */
export function SlotLegend({ withSelected = true }) {
  const items = [
    ['s-av', 'Available'], withSelected && ['s-sel', 'Selected'], ['s-pe', 'Pending payment'], ['s-bo', 'Booked'], ['s-bl', 'Blocked'],
  ].filter(Boolean)
  return (
    <div className="legend">
      {items.map(([c, l]) => <span key={c}><i className={'sw ' + c} aria-hidden="true" />{l}</span>)}
    </div>
  )
}
