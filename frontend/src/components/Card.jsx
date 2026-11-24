/**
 * White card. With `title`, shows a header row with optional `actions` (e.g. a "See all" link).
 * `as` lets a card be a <form>, <article>… (default <section>).
 */
export default function Card({ title, subtitle, actions, as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={'card ' + className} {...rest}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </Tag>
  )
}
