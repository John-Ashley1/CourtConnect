import { QRCodeSVG } from 'qrcode.react'

/**
 * Booking QR code for check-in. `value` is the booking's qr_code (its reference, e.g. CC-2611-0142).
 * The reference is also printed under the code so staff can type it if scanning fails.
 */
export default function QrCode({ value, size = 184, caption = value }) {
  return (
    <figure className="qr" style={{ margin: 0 }}>
      <QRCodeSVG value={value} size={size} level="M" marginSize={1} fgColor="#0B2545" role="img" aria-label={`QR code for booking ${value}`} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
