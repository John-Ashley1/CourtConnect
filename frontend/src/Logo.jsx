export default function Logo({ size = 32, text = true, large = false }) {
  return (
    <span className={'logo' + (large ? ' logo-lg' : '')}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#12b5a2" />
        <path d="M16 6.5a6.5 6.5 0 0 0-6.5 6.5c0 4.6 6.5 12 6.5 12s6.5-7.4 6.5-12A6.5 6.5 0 0 0 16 6.5Z" fill="#fff" />
        <circle cx="16" cy="13" r="2.6" fill="#12b5a2" />
      </svg>
      {text && <span className="logo-word">Court<b>Connect</b></span>}
    </span>
  )
}
