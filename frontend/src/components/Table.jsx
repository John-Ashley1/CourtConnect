/**
 * Data table that scrolls sideways on small screens (the wrapper is focusable so keyboard users can scroll).
 *   columns: [{ key, label, render?(row), num?: true (right-aligned), className? }]
 *   rows, rowKey(row) → key · caption: accessible name (visually hidden unless showCaption)
 *   onRowClick(row) + selectedKey: optional mouse shortcut for row selection. Keyboard users need a real
 *   button in the row as well (e.g. "View"), so rows themselves aren't extra tab stops.
 */
export default function Table({ columns, rows, rowKey, caption, showCaption, onRowClick, selectedKey, minWidth }) {
  return (
    <div className="tblw" role="region" aria-label={caption} tabIndex={0}>
      <table className="tbl" style={minWidth ? { minWidth } : undefined}>
        {caption && <caption className={showCaption ? undefined : 'sr-only'}>{caption}</caption>}
        <thead>
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={c.num ? 'num' : c.className}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const key = rowKey(r)
            const clickable = !!onRowClick
            return (
              <tr key={key} className={[clickable && 'clickable', selectedKey === key && 'sel'].filter(Boolean).join(' ') || undefined}
                onClick={clickable ? () => onRowClick(r) : undefined}
                aria-current={clickable && selectedKey === key ? 'true' : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={c.num ? 'num' : c.className}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
