import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { createFacility, listMyFacilities, updateFacility } from '../../services/facilityService'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Icon from '../../components/Icon'
import Input from '../../components/Input'
import MapView from '../../components/MapView'
import { SkeletonPage } from '../../components/Skeleton'
import { useToast } from '../../components/Toast'

const EMPTY = { name: '', phone: '', address: '', city: '' }

/** facility-facilities: register a facility, edit details, see map position. */
export default function Facilities() {
  const toast = useToast()
  const q = useAsync(() => listMyFacilities(), [])
  const [form, setForm] = useState(null) // null | 'new' | facility_id
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)

  const open = (x) => {
    setForm(x ? x.facility_id : 'new')
    setErr({})
    // Show the street part only; the city has its own field.
    setF(x ? { name: x.name, phone: x.phone, address: x.address.replace(new RegExp(`,\\s*${x.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), ''), city: x.city } : EMPTY)
    setTimeout(() => document.getElementById('fa-name')?.focus(), 0)
  }
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: null }) }

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!f.name.trim()) v.name = 'Enter the facility name.'
    if (!f.phone.trim()) v.phone = 'Enter a mobile number like 0917 123 4567.'
    if (!f.address.trim()) v.address = 'Enter the street address.'
    if (!f.city.trim()) v.city = 'Enter the city or municipality.'
    setErr(v)
    if (Object.keys(v).length) { document.getElementById(`fa-${Object.keys(v)[0]}`)?.focus(); return }
    setBusy(true)
    try {
      const saved = form === 'new' ? await createFacility(f) : await updateFacility(form, f)
      q.setData((xs) => (form === 'new' ? [...xs, saved] : xs.map((x) => (x.facility_id === saved.facility_id ? saved : x))))
      toast(form === 'new' ? `${saved.name} registered.` : 'Facility updated.')
      setForm(null)
    } catch (ex) {
      if (Object.keys(ex.fieldErrors ?? {}).length) setErr(ex.fieldErrors)
      else toast(ex.offline ? 'The server didn’t respond. The facility wasn’t saved.' : ex.message, 'err')
    } finally { setBusy(false) }
  }

  return (
    <AppLayout title="Facilities" description="Register your sports facilities and keep their details and map location accurate."
      actions={!q.notBuilt && <Button icon="plus" onClick={() => open(null)}>Register facility</Button>}>
      {form !== null && (
        <Card as="form" className="stack mb-16" onSubmit={submit} noValidate
          title={form === 'new' ? 'Register a facility' : 'Edit facility details'}
          subtitle="The map position is found from the address (OpenStreetMap) when you save.">
          <div className="form-grid">
            <Input id="fa-name" label="Facility name" placeholder="Facility name" maxLength={100} value={f.name} onChange={set('name')} error={err.name} />
            <Input id="fa-phone" label="Contact number" placeholder="09XX XXX XXXX" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={err.phone} />
            <Input id="fa-address" label="Street address" placeholder="Street, barangay" value={f.address} onChange={set('address')} error={err.address} />
            <Input id="fa-city" label="City / municipality" placeholder="e.g. Cebu City" value={f.city} onChange={set('city')} error={err.city} />
          </div>
          <div className="banner bn-info"><Icon name="map" />
            <span>Include the street and barangay so players are shown the right place. If the map can’t find the address, the facility isn’t saved and you can correct it.</span>
          </div>
          <div className="row-wrap">
            <Button type="submit" busy={busy}>{busy ? 'Saving…' : form === 'new' ? 'Register facility' : 'Save changes'}</Button>
            <Button variant="sec" onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
          </div>
        </Card>
      )}

      <AsyncContent state={q} loading={<SkeletonPage kind="cards" rows={1} />} errorTitle="Can’t load facilities"
        isEmpty={(d) => !d.length}
        empty={form === null && <EmptyState icon="building" title="No facilities yet" action={<Button onClick={() => open(null)}>Register facility</Button>}>
          Register your first facility to list its courts on CourtConnect.
        </EmptyState>}>
        {(facilities) => (
          <div className="card-grid">
            {facilities.map((x) => (
              <article key={x.facility_id} className="card fac-card">
                <MapView height={150} label={`Map showing ${x.name}`} selectedId={x.facility_id}
                  markers={[{ id: x.facility_id, label: x.name, latitude: x.latitude, longitude: x.longitude }]} />
                <div className="row-between">
                  <div className="min0"><h2>{x.name}</h2><p className="muted small">{x.address}</p></div>
                  <Badge tone="ok">Active</Badge>
                </div>
                <p className="small">{x.court_count} {x.court_count === 1 ? 'court' : 'courts'} · Contact {x.phone}</p>
                <p className="muted xsmall">Map coordinates: {x.latitude.toFixed(4)}, {x.longitude.toFixed(4)}</p>
                <div className="row-wrap">
                  <Button size="sm" to={`/facility/courts?facility=${x.facility_id}`}>Manage courts</Button>
                  <Button size="sm" variant="sec" icon="edit" onClick={() => open(x)}>Edit details</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </AsyncContent>
    </AppLayout>
  )
}
