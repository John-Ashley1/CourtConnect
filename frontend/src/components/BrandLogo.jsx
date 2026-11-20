import { useId } from 'react'

/** CourtConnect mark: teal tile, court lines, location pin with two rings. */
export function BrandMark({ size = 34 }) {
  const id = useId()
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14B8A6" />
          <stop offset="1" stopColor="#0B7A5A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id})`} />
      <rect x="11" y="13" width="42" height="36" rx="4" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
      <path d="M11 31h42" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
      <path d="M32 52c-6-8-12-15-12-23a12 12 0 0 1 24 0c0 8-6 15-12 23z" fill="#fff" />
      <circle cx="28.3" cy="28" r="4.2" fill="none" stroke="#0B2545" strokeWidth="2.6" />
      <circle cx="35.7" cy="28" r="4.2" fill="none" stroke="#FF8A3D" strokeWidth="2.6" />
    </svg>
  )
}

/** Mark + wordmark. `large` is the sign-in/register version with the tagline. */
export default function BrandLogo({ size, large = false }) {
  return (
    <span className={'brand' + (large ? ' brand-lg' : '')}>
      <BrandMark size={size ?? (large ? 84 : 34)} />
      <span className="brand-text">
        <span className="brand-word">CourtConnect</span>
        {large && <span className="brand-tag">BOOK · PLAY · CONNECT</span>}
      </span>
    </span>
  )
}
