'use client';

import { useState } from 'react';
import { FloorPlanMap } from './FloorPlanMap';
import { floorPlans, FloorPlan } from '@/lib/floorPlans';
import { extractRoomNumber, cropRegion } from '@/lib/ocrService';
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
  // Cropped-out section of the map around the click, shown so the user can
  // verify they clicked the room they meant. Purely visual — no matching.
  const [cropPreview, setCropPreview] = useState<string | null>(null);

  const handleFloorPlanChange = (floorPlanId: string) => {
    const floorPlan = floorPlans.find((fp) => fp.id === floorPlanId);
    if (floorPlan) {
      setSelectedFloorPlan(floorPlan);
      setTempLocation(null);
      setManualRoomNumber('');
      setCropPreview(null);
    }
  };

  const handleLocationSelect = async (location: { x: number; y: number }) => {
    setTempLocation({ ...location, roomNumber: undefined });
    setManualRoomNumber('');
    setCropPreview(null);
    setIsExtracting(true);

    // Show the cropped region immediately so the user can see what they clicked
    // while OCR runs in the background.
    cropRegion(selectedFloorPlan.imageUrl, location.x, location.y, 150)
      .then((dataUrl) => setCropPreview(dataUrl))
      .catch(() => setCropPreview(null));

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
    setCropPreview(null);
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

      {/* Verify card: cropped-out section of the map + editable OCR result */}
      {tempLocation && (
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="font-medium text-sm">
            Is this the room you wanted to click? Please verify.
          </div>

          {/* Cropped section of the map around the click */}
          <div className="flex justify-center">
            {cropPreview ? (
              <img
                src={cropPreview}
                alt="Selected area of the floor plan"
                className="h-40 w-40 rounded-md border bg-white object-contain"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-md border bg-white">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Editable room number — pre-filled by OCR, correct it if it's wrong/gibberish */}
          <div className="space-y-2">
            <Label htmlFor="roomNumber">
              Room / location {isExtracting && '(Detecting…)'}
            </Label>
            <div className="relative">
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
            <p className="text-xs text-gray-500">
              {isExtracting
                ? 'Reading the floor plan…'
                : tempLocation.roomNumber
                ? `Auto-detected "${tempLocation.roomNumber}". If this is wrong or looks like gibberish, type the correct room.`
                : 'No room detected automatically — type the room number or name.'}
            </p>
          </div>

          <div className="text-xs text-gray-500">
            Floor: {selectedFloorPlan.name} · Coordinates: ({tempLocation.x.toFixed(1)}%,{' '}
            {tempLocation.y.toFixed(1)}%)
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleConfirm} className="flex-1" disabled={isExtracting}>
              Yes, confirm this location
            </Button>
            <Button onClick={handleClear} variant="outline" disabled={isExtracting}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
