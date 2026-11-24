import { useRef } from 'react'

/**
 * Accessible tab bar (ARIA tabs pattern, arrow keys move between tabs).
 *   tabs: [{ id, label, count }]   value / onChange: the selected id
 *   idPrefix: used for tab/panel ids → wrap the content in <TabPanel idPrefix value>
 */
export default function Tabs({ tabs, value, onChange, label, idPrefix = 'tab' }) {
  const refs = useRef({})
  const onKey = (e, i) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : step ? (i + step + tabs.length) % tabs.length : null
    if (to === null) return
    e.preventDefault()
    onChange(tabs[to].id)
    refs.current[tabs[to].id]?.focus()
  }
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t, i) => {
        const on = t.id === value
        return (
          <button key={t.id} ref={(el) => { refs.current[t.id] = el }} type="button" role="tab"
            id={`${idPrefix}-${t.id}`} aria-controls={`${idPrefix}-panel`} aria-selected={on} tabIndex={on ? 0 : -1}
            className={'tab' + (on ? ' on' : '')} onClick={() => onChange(t.id)} onKeyDown={(e) => onKey(e, i)}>
            {t.label}{t.count !== undefined && ` (${t.count})`}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idPrefix = 'tab', value, children }) {
  return <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-${value}`}>{children}</div>
}

/** Small segmented toggle, e.g. 7 / 30 days. options: [{ value, label }] */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg-group" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={'seg-btn' + (o.value === value ? ' on' : '')}
          aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
