import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'

// Lyceum of Subic Bay — Rizal Highway, Subic Bay Freeport Zone
const CAMPUS_CENTER: [number, number] = [14.8237, 120.2789]

type Location = {
  id: string
  name: string
  lat: number
  lng: number
  items: number
  color: string // tailwind bg class for legend/chips
  hex: string // hex for the map marker
}

export default function CampusMapDemo() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const locations: Location[] = [
    { id: 'library', name: 'Library', lat: 14.82405, lng: 120.27845, items: 12, color: 'bg-blue-500', hex: '#3b82f6' },
    { id: 'cafeteria', name: 'Cafeteria', lat: 14.82425, lng: 120.27925, items: 8, color: 'bg-green-500', hex: '#22c55e' },
    { id: 'gym', name: 'Gym', lat: 14.82350, lng: 120.27955, items: 5, color: 'bg-purple-500', hex: '#a855f7' },
    { id: 'parking', name: 'Parking Lot', lat: 14.82320, lng: 120.27830, items: 15, color: 'bg-orange-500', hex: '#f97316' },
    { id: 'auditorium', name: 'Auditorium', lat: 14.82330, lng: 120.27905, items: 3, color: 'bg-pink-500', hex: '#ec4899' }
  ]

  const recentItems = [
    { name: 'Blue Backpack', location: 'Library', time: '5 mins ago', emoji: '🎒' },
    { name: 'iPhone 13', location: 'Cafeteria', time: '15 mins ago', emoji: '📱' },
    { name: 'Water Bottle', location: 'Gym', time: '1 hour ago', emoji: '💧' }
  ]

  const selected = locations.find((l) => l.id === selectedLocation) ?? null

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center">
          <MapPin className="w-6 h-6 text-[#ff7400]" />
        </div>
        <div>
          <h3 className="text-2xl font-normal text-white">Campus Map Integration</h3>
          <p className="text-white/50 text-sm">Interactive map of lost &amp; found items</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">Lyceum of Subic Bay Campus</span>
            <span className="text-[#ff7400] text-sm">{locations.reduce((sum, loc) => sum + loc.items, 0)} items</span>
          </div>

          {/* Real interactive map */}
          <div className="relative aspect-square rounded-xl border border-white/10 overflow-hidden z-0">
            <MapContainer
              center={CAMPUS_CENTER}
              zoom={17}
              scrollWheelZoom={false}
              className="h-full w-full"
              style={{ background: '#1a0d1c' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {locations.map((location) => (
                <Marker
                  key={location.id}
                  position={[location.lat, location.lng]}
                  icon={createPinIcon(location.hex, selectedLocation === location.id)}
                  eventHandlers={{ click: () => setSelectedLocation(location.id) }}
                >
                  <Popup>
                    <strong>{location.name}</strong>
                    <br />
                    {location.items} items
                  </Popup>
                </Marker>
              ))}

              <FlyToSelected location={selected} />
            </MapContainer>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {locations.map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocation(location.id)}
                className={`px-3 py-1 rounded-full text-xs transition-all ${
                  selectedLocation === location.id
                    ? 'bg-[#ff7400] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {location.name} ({location.items})
              </button>
            ))}
          </div>
        </div>

        {/* Recent Items */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">Recent Posts</span>
            <span className="text-white/40 text-xs">Live updates</span>
          </div>

          <div className="space-y-3">
            {recentItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
              >
                <div className="text-3xl">{item.emoji}</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium group-hover:text-[#ff7400] transition-colors">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-white/40" />
                    <span className="text-white/40 text-xs">{item.location}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/40">{item.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-medium text-[#ff7400]">43</div>
              <div className="text-xs text-white/50 mt-1">Items Today</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <div className="text-2xl font-medium text-green-400">28</div>
              <div className="text-xs text-white/50 mt-1">Recovered</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Pan/zoom the map to the selected building
function FlyToSelected({ location }: { location: Location | null }) {
  const map = useMap()
  if (location) {
    map.flyTo([location.lat, location.lng], 18, { duration: 0.75 })
  }
  return null
}

// Build a colored teardrop pin as a Leaflet divIcon
const iconCache = new Map<string, L.DivIcon>()
function createPinIcon(hex: string, active: boolean): L.DivIcon {
  const key = `${hex}-${active}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const size = active ? 38 : 30
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;transform:translateY(-${size / 2}px);">
      ${active ? `<div style="position:absolute;inset:0;border-radius:9999px;background:${hex};opacity:.35;animation:lf-ping 1.2s cubic-bezier(0,0,.2,1) infinite;"></div>` : ''}
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        background:${hex};border-radius:9999px;box-shadow:0 4px 10px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.85);">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none"
          stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>`

  const icon = L.divIcon({
    html,
    className: 'lf-pin-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  })
  iconCache.set(key, icon)
  return icon
}
