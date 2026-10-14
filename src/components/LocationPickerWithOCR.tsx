'use client';

import { useEffect, useState } from 'react';
import { FloorPlanMap } from './FloorPlanMap';
import { floorPlans, FloorPlan } from '@/lib/floorPlans';
import { extractRoomNumber, preloadOCR } from '@/lib/ocrService';
import { resolveRoom, ocrAgreesWith } from '@/lib/floorPlanRooms';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LocationPickerProps {
  value?: {
    floorPlanId: string;
    x: number;
    y: number;
    roomNumber?: string;
  } | null;
  onChange: (location: {
    floorPlanId: string;
    x: number;
    y: number;
    roomNumber?: string;
  }) => void;
}

export function LocationPickerWithOCR({ value, onChange }: LocationPickerProps) {
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan>(
    value ? floorPlans.find((fp) => fp.id === value.floorPlanId) || floorPlans[0] : floorPlans[0]
  );
  const [tempLocation, setTempLocation] = useState<{
    x: number;
    y: number;
    roomNumber?: string;
  } | null>(value ? { x: value.x, y: value.y, roomNumber: value.roomNumber } : null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [manualRoomNumber, setManualRoomNumber] = useState(value?.roomNumber || '');
  // How the current room value was resolved + whether OCR corroborated it.
  const [resolution, setResolution] = useState<
    | { source: 'registry'; verification: 'pending' | 'verified' | 'mismatch'; ocrText?: string }
    | { source: 'ocr' }
    | null
  >(null);

  // Warm up the OCR engine in the background so the first click is responsive.
  useEffect(() => {
    void preloadOCR();
  }, []);

  const handleFloorPlanChange = (floorPlanId: string) => {
    const floorPlan = floorPlans.find((fp) => fp.id === floorPlanId);
    if (floorPlan) {
      setSelectedFloorPlan(floorPlan);
      setTempLocation(null);
      setManualRoomNumber('');
      setResolution(null);
    }
  };

  const handleLocationSelect = async (location: { x: number; y: number }) => {
    // 1) Registry first — the defined room zones are ground truth.
    const room = resolveRoom(selectedFloorPlan.id, location.x, location.y);

    if (room) {
      // Trust the registry immediately, then let OCR corroborate in the background.
      setTempLocation({ ...location, roomNumber: room.display });
      setManualRoomNumber(room.display);
      setResolution({ source: 'registry', verification: 'pending' });

      try {
        const result = await extractRoomNumber(
          selectedFloorPlan.imageUrl,
          room.x, // OCR the zone's centre, not the loose click point
          room.y,
          120
        );
        const agrees = ocrAgreesWith(result.roomNumber ?? result.nearbyText.join(' '), room);
        setResolution({
          source: 'registry',
          verification: agrees ? 'verified' : 'mismatch',
          ocrText: result.roomNumber ?? result.nearbyText.join(' ') ?? '',
        });
      } catch {
        // Verification is best-effort; the registry value still stands.
        setResolution({ source: 'registry', verification: 'mismatch' });
      }
      return;
    }

    // 2) No defined zone nearby — fall back to live OCR of the click point.
    setTempLocation({ ...location, roomNumber: undefined });
    setResolution({ source: 'ocr' });
    setIsExtracting(true);
    try {
      const result = await extractRoomNumber(
        selectedFloorPlan.imageUrl,
        location.x,
        location.y,
        120 // larger crop so the whole label is captured, not a sliver of it
      );

      if (result.roomNumber) {
        setTempLocation({ ...location, roomNumber: result.roomNumber });
        setManualRoomNumber(result.roomNumber);
      } else if (result.nearbyText.length > 0) {
        const suggestion = result.nearbyText[0];
        setManualRoomNumber(suggestion);
        setTempLocation({ ...location, roomNumber: suggestion });
      }
    } catch (error) {
      console.error('Failed to extract room number:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirm = () => {
    if (tempLocation) {
      onChange({
        floorPlanId: selectedFloorPlan.id,
        x: tempLocation.x,
        y: tempLocation.y,
        roomNumber: manualRoomNumber || tempLocation.roomNumber,
      });
    }
  };

  const handleClear = () => {
    setTempLocation(null);
    setManualRoomNumber('');
    setResolution(null);
  };

  return (
    <div className="space-y-4">
      {/* Floor Plan Selector */}
      <div className="space-y-2">
        <Label>Select Floor</Label>
        <Select value={selectedFloorPlan.id} onValueChange={handleFloorPlanChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {floorPlans.map((fp) => (
              <SelectItem key={fp.id} value={fp.id}>
                {fp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Map */}
      <div className="space-y-2">
        <Label>Click on the map to select location</Label>
        <FloorPlanMap
          floorPlan={selectedFloorPlan}
          selectedLocation={
            tempLocation ? { x: tempLocation.x, y: tempLocation.y } : undefined
          }
          onLocationSelect={handleLocationSelect}
          interactive
        />
      </div>

      {/* Room Number Input */}
      {tempLocation && (
        <div className="space-y-2">
          <Label htmlFor="roomNumber">
            Room Number {isExtracting && '(Detecting...)'}
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="roomNumber"
                value={manualRoomNumber}
                onChange={(e) => setManualRoomNumber(e.target.value)}
                placeholder="e.g., 101, A-205"
                disabled={isExtracting}
              />
              {isExtracting && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
              )}
            </div>
          </div>
          {/* Status line: registry = ground truth (with OCR corroboration), else live OCR */}
          {resolution?.source === 'registry' && resolution.verification === 'verified' && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified — matches the floor plan.
            </p>
          )}
          {resolution?.source === 'registry' && resolution.verification === 'pending' && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              From floor plan · double-checking…
            </p>
          )}
          {resolution?.source === 'registry' && resolution.verification === 'mismatch' && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Using the floor-plan label{resolution.ocrText ? ` (scan read “${resolution.ocrText}”)` : ''} — unverified.
            </p>
          )}
          {resolution?.source === 'ocr' && (
            <p className="text-xs text-gray-500">
              {tempLocation.roomNumber
                ? `Detected by scan: ${tempLocation.roomNumber} — please confirm it's correct.`
                : 'No mapped room here — scanning the floor plan…'}
            </p>
          )}
        </div>
      )}

      {/* Location Info */}
      {tempLocation && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="font-medium mb-1">Selected Location:</div>
          <div>Floor: {selectedFloorPlan.name}</div>
          <div>
            Coordinates: ({tempLocation.x.toFixed(1)}%, {tempLocation.y.toFixed(1)}%)
          </div>
          {manualRoomNumber && <div>Room: {manualRoomNumber}</div>}
        </div>
      )}

      {/* Actions */}
      {tempLocation && (
        <div className="flex gap-2">
          <Button onClick={handleConfirm} className="flex-1" disabled={isExtracting}>
            Confirm Location
          </Button>
          <Button onClick={handleClear} variant="outline" disabled={isExtracting}>
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
