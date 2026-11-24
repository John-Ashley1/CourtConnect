import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SPORTS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { DEFAULT_ORIGIN, searchCourts } from '../../services/courtService'
import { addDays, areaOf, fmtDate, isoDate, peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'
import MapView from '../../components/MapView'
import { ConfirmDialog } from '../../components/Modal'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

const DAYS = 7
const DISTANCES = [{ value: '', label: 'Any distance' }, { value: '2', label: 'Within 2 km' }, { value: '5', label: 'Within 5 km' }, { value: '10', label: 'Within 10 km' }]

/** player-find-courts: filter by sport, date, distance; sort; list + map of facilities. */
export default function FindCourts() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const today = isoDate()
  const sport = SPORTS.includes(params.get('sport')) ? params.get('sport') : 'All'
  const date = params.get('date') || today
  const maxKm = params.get('km') || ''
  const sort = params.get('sort') === 'rate' ? 'rate' : 'distance'
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN)
  const [locating, setLocating] = useState(false)
  const [askLocation, setAskLocation] = useState(false)
  const [selFac, setSelFac] = useState(null)

  const set = (k, v) => {
    const p = new URLSearchParams(params)
    if (v && v !== 'All') p.set(k, v); else p.delete(k)
    setParams(p, { replace: true })
  }

  const q = useAsync(() => searchCourts({ sport, date, maxKm: Number(maxKm) || undefined, sort, origin }),
    [sport, date, maxKm, sort, origin.latitude, origin.longitude])

  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = addDays(today, i)
    return { value: d, label: (i === 0 ? 'Today · ' : '') + fmtDate(d) }
  })

  const useMyLocation = () => {
    setAskLocation(false)
    if (!navigator.geolocation) { toast('This browser can’t share its location.', 'err'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setOrigin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, label: 'your current location (approximate)' })
        toast('Location on. Showing distances from where you are.')
      },
      () => { setLocating(false); toast('We couldn’t get your location. Distances are measured from Cebu City.', 'err') },
      { timeout: 10000, maximumAge: 300000 },
    )
  }

  const dirToast = () => toast('Directions open in Google Maps in a later increment.')

  return (
    <AppLayout title="Find courts" description="Search nearby courts by sport, date and distance, then pick one to see open slots.">
      {!q.notBuilt && (<Card className="filters">
        <div className="row-wrap" role="group" aria-label="Sport">
          <b className="small">Sport</b>
          {['All', ...SPORTS].map((s) => (
            <button key={s} type="button" className={'chip' + (sport === s ? ' on' : '')} aria-pressed={sport === s} onClick={() => set('sport', s)}>{s}</button>
          ))}
        </div>
        <div className="toolbar mb-0">
          <Select id="fc-date" label="Date" options={dates} value={date} onChange={(e) => set('date', e.target.value === today ? '' : e.target.value)} />
          <Select id="fc-dist" label="Distance" options={DISTANCES} value={maxKm} onChange={(e) => set('km', e.target.value)} />
          <Select id="fc-sort" label="Sort by" options={[{ value: 'distance', label: 'Nearest first' }, { value: 'rate', label: 'Lowest rate first' }]}
            value={sort} onChange={(e) => set('sort', e.target.value === 'rate' ? 'rate' : '')} />
          <Button variant="sec" icon="pin" busy={locating} onClick={() => setAskLocation(true)}>Use my location</Button>
        </div>
        <p className="hint m-0">
          {origin === DEFAULT_ORIGIN
            ? 'Showing distances from Cebu City. Allow location access to use where you are.'
            : 'Using your current location (approximate). Distances are measured from where you are now.'}
        </p>
      </Card>)}

      <div className="split mt-16">
        <section aria-label="Results" className="split-main stack-12">
          <AsyncContent state={q} loading={<SkeletonPage rows={4} />} errorTitle="Can’t load courts"
            isEmpty={(d) => !d.length}
            empty={<EmptyState icon="search" title="No courts match your filters">Try another sport, a later date, or a wider distance.</EmptyState>}>
            {(courts) => <>
              <p className="b" aria-live="polite">{courts.length} {courts.length === 1 ? 'court' : 'courts'} found · {fmtDate(date)}</p>
              {courts.map((c) => (
                <article key={c.court_id} className="card result">
                  <div className="ph-box thumb" aria-hidden="true"><Icon name="camera" size={20} />Photo</div>
                  <div className="grow min0">
                    <div className="row-wrap gap-6"><b className="md">{c.court_name}</b><Badge>{c.is_indoor ? 'Indoor' : 'Outdoor'}</Badge></div>
                    <p className="muted small mt-2">{c.facility.name} · {c.distance_km} km away</p>
                    <p className="small mt-6"><b>{c.sport_type}</b> · {peso(c.rental_rate)}/hr ·{' '}
                      <span className={c.open_slots ? 'ok-text' : 'muted'}>{c.open_slots ? `${c.open_slots} slots open` : 'Fully booked'}</span></p>
                  </div>
                  <div className="row-wrap">
                    <Button variant="link" size="sm" icon="map" onClick={dirToast}>Directions</Button>
                    <Button size="sm" to={`/player/courts/${c.court_id}?date=${date}`} aria-label={`View slots for ${c.court_name} at ${c.facility.name}`}>View slots</Button>
                  </div>
                </article>
              ))}
            </>}
          </AsyncContent>
        </section>

        <section aria-label="Map" className="split-side">
          {q.status === 'ready' && q.data.length > 0 && (
            <FacilityMap courts={q.data} selFac={selFac} setSelFac={setSelFac} date={date} />
          )}
        </section>
      </div>

      <ConfirmDialog open={askLocation} title="Use your location?" confirmLabel="Allow location"
        onCancel={() => setAskLocation(false)} onConfirm={useMyLocation}>
        Your browser will ask for permission to share your location. CourtConnect uses it only to measure distances to courts and doesn’t track you.
      </ConfirmDialog>
    </AppLayout>
  )
}

function FacilityMap({ courts, selFac, setSelFac, date }) {
  const facilities = useMemo(() => {
    const m = new Map()
    courts.forEach((c) => {
      const f = m.get(c.facility_id) ?? { ...c.facility, km: c.distance_km, courts: [] }
      f.courts.push(c)
      m.set(c.facility_id, f)
    })
    return [...m.values()]
  }, [courts])
  const sel = facilities.find((f) => f.facility_id === selFac)

  return <>
    <MapView height={420} selectedId={selFac} onSelect={setSelFac} label="Map of courts near you"
      markers={facilities.map((f) => ({ id: f.facility_id, label: f.name, latitude: f.latitude, longitude: f.longitude }))} />
    {sel && (
      <Card className="mt-12" title={sel.name} subtitle={`${areaOf(sel.address)} · ${sel.km} km away`}
        actions={<Button variant="link" size="sm" aria-label="Close facility details" onClick={() => setSelFac(null)}><Icon name="close" size={18} /></Button>}>
        {sel.courts.map((c) => (
          <div className="list-row" key={c.court_id}>
            <div className="grow"><b>{c.court_name}</b><p className="muted xsmall">{c.sport_type} · {c.is_indoor ? 'Indoor' : 'Outdoor'} · {peso(c.rental_rate)}/hr</p></div>
            <Badge tone={c.open_slots ? 'ok' : 'mute'}>{c.open_slots} open</Badge>
            <Link className="btn pri sm" to={`/player/courts/${c.court_id}?date=${date}`}>View slots</Link>
          </div>
        ))}
      </Card>
    )}
  </>
}
