import Icon from './Icon'

/**
 * Placeholder until Google Maps is added: a grid "map" with clickable pins placed from each
 * marker's latitude/longitude, plus a clear note that the real map comes later.
 *   markers: [{ id, label, latitude, longitude }] · selectedId · onSelect(id)
 */
export default function MapView({ markers = [], selectedId, onSelect, height = 360, label = 'Map of facilities' }) {
  const lats = markers.map((m) => m.latitude), lngs = markers.map((m) => m.longitude)
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
  // Keep pins away from the edges and the note at the top.
  const pos = (m) => ({
    left: `${16 + (maxLng === minLng ? 0.5 : (m.longitude - minLng) / (maxLng - minLng)) * 68}%`,
    top: `${28 + (maxLat === minLat ? 0.5 : (maxLat - m.latitude) / (maxLat - minLat)) * 62}%`,
  })
  return (
    <div className="mapbox" style={{ height }} role="group" aria-label={label}>
      <p className="map-note"><Icon name="map" size={16} /><span><b>Map loads in a later increment.</b> Pins show approximate positions.</span></p>
      {markers.map((m) => {
        const on = m.id === selectedId
        return (
          <button key={m.id} type="button" className={'pin' + (on ? ' on' : '')} style={pos(m)}
            aria-pressed={on} aria-label={`Show ${m.label}`} onClick={() => onSelect?.(m.id)}>
            <span className="pl">{m.label}</span>
            <Icon name="pin" size={26} />
          </button>
        )
      })}
    </div>
  )
}
