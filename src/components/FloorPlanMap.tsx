'use client';

import { useState, useRef } from 'react';
import { FloorPlan } from '@/lib/floorPlans';

interface Marker {
  id: string;
  x: number; // X coordinate as percentage (0-100)
  y: number; // Y coordinate as percentage (0-100)
  title: string;
  roomNumber?: string;
  type: 'lost' | 'found';
}

interface FloorPlanMapProps {
  floorPlan: FloorPlan;
  markers?: Marker[];
  selectedLocation?: { x: number; y: number };
  onLocationSelect?: (location: { x: number; y: number }) => void;
  interactive?: boolean;
}

export function FloorPlanMap({
  floorPlan,
  markers = [],
  selectedLocation,
  onLocationSelect,
  interactive = false,
}: FloorPlanMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onLocationSelect || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onLocationSelect({ x, y });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
      style={{ 
        paddingBottom: `${(floorPlan.height / floorPlan.width) * 100}%`,
        cursor: interactive ? 'crosshair' : 'default'
      }}
      onClick={handleClick}
    >
      <div className="absolute inset-0">
        <img
          src={floorPlan.imageUrl}
          alt={floorPlan.name}
          className="w-full h-full object-contain"
        />

        {/* Render markers */}
        {markers.map((marker) => (
          <div
            key={marker.id}
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${marker.x}%`,
              top: `${marker.y}%`,
            }}
            onMouseEnter={() => setHoveredMarker(marker.id)}
            onMouseLeave={() => setHoveredMarker(null)}
          >
            {/* Pin Icon */}
            <div
              className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${
                marker.type === 'lost' ? 'bg-red-500' : 'bg-green-500'
              }`}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Tooltip */}
            {hoveredMarker === marker.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap shadow-xl z-10">
                <div>{marker.title}</div>
                {marker.roomNumber && (
                  <div className="text-xs text-gray-300 mt-1">Room: {marker.roomNumber}</div>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Render selected location */}
        {selectedLocation && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{
              left: `${selectedLocation.x}%`,
              top: `${selectedLocation.y}%`,
            }}
          >
            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg animate-pulse" />
          </div>
        )}

        {/* Interactive overlay hint */}
        {interactive && !selectedLocation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
            <div className="bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
              Click to select location
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
