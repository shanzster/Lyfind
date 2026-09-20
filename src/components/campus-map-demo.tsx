import { useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'

export default function CampusMapDemo() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  const locations = [
    { id: 'library', name: 'Library', x: 30, y: 40, items: 12, color: 'bg-blue-500' },
    { id: 'cafeteria', name: 'Cafeteria', x: 60, y: 30, items: 8, color: 'bg-green-500' },
    { id: 'gym', name: 'Gym', x: 75, y: 60, items: 5, color: 'bg-purple-500' },
    { id: 'parking', name: 'Parking Lot', x: 20, y: 75, items: 15, color: 'bg-orange-500' },
    { id: 'auditorium', name: 'Auditorium', x: 50, y: 70, items: 3, color: 'bg-pink-500' }
  ]

  const recentItems = [
    { name: 'Blue Backpack', location: 'Library', time: '5 mins ago', emoji: '🎒' },
    { name: 'iPhone 13', location: 'Cafeteria', time: '15 mins ago', emoji: '📱' },
    { name: 'Water Bottle', location: 'Gym', time: '1 hour ago', emoji: '💧' }
  ]

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#ff7400]/20 rounded-xl flex items-center justify-center">
          <Navigation className="w-6 h-6 text-[#ff7400]" />
        </div>
        <div>
          <h3 className="text-2xl font-normal text-white">Campus Map Integration</h3>
          <p className="text-white/50 text-sm">Interactive map of lost & found items</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/70 text-sm">Lyceum of Subic Bay Campus</span>
            <span className="text-[#ff7400] text-sm">{locations.reduce((sum, loc) => sum + loc.items, 0)} items</span>
          </div>

          {/* Interactive Map */}
          <div className="relative aspect-square bg-gradient-to-br from-[#2f1632] to-[#1a0d1c] rounded-xl border border-white/10 overflow-hidden">
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-20">
              <div className="grid grid-cols-4 grid-rows-4 h-full">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="border border-white/10"></div>
                ))}
              </div>
            </div>

            {/* Location Markers */}
            {locations.map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocation(location.id)}
                className="absolute group"
                style={{ left: `${location.x}%`, top: `${location.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {/* Pulse animation */}
                <div className={`absolute inset-0 ${location.color} rounded-full opacity-30 animate-ping`}></div>
                
                {/* Marker */}
                <div className={`relative w-8 h-8 ${location.color} rounded-full flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform`}>
                  <MapPin className="w-4 h-4 text-white" />
                </div>

                {/* Label */}
                <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-black/80 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity ${
                  selectedLocation === location.id ? 'opacity-100' : ''
                }`}>
                  {location.name}
                  <div className="text-[#ff7400]">{location.items} items</div>
                </div>
              </button>
            ))}
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
