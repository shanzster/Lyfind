import { useState } from 'react'
import { MapPin } from 'lucide-react'

type Location = {
  id: string
  name: string
  x: number // position as % of image width
  y: number // position as % of image height
  items: number
  hex: string // hex for the map marker
}

type Floor = {
  id: string
  label: string
  src: string
  ratio: number // height / width of the floor-plan image
  locations: Location[]
}

// Lyceum School Campus floor plans (public/floor-plans/*.png) with item pins
// placed over real rooms on each plan.
const FLOORS: Floor[] = [
  {
    id: 'ground',
    label: 'Ground Floor',
    src: '/floor-plans/ground_floor.png',
    ratio: 800 / 1377,
    locations: [
      { id: 'chm-lab', name: 'CHM Lab', x: 45, y: 43, items: 12, hex: '#3b82f6' },
      { id: 'canteen', name: 'Canteen', x: 55, y: 46, items: 8, hex: '#22c55e' },
      { id: 'clinic', name: 'Clinic & Health Care', x: 67, y: 46, items: 5, hex: '#a855f7' },
      { id: 'speech-lab', name: 'Speech Lab', x: 38, y: 50, items: 15, hex: '#f97316' },
      { id: 'registrar', name: 'Registrar Office', x: 90, y: 60, items: 3, hex: '#ec4899' }
    ]
  },
  {
    id: 'second',
    label: '2nd Floor',
    src: '/floor-plans/2nd_floor.png',
    ratio: 817 / 1368,
    locations: [
      { id: 'library', name: 'Library Area', x: 80, y: 32, items: 9, hex: '#3b82f6' },
      { id: 'avr', name: 'AVR Room', x: 49, y: 32, items: 4, hex: '#22c55e' },
      { id: 'criminology', name: 'Criminology Dept.', x: 26, y: 64, items: 6, hex: '#a855f7' },
      { id: 'comp-lab-b206', name: 'Comp. Lab B-206', x: 67, y: 64, items: 7, hex: '#f97316' },
      { id: 'eco-101', name: 'ECO 101', x: 18, y: 46, items: 2, hex: '#ec4899' }
    ]
  },
  {
    id: 'third-fourth',
    label: '3rd & 4th Floor',
    src: '/floor-plans/3rd_4th_floor.png',
    ratio: 838 / 1336,
    locations: [
      { id: 'female-cr', name: 'Female CR', x: 29, y: 28, items: 3, hex: '#3b82f6' },
      { id: 'eco-104', name: 'ECO 104', x: 29, y: 50, items: 5, hex: '#22c55e' },
      { id: 'eco-106', name: 'ECO 106', x: 29, y: 76, items: 2, hex: '#a855f7' },
      { id: 'office-4f', name: 'Office (4th)', x: 75, y: 33, items: 4, hex: '#f97316' },
      { id: 'eco-108', name: 'ECO 108', x: 74, y: 63, items: 6, hex: '#ec4899' }
    ]
  }
]

const recentItems = [
  { name: 'Blue Backpack', location: 'Library Area', time: '5 mins ago', emoji: '🎒' },
  { name: 'iPhone 13', location: 'Canteen', time: '15 mins ago', emoji: '📱' },
  { name: 'Water Bottle', location: 'ECO 104', time: '1 hour ago', emoji: '💧' }
]

export default function CampusMapDemo() {
  const [floorId, setFloorId] = useState<string>(FLOORS[0].id)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)

  const floor = FLOORS.find((f) => f.id === floorId) ?? FLOORS[0]

  const selectFloor = (id: string) => {
    setFloorId(id)
    setSelectedLocation(null)
    setHovered(null)
  }

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
            <span className="text-white/70 text-sm">Lyceum School Campus — {floor.label}</span>
            <span className="text-[#ff7400] text-sm">{floor.locations.reduce((sum, loc) => sum + loc.items, 0)} items</span>
          </div>

          {/* Floor switcher */}
          <div className="mb-4 flex flex-wrap gap-2">
            {FLOORS.map((f) => (
              <button
                key={f.id}
                onClick={() => selectFloor(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  f.id === floorId
                    ? 'bg-[#ff7400] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Real campus floor plan with item pins */}
          <div
            className="relative w-full rounded-xl border border-white/10 overflow-hidden bg-white"
            style={{ paddingBottom: `${floor.ratio * 100}%` }}
          >
            <img
              src={floor.src}
              alt={`Lyceum School Campus ${floor.label} plan`}
              className="absolute inset-0 w-full h-full object-contain"
            />

            {floor.locations.map((location) => {
              const active = selectedLocation === location.id || hovered === location.id
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => setSelectedLocation(location.id)}
                  onMouseEnter={() => setHovered(location.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="absolute -translate-x-1/2 -translate-y-full focus:outline-none"
                  style={{ left: `${location.x}%`, top: `${location.y}%` }}
                  aria-label={`${location.name}, ${location.items} items`}
                >
                  <span className="relative block" style={{ width: active ? 34 : 26, height: active ? 34 : 26 }}>
                    {active && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ background: location.hex, opacity: 0.35 }}
                      />
                    )}
                    <span
                      className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-white shadow-lg"
                      style={{ background: location.hex }}
                    >
                      <MapPin className="text-white" style={{ width: active ? 17 : 13, height: active ? 17 : 13 }} />
                    </span>
                  </span>

                  {active && (
                    <span className="absolute left-1/2 top-full -translate-x-1/2 mt-1 px-2 py-1 rounded-md bg-gray-900 text-white text-[11px] leading-tight whitespace-nowrap shadow-xl z-10">
                      <span className="block font-medium">{location.name}</span>
                      <span className="block text-[#ff7400]">{location.items} items</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {floor.locations.map((location) => (
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
