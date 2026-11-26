import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SPORTS } from '../../constants/status'
import { useAsync } from '../../hooks/useAsync'
import { listMyFacilities } from '../../services/facilityService'
import { createCourt, listMyCourts, removeCourt, updateCourt } from '../../services/courtService'
import { peso } from '../../utils/format'
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
import Table from '../../components/Table'
import { Segmented } from '../../components/Tabs'
import { useToast } from '../../components/Toast'

const EMPTY = { court_name: '', sport_type: '', rental_rate: '', is_indoor: true, photo_url: '' }
const slotLength = (m) => (m % 60 === 0 ? `${m / 60} hour${m === 60 ? '' : 's'}` : m > 60 ? `${Math.floor(m / 60)} hr ${m % 60} min` : `${m} minutes`)

/** facility-courts: courts per facility, add / edit / remove. ?facility= preselects a facility. */
export default function Courts() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const q = useAsync(() => Promise.all([listMyFacilities(), listMyCourts()]).then(([facilities, courts]) => ({ facilities, courts })), [])
  const [form, setForm] = useState(null) // null | 'new' | court_id
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState(null)

  const facilities = q.data?.facilities ?? []
  const facId = Number(params.get('facility')) || facilities[0]?.facility_id
  const fac = facilities.find((x) => x.facility_id === facId) ?? facilities[0]
  const pickFac = (e) => { setParams({ facility: e.target.value }, { replace: true }); setForm(null) }

  const open = (c) => {
    setForm(c ? c.court_id : 'new')
    setErr({})
    setF(c ? { court_name: c.court_name, sport_type: c.sport_type, rental_rate: String(c.rental_rate), is_indoor: c.is_indoor, photo_url: c.photo_url ?? '' } : EMPTY)
    setTimeout(() => document.getElementById('ct-court_name')?.focus(), 0)
  }
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: null }) }

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!f.court_name.trim()) v.court_name = 'Enter a court name.'
    if (!f.sport_type) v.sport_type = 'Choose a sport.'
    if (!(Number(f.rental_rate) > 0)) v.rental_rate = 'Enter a rate greater than ₱0.'
    if (f.photo_url.trim() && !/^https:\/\/\S+$/i.test(f.photo_url.trim())) v.photo_url = 'Enter an image link that starts with https://, or leave it blank.'
    setErr(v)
    if (Object.keys(v).length) { document.getElementById(`ct-${Object.keys(v)[0]}`)?.focus(); return }
    setBusy(true)
    try {
      const data = { ...f, rental_rate: Number(f.rental_rate), photo_url: f.photo_url.trim() || null }
      const saved = form === 'new' ? await createCourt(fac.facility_id, data) : await updateCourt(form, data)
      q.setData((d) => ({
        ...d,
        courts: form === 'new' ? [...d.courts, saved] : d.courts.map((c) => (c.court_id === saved.court_id ? saved : c)),
        facilities: form === 'new' ? d.facilities.map((x) => (x.facility_id === fac.facility_id ? { ...x, court_count: x.court_count + 1 } : x)) : d.facilities,
      }))
      toast(form === 'new' ? `${saved.court_name} added. Set its hours next.` : `${saved.court_name} updated.`)
      setForm(null)
    } catch (ex) {
      if (Object.keys(ex.fieldErrors ?? {}).length) setErr(ex.fieldErrors)
      else toast(ex.message, 'err')
    } finally { setBusy(false) }
  }

  const doRemove = async () => {
    setBusy(true)
    try {
      await removeCourt(removing.court_id)
      q.setData((d) => ({
        ...d,
        courts: d.courts.filter((c) => c.court_id !== removing.court_id),
        facilities: d.facilities.map((x) => (x.facility_id === removing.facility_id ? { ...x, court_count: x.court_count - 1 } : x)),
      }))
      toast(`${removing.court_name} removed.`)
    } catch (ex) { toast(ex.message, 'err') } finally { setBusy(false); setRemoving(null) }
  }

  return (
    <AppLayout title="Courts" description="Add and edit the courts players can book, with their sport, type, rate and photos."
      actions={fac && <Button icon="plus" onClick={() => open(null)}>Add court</Button>}>
      <AsyncContent state={q} loading={<SkeletonPage kind="table" />} errorTitle="Can’t load courts"
        isEmpty={(d) => !d.facilities.length}
        empty={<EmptyState icon="building" title="Register a facility first" action={<Button to="/facility/facilities">Register facility</Button>}>
          Courts belong to a facility. Register your facility, then add its courts.
        </EmptyState>}>
        {({ courts }) => {
          const list = courts.filter((c) => c.facility_id === fac.facility_id)
          return <>
            <div className="toolbar">
              <Select id="ct-fac" label="Facility" value={fac.facility_id} onChange={pickFac}
                options={facilities.map((x) => ({ value: x.facility_id, label: x.name }))} />
            </div>

            {form !== null && (
              <Card as="form" className="stack mb-16" onSubmit={submit} noValidate title={form === 'new' ? `Add a court to ${fac.name}` : 'Edit court'}>
                <div className="form-grid">
                  <Input id="ct-court_name" label="Court name" placeholder="e.g. Badminton Court 3" maxLength={60} value={f.court_name} onChange={set('court_name')} error={err.court_name} />
                  <Select id="ct-sport_type" label="Sport" placeholder="Choose a sport" options={SPORTS} value={f.sport_type} onChange={set('sport_type')} error={err.sport_type} />
                  <Input id="ct-rental_rate" label="Rental rate per hour (₱)" type="number" min={1} step="0.01" inputMode="decimal" value={f.rental_rate} onChange={set('rental_rate')} error={err.rental_rate} />
                  <div className="field">
                    <span className="lbl" id="ct-io-lbl">Court type</span>
                    <Segmented label="Court type" value={f.is_indoor ? 'in' : 'out'} onChange={(v) => setF({ ...f, is_indoor: v === 'in' })}
                      options={[{ value: 'in', label: 'Indoor' }, { value: 'out', label: 'Outdoor' }]} />
                    <p className="hint">Outdoor courts show a weather forecast to players.</p>
                  </div>
                </div>
                <Input id="ct-photo_url" label="Photo link (optional)" type="url" inputMode="url" placeholder="https://…/court.jpg" maxLength={500}
                  value={f.photo_url} onChange={set('photo_url')} error={err.photo_url}
                  hint="A link to a photo of the court. Players see it on the court’s page. Uploading photos directly comes later." />
                <div className="row-wrap">
                  <Button type="submit" busy={busy}>{form === 'new' ? 'Add court' : 'Save changes'}</Button>
                  <Button variant="sec" onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
                </div>
              </Card>
            )}

            {!list.length ? (
              <EmptyState icon="grid" title="No courts at this facility" action={form === null && <Button onClick={() => open(null)}>Add court</Button>}>
                Add a court so players can find and book it.
              </EmptyState>
            ) : (
              <Table caption={`Courts at ${fac.name}`} rowKey={(c) => c.court_id} rows={list} columns={[
                { key: 'court_name', label: 'Court', render: (c) => <b>{c.court_name}</b> },
                { key: 'sport_type', label: 'Sport' },
                { key: 'type', label: 'Type', render: (c) => <Badge>{c.is_indoor ? 'Indoor' : 'Outdoor'}</Badge> },
                { key: 'rate', label: 'Rate / hour', num: true, render: (c) => peso(c.rental_rate) },
                { key: 'len', label: 'Slot length', render: (c) => slotLength(c.slot_minutes) },
                { key: 'photos', label: 'Photo', render: (c) => (c.photo_url ? 'Added' : <span className="muted">None yet</span>) },
                { key: 'act', label: <span className="sr-only">Actions</span>, render: (c) => (
                  <div className="row-wrap nowrap-row">
                    <Button variant="link" size="sm" onClick={() => open(c)} aria-label={`Edit ${c.court_name}`}>Edit</Button>
                    <Button variant="link" size="sm" to={`/facility/hours?court=${c.court_id}`} aria-label={`Hours for ${c.court_name}`}>Hours</Button>
                    <Button variant="link" size="sm" className="danger-text" onClick={() => setRemoving(c)} aria-label={`Remove ${c.court_name}`}>Remove</Button>
                  </div>
                ) },
              ]} />
            )}
          </>
        }}
      </AsyncContent>

      <ConfirmDialog open={!!removing} danger busy={busy} title={`Remove ${removing?.court_name ?? ''}?`} confirmLabel="Remove court"
        cancelLabel="Keep court" onCancel={() => setRemoving(null)} onConfirm={doRemove}>
        Players will no longer see or book this court. Existing confirmed bookings must be handled first. This can’t be undone.
      </ConfirmDialog>
    </AppLayout>
  )
}
