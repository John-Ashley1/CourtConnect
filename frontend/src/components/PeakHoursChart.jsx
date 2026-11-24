import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const shortHour = (h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
export const hourRange = (h) => `${hourLabel(h)}–${hourLabel(h + 1)}`

/** The 3 busiest start hours (with at least one booking), busiest first. */
export function topHours(data, n = 3) {
  return [...data].filter((d) => d.count > 0).sort((a, b) => b.count - a.count || a.hour - b.hour).slice(0, n).map((d) => d.hour)
}

/** 'Busiest: 6–7 PM, then 7–8 PM and 5–6 PM.' */
export function peakSentence(data) {
  const [a, ...rest] = topHours(data).map(hourRange)
  if (!a) return 'No confirmed bookings in this period.'
  return rest.length ? `${a}, then ${rest.join(' and ')}` : a
}

/**
 * Bar chart of confirmed bookings by start hour (recharts). The 3 busiest hours are dark green.
 * data: [{ hour, count }]. Screen readers get a table with the same numbers.
 */
export default function PeakHoursChart({ data, height = 220, showValues = false, caption = 'Confirmed bookings by start hour' }) {
  const top = topHours(data)
  const rows = data.map((d) => ({ ...d, label: shortHour(d.hour) }))
  return (
    <figure className="chart">
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={rows} margin={{ top: showValues ? 18 : 8, right: 4, left: -18, bottom: 0 }}>
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#E2E8E6' }} tick={{ fontSize: 11, fill: '#4D6078' }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#4D6078' }} width={42} />
            <Tooltip cursor={{ fill: '#EEF8F6' }} formatter={(v) => [v, 'Confirmed bookings']}
              labelFormatter={(_, p) => (p?.[0] ? hourRange(p[0].payload.hour) : '')}
              contentStyle={{ borderRadius: 10, border: '1px solid #E2E8E6', fontSize: 13 }} />
            <Bar dataKey="count" radius={[6, 6, 2, 2]} isAnimationActive={false}>
              {rows.map((r) => <Cell key={r.hour} fill={top.includes(r.hour) ? '#0B7A5A' : '#99D9CB'} />)}
              {showValues && <LabelList dataKey="count" position="top" fontSize={11} fill="#0B2545" />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Start time</th><th scope="col">Bookings</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.hour}><td>{hourRange(d.hour)}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
