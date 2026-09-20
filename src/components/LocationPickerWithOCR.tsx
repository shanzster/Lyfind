'use client';

import { useState } from 'react';
import { FloorPlanMap } from './FloorPlanMap';
import { floorPlans, FloorPlan } from '@/lib/floorPlans';
import { extractRoomNumber } from '@/lib/ocrService';
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

  const handleFloorPlanChange = (floorPlanId: string) => {
    const floorPlan = floorPlans.find((fp) => fp.id === floorPlanId);
    if (floorPlan) {
      setSelectedFloorPlan(floorPlan);
      setTempLocation(null);
      setManualRoomNumber('');
    }
  };

  const handleLocationSelect = async (location: { x: number; y: number }) => {
    setTempLocation({ ...location, roomNumber: undefined });
    setIsExtracting(true);

    try {
      // Extract room number using OCR
      const result = await extractRoomNumber(
        selectedFloorPlan.imageUrl,
        location.x,
        location.y,
        50 // 50px radius
      );

      if (result.roomNumber) {
        setTempLocation({
          ...location,
          roomNumber: result.roomNumber,
        });
        setManualRoomNumber(result.roomNumber);
      } else if (result.nearbyText.length > 0) {
        // If no room number found, show nearby text as suggestion
        const suggestion = result.nearbyText[0];
        setManualRoomNumber(suggestion);
        setTempLocation({
          ...location,
          roomNumber: suggestion,
        });
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
          <p className="text-xs text-gray-500">
            {tempLocation.roomNumber
              ? `Detected: ${tempLocation.roomNumber}`
              : 'Room number will be auto-detected from the floor plan'}
          </p>
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
