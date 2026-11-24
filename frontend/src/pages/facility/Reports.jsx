import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { listMyFacilities } from '../../services/facilityService'
import { getFacilityReport } from '../../services/reportService'
import { peso } from '../../utils/format'
import AppLayout from '../../components/AppLayout'
import AsyncContent from '../../components/AsyncContent'
import Button from '../../components/Button'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import PeakHoursChart, { peakSentence } from '../../components/PeakHoursChart'
import Select from '../../components/Select'
import { SkeletonPage } from '../../components/Skeleton'
import { Segmented } from '../../components/Tabs'

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '0%')

/** facility-reports: 7/30-day summary, peak hours chart (recharts), bookings by court, PDF export placeholder. */
export default function Reports() {
  const [days, setDays] = useState(7)
  const [facilityId, setFacilityId] = useState('')
  const [pdf, setPdf] = useState(false)
  const facQ = useAsync(() => listMyFacilities(), [])
  const q = useAsync(() => getFacilityReport({ days, facilityId }), [days, facilityId])

  return (
    <AppLayout title="Reports" description="Booking summaries and peak hours for your facilities, from recorded bookings."
      actions={!q.notBuilt && <Button variant="sec" icon="download" onClick={() => setPdf(true)}>Export PDF</Button>}>
      {!q.notBuilt && (<div className="toolbar">
        <div className="field">
          <span className="lbl">Date range</span>
          <Segmented label="Date range" value={days} onChange={setDays} options={[{ value: 7, label: 'Last 7 days' }, { value: 30, label: 'Last 30 days' }]} />
        </div>
        <Select id="rp-fac" label="Facility" placeholder="All my facilities" value={facilityId} onChange={(e) => setFacilityId(e.target.value)}
          options={(facQ.data ?? []).map((f) => ({ value: String(f.facility_id), label: f.name }))} />
      </div>)}

      <AsyncContent state={q} loading={<SkeletonPage kind="cards" rows={2} />} errorTitle="Can’t build the report"
        isEmpty={(r) => !r.total}
        empty={<EmptyState icon="chart" title="Not enough data yet">Reports appear once your facilities have bookings in the selected period.</EmptyState>}>
        {(r) => {
          const max = Math.max(1, ...r.by_court.map((c) => c.count))
          return <>
            <div className="kpi-grid kpi-6">
              <div className="kpi"><span>Total bookings</span><b>{r.total}</b><p>Last {days} days</p></div>
              <div className="kpi"><span>Confirmed</span><b>{r.confirmed}</b><p>{pct(r.confirmed, r.total)} of total</p></div>
              <div className="kpi"><span>Cancelled</span><b>{r.cancelled}</b><p>{pct(r.cancelled, r.total)} of total</p></div>
              <div className="kpi"><span>Expired (unpaid)</span><b>{r.expired}</b><p>{pct(r.expired, r.total)} of total</p></div>
              <div className="kpi"><span>Paid bookings value</span><b>{peso(r.paid_value).replace('.00', '')}</b><p>Confirmed and paid</p></div>
              <div className="kpi"><span>Slots booked</span><b>{pct(r.utilization, 1)}</b><p>Booked ÷ bookable slots</p></div>
            </div>
            <div className="dash-grid dash-grid-wide">
              <Card title="Peak booking hours" subtitle="Confirmed bookings by start time. Darker bars are the 3 busiest hours.">
                <div className="mt-12"><PeakHoursChart data={r.peak} height={260} showValues /></div>
                <p className="small">Busiest hours: <b>{peakSentence(r.peak)}</b></p>
              </Card>
              <Card title="By court" subtitle="Confirmed bookings">
                <ul className="plain stack-12 mt-12">
                  {r.by_court.map((c) => (
                    <li key={c.court_id}>
                      <div className="row-between small"><span>{c.court_name}{!facilityId && <span className="muted"> · {c.facility_name}</span>}</span><b>{c.count}</b></div>
                      <div className="prog mt-4" role="progressbar" aria-label={`${c.court_name} bookings`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={c.count}>
                        <i style={{ width: `${Math.round((c.count / max) * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </>
        }}
      </AsyncContent>

      <Modal open={pdf} title="PDF export comes later" onClose={() => setPdf(false)} footer={<Button onClick={() => setPdf(false)}>OK</Button>}>
        <p className="dlg-body">Exporting reports as PDF arrives in a later increment. Nothing was downloaded.{'\n\n'}For now you can print this page from your browser.</p>
      </Modal>
    </AppLayout>
  )
}
