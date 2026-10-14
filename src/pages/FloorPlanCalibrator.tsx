import { useEffect, useRef, useState } from 'react';
import { floorPlans, FloorPlan } from '@/lib/floorPlans';
import {
  RoomZone,
  DEFAULT_ZONE_RADIUS,
  getRooms,
  saveDraft,
  clearDraft,
  exportRegistryJSON,
  deriveDisplay,
} from '@/lib/floorPlanRooms';
import { extractAllRoomNumbers, preloadOCR } from '@/lib/ocrService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2, Crosshair, ScanLine, Copy, Download, Eraser } from 'lucide-react';
import { toast } from 'sonner';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `room_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Dev-only calibration tool. Click each room to define a zone and label; OCR can
 * pre-fill candidates. Export the JSON and paste it into floorPlanRooms.data.json
 * to ship it. Draft is saved to localStorage so you can test live first.
 */
export default function FloorPlanCalibrator() {
  const [floorPlan, setFloorPlan] = useState<FloorPlan>(floorPlans[0]);
  const [rooms, setRooms] = useState<RoomZone[]>(() => getRooms(floorPlans[0].id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void preloadOCR();
  }, []);

  // Persist to the draft whenever rooms change.
  useEffect(() => {
    saveDraft(floorPlan.id, rooms);
  }, [floorPlan.id, rooms]);

  const switchFloor = (id: string) => {
    const fp = floorPlans.find((f) => f.id === id);
    if (!fp) return;
    setFloorPlan(fp);
    setRooms(getRooms(fp.id));
    setSelectedId(null);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (selectedId) {
      // Move the selected room to the clicked point.
      setRooms((prev) =>
        prev.map((r) => (r.id === selectedId ? { ...r, x: round(x), y: round(y) } : r))
      );
    } else {
      // Add a new room.
      const room: RoomZone = {
        id: newId(),
        label: '',
        display: '',
        x: round(x),
        y: round(y),
        r: DEFAULT_ZONE_RADIUS,
      };
      setRooms((prev) => [...prev, room]);
      setSelectedId(room.id);
    }
  };

  const update = (id: string, patch: Partial<RoomZone>) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const remove = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const autoScan = async () => {
    setScanning(true);
    try {
      const found = await extractAllRoomNumbers(floorPlan.imageUrl);
      if (found.length === 0) {
        toast.info('OCR found no room-number candidates on this plan.');
        return;
      }
      const existing = new Set(rooms.map((r) => r.label.toUpperCase()));
      const additions: RoomZone[] = found
        .filter((f) => !existing.has(f.roomNumber.toUpperCase()))
        .map((f) => ({
          id: newId(),
          label: f.roomNumber,
          display: deriveDisplay(f.roomNumber),
          x: round(f.x),
          y: round(f.y),
          r: DEFAULT_ZONE_RADIUS,
        }));
      setRooms((prev) => [...prev, ...additions]);
      toast.success(`Added ${additions.length} OCR candidate${additions.length === 1 ? '' : 's'}. Review & fix each one.`);
    } catch {
      toast.error('OCR scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const clearFloor = () => {
    if (!confirm(`Remove all ${rooms.length} rooms on ${floorPlan.name}?`)) return;
    setRooms([]);
    clearDraft(floorPlan.id);
    setSelectedId(null);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportRegistryJSON());
      toast.success('Registry JSON copied. Paste it into floorPlanRooms.data.json');
    } catch {
      toast.error('Clipboard copy failed — use Download instead.');
    }
  };

  const downloadJson = () => {
    const blob = new Blob([exportRegistryJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floorPlanRooms.data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const incomplete = rooms.filter((r) => !r.label.trim()).length;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Floor Plan Calibrator</h1>
            <p className="text-sm text-muted-foreground max-w-2xl mt-1">
              Click the map to add a room, then set its label. Select a room and click again to move it.
              Use <strong>Auto-scan</strong> to pre-fill candidates with OCR, review each, then export the
              JSON into <code>floorPlanRooms.data.json</code>.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyJson}>
              <Copy className="w-4 h-4 mr-1" /> Copy JSON
            </Button>
            <Button variant="outline" size="sm" onClick={downloadJson}>
              <Download className="w-4 h-4 mr-1" /> Download
            </Button>
          </div>
        </div>

        <div className="flex gap-3 items-end mb-4 flex-wrap">
          <div className="space-y-1">
            <Label>Floor plan</Label>
            <Select value={floorPlan.id} onValueChange={switchFloor}>
              <SelectTrigger className="w-56">
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
          <Button variant="outline" size="sm" onClick={autoScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ScanLine className="w-4 h-4 mr-1" />}
            Auto-scan (OCR)
          </Button>
          <Button variant="outline" size="sm" onClick={clearFloor} disabled={rooms.length === 0}>
            <Eraser className="w-4 h-4 mr-1" /> Clear floor
          </Button>
          <div className="text-sm text-muted-foreground ml-auto">
            {rooms.length} rooms{incomplete > 0 && <span className="text-amber-500"> · {incomplete} unlabeled</span>}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Map */}
          <div
            ref={containerRef}
            className="relative w-full bg-muted rounded-lg overflow-hidden border cursor-crosshair select-none"
            style={{ paddingBottom: `${(floorPlan.height / floorPlan.width) * 100}%` }}
            onClick={handleMapClick}
          >
            <div className="absolute inset-0">
              <img src={floorPlan.imageUrl} alt={floorPlan.name} className="w-full h-full object-contain" draggable={false} />

              {rooms.map((room) => {
                const selected = room.id === selectedId;
                const unlabeled = !room.label.trim();
                return (
                  <div
                    key={room.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(selected ? null : room.id);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-semibold rounded-sm transition-colors"
                    style={{
                      left: `${room.x}%`,
                      top: `${room.y}%`,
                      width: `${room.r * 2}%`,
                      height: `${room.r * 2}%`,
                      border: `2px solid ${selected ? '#ff7400' : unlabeled ? '#ef4444' : '#22c55e'}`,
                      background: selected ? 'rgba(255,116,0,0.25)' : 'rgba(34,197,94,0.12)',
                      color: '#fff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                    }}
                    title={room.label || '(unlabeled)'}
                  >
                    {room.display || room.label || '?'}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Editor */}
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              {selectedId ? 'Click the map to move the selected room.' : 'Click the map to add a room.'}
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {rooms.length === 0 && (
                <div className="text-sm text-muted-foreground border rounded-lg p-4 text-center">
                  No rooms yet. Click the map or run Auto-scan.
                </div>
              )}
              {rooms.map((room) => {
                const selected = room.id === selectedId;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedId(room.id)}
                    className={`border rounded-lg p-3 space-y-2 cursor-pointer ${
                      selected ? 'border-[#ff7400] ring-1 ring-[#ff7400]' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={room.label}
                        placeholder="Label (e.g. A112)"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const label = e.target.value;
                          // Keep display in sync until the user edits it manually.
                          const autoDisplay = deriveDisplay(label);
                          update(room.id, {
                            label,
                            display:
                              room.display === '' || room.display === deriveDisplay(room.label)
                                ? autoDisplay
                                : room.display,
                          });
                        }}
                        className="h-8"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(room.id);
                        }}
                        className="text-muted-foreground hover:text-red-500 shrink-0"
                        title="Delete room"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] text-muted-foreground">Output</span>
                        <Input
                          value={room.display}
                          placeholder="Output (e.g. 112)"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => update(room.id, { display: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="w-28">
                        <span className="text-[10px] text-muted-foreground">Size {room.r.toFixed(1)}%</span>
                        <input
                          type="range"
                          min={1}
                          max={15}
                          step={0.5}
                          value={room.r}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => update(room.id, { r: Number(e.target.value) })}
                          className="w-full accent-[#ff7400]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
