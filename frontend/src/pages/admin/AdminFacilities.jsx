import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { listAllFacilities } from '../../services/adminService'
import { areaOf } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Input from '../../components/Input'
import MapView from '../../components/MapView'
import { SkeletonPage } from '../../components/Skeleton'
import Table from '../../components/Table'

const registered = (iso) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

/** admin-facilities: every facility with its administrator, courts and 30-day bookings; details panel. */
export default function AdminFacilities() {
  const q = useAsync(() => listAllFacilities(), [])
  const [text, setText] = useState('')
  const [selId, setSelId] = useState(null)

  return (
    <AppLayout title="Facilities" description="Monitor every registered facility, its administrator, courts and booking activity.">
      {!q.notBuilt && (<Card className="mb-16">
        <div className="toolbar mb-0">
          <Input id="af-q" label="Search" type="search" placeholder="Facility, area or administrator" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </Card>)}
      <AsyncContent state={q} loading={<SkeletonPage kind="table" rows={5} />} errorTitle="Can’t load facilities"
        isEmpty={(d) => !d.length}
        empty={<EmptyState icon="building" title="No facilities registered">Facilities appear here once facility administrators register them.</EmptyState>}>
        {(facilities) => {
          const t = text.trim().toLowerCase()
          const list = facilities.filter((f) => !t || `${f.name} ${f.address} ${f.admin?.full_name ?? ''}`.toLowerCase().includes(t))
          const sel = facilities.find((f) => f.facility_id === selId)
          return (
            <div className="split align-start">
              <div className="split-main min0">
                <p className="b mb-12" aria-live="polite">{list.length} {list.length === 1 ? 'facility' : 'facilities'}</p>
                {!list.length ? (
                  <EmptyState icon="search" title="No facilities match">Try a different name, area or administrator.</EmptyState>
                ) : (
                  <Table caption="Registered facilities" rowKey={(f) => f.facility_id} rows={list} selectedKey={selId}
                    onRowClick={(f) => setSelId(f.facility_id)} columns={[
                      { key: 'name', label: 'Facility', render: (f) => <b>{f.name}</b> },
                      { key: 'area', label: 'Area', render: (f) => areaOf(f.address) },
                      { key: 'admin', label: 'Administrator', render: (f) => f.admin?.full_name ?? '—' },
                      { key: 'courts', label: 'Courts', num: true, render: (f) => f.courts.length },
                      { key: 'bk', label: 'Bookings (30 days)', num: true, render: (f) => f.bookings_30d },
                      { key: 'act', label: <span className="sr-only">Details</span>, render: (f) => (
                        <Button variant="link" size="sm" aria-label={`View ${f.name}`} onClick={(e) => { e.stopPropagation(); setSelId(f.facility_id) }}>View</Button>
                      ) },
                    ]} />
                )}
              </div>
              <aside className="split-side">
                <Card aria-live="polite">
                  {!sel ? <>
                    <h2>Facility details</h2>
                    <p className="muted small mt-8">Select a facility to see its courts and booking summary.</p>
                  </> : <>
                    <h2>{sel.name}</h2>
                    <p className="muted small">{areaOf(sel.address)} · Managed by {sel.admin?.full_name ?? '—'}</p>
                    <div className="kpi-grid kpi-2 mt-12">
                      <div className="kpi"><span>Courts</span><b>{sel.courts.length}</b></div>
                      <div className="kpi"><span>Bookings · 30d</span><b>{sel.bookings_30d}</b></div>
                    </div>
                    <p className="small mt-12"><b>Courts:</b> {sel.courts.length ? sel.courts.map((c) => c.court_name).join(', ') : 'None yet'}</p>
                    <p className="small mt-4"><b>Contact:</b> {sel.phone}{sel.admin && <> · {sel.admin.email}</>}</p>
                    <p className="muted xsmall mt-4">Registered {registered(sel.created_at)}</p>
                    <div className="mt-12">
                      <MapView height={160} label={`Map showing ${sel.name}`} selectedId={sel.facility_id}
                        markers={[{ id: sel.facility_id, label: sel.name, latitude: sel.latitude, longitude: sel.longitude }]} />
                    </div>
                  </>}
                </Card>
              </aside>
            </div>
          )
        }}
      </AsyncContent>
    </AppLayout>
  )
}
