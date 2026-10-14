import committed from './floorPlanRooms.data.json';

/**
 * A room zone on a floor plan. Positions are percentages (0-100) relative to the
 * image, so they stay valid at any render size. A zone is a square centred on
 * (x, y) with half-size `r` (also in %).
 *
 * `label`   — the canonical room label as printed on the plan, e.g. "A112".
 * `display` — what we actually output to the user, e.g. "112".
 */
export interface RoomZone {
  id: string;
  label: string;
  display: string;
  x: number;
  y: number;
  r: number;
}

export type RoomRegistry = Record<string, RoomZone[]>;

export const DEFAULT_ZONE_RADIUS = 4;

const COMMITTED = committed as RoomRegistry;
const DRAFT_KEY = 'lyfind:floorplan-rooms';

// ---------------------------------------------------------------------------
// Draft storage — the calibration tool writes here so changes can be tested
// immediately, before being committed into floorPlanRooms.data.json.
// ---------------------------------------------------------------------------
function readDraft(): RoomRegistry {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as RoomRegistry) : {};
  } catch {
    return {};
  }
}

export function saveDraft(floorPlanId: string, rooms: RoomZone[]): void {
  if (typeof localStorage === 'undefined') return;
  const draft = readDraft();
  draft[floorPlanId] = rooms;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(floorPlanId?: string): void {
  if (typeof localStorage === 'undefined') return;
  if (!floorPlanId) {
    localStorage.removeItem(DRAFT_KEY);
    return;
  }
  const draft = readDraft();
  delete draft[floorPlanId];
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

/** Full registry as a pretty JSON string — ready to paste into the data file. */
export function exportRegistryJSON(): string {
  const draft = readDraft();
  const merged: RoomRegistry = {};
  const keys = new Set([...Object.keys(COMMITTED), ...Object.keys(draft)]);
  for (const key of keys) {
    merged[key] = draft[key]?.length ? draft[key] : COMMITTED[key] ?? [];
  }
  return JSON.stringify(merged, null, 2);
}

/**
 * Rooms for a floor plan. A local draft (if present and non-empty) wins over the
 * committed data so you can calibrate and test without a rebuild. In production,
 * with no draft, this returns exactly the committed registry.
 */
export function getRooms(floorPlanId: string): RoomZone[] {
  const draft = readDraft()[floorPlanId];
  if (draft && draft.length) return draft;
  return COMMITTED[floorPlanId] ?? [];
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** The room whose zone contains the point, or null. Ties → nearest centre. */
export function findRoomAtPoint(floorPlanId: string, x: number, y: number): RoomZone | null {
  const hits = getRooms(floorPlanId).filter(
    (room) => Math.abs(x - room.x) <= room.r && Math.abs(y - room.y) <= room.r
  );
  if (hits.length === 0) return null;
  return hits.reduce((a, b) => (dist(x, y, b.x, b.y) < dist(x, y, a.x, a.y) ? b : a));
}

/** Nearest room centre within `maxDistance` (% of image), or null. */
export function findNearestRoom(
  floorPlanId: string,
  x: number,
  y: number,
  maxDistance = 6
): RoomZone | null {
  const rooms = getRooms(floorPlanId);
  if (rooms.length === 0) return null;
  let nearest = rooms[0];
  let best = dist(x, y, nearest.x, nearest.y);
  for (const room of rooms) {
    const d = dist(x, y, room.x, room.y);
    if (d < best) {
      best = d;
      nearest = room;
    }
  }
  return best <= maxDistance ? nearest : null;
}

/** Zone first, then nearest within threshold. The runtime resolver. */
export function resolveRoom(floorPlanId: string, x: number, y: number): RoomZone | null {
  return findRoomAtPoint(floorPlanId, x, y) ?? findNearestRoom(floorPlanId, x, y);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default output for a label: everything from the first digit on ("A112" → "112"). */
export function deriveDisplay(label: string): string {
  const m = label.match(/\d.*$/);
  return (m ? m[0] : label).replace(/\s+/g, '').trim();
}

const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Does OCR text agree with a room's registry entry? Lenient on purpose — OCR is
 * only here to corroborate, not to override ground truth.
 */
export function ocrAgreesWith(ocrText: string, room: RoomZone): boolean {
  const o = normalize(ocrText);
  if (o.length < 2) return false;
  const label = normalize(room.label);
  const display = normalize(room.display);
  return (
    (label.length >= 2 && (o.includes(label) || label.includes(o))) ||
    (display.length >= 2 && (o.includes(display) || display.includes(o)))
  );
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}
