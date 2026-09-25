# OCR Integration for Floor Plans

## Overview

This document describes how to integrate OCR (Optical Character Recognition) to automatically detect room numbers when users pin locations on floor plans.

## Your Floor Plans

You have uploaded three floor plan images:
- `public/floor-plans/ground_floor.png` - Ground Floor
- `public/floor-plans/2nd_floor.png` - 2nd Floor  
- `public/floor-plans/3rd_4th_floor.png` - 3rd & 4th Floor

These floor plans contain room numbers in boxes, which can be automatically extracted using OCR.

## Installation

### 1. Install Tesseract.js

```bash
npm install tesseract.js
```

### 2. Install Additional Dependencies

```bash
npm install lucide-react  # For loading spinner icon
```

## Implementation

### 1. Floor Plans Configuration

The floor plans are already configured in `src/lib/floorPlans.ts`:

```typescript
export const floorPlans: FloorPlan[] = [
  {
    id: 'ground-floor',
    name: 'Ground Floor',
    building: 'Main Building',
    floor: 'Ground',
    imageUrl: '/floor-plans/ground_floor.png',
    width: 1920,
    height: 1080,
  },
  {
    id: '2nd-floor',
    name: '2nd Floor',
    building: 'Main Building',
    floor: '2',
    imageUrl: '/floor-plans/2nd_floor.png',
    width: 1920,
    height: 1080,
  },
  {
    id: '3rd-4th-floor',
    name: '3rd & 4th Floor',
    building: 'Main Building',
    floor: '3-4',
    imageUrl: '/floor-plans/3rd_4th_floor.png',
    width: 1920,
    height: 1080,
  },
];
```

### 2. OCR Service

The OCR service (`src/lib/ocrService.ts`) provides:

- `extractRoomNumber()` - Extract room number from a specific area
- `extractAllRoomNumbers()` - Pre-process entire floor plan
- `findNearestRoom()` - Find nearest room to clicked coordinates

### 3. Location Picker with OCR

Use `LocationPickerWithOCR` component in your item post form:

```typescript
import { LocationPickerWithOCR } from '@/components/LocationPickerWithOCR';

function ItemPostForm() {
  const [location, setLocation] = useState(null);

  return (
    <form>
      {/* Other form fields */}
      
      <LocationPickerWithOCR
        value={location}
        onChange={(newLocation) => {
          setLocation(newLocation);
          // newLocation contains:
          // - floorPlanId: 'ground-floor' | '2nd-floor' | '3rd-4th-floor'
          // - x: number (0-100)
          // - y: number (0-100)
          // - roomNumber: string | undefined
        }}
      />
    </form>
  );
}
```

## Database Schema

Update your Prisma schema to store room numbers:

```prisma
model Item {
  id            String      @id @default(cuid())
  type          ItemType
  title         String
  description   String
  category      ItemCategory
  status        ItemStatus  @default(ACTIVE)
  
  // Floor plan location
  floorPlanId   String
  locationX     Float       // X coordinate as percentage (0-100)
  locationY     Float       // Y coordinate as percentage (0-100)
  roomNumber    String?     // Auto-detected via OCR or manually entered
  locationDesc  String?     // Optional additional description
  
  contactEmail  String?
  contactPhone  String?
  userId        String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  user          User        @relation(fields: [userId], references: [id])
  floorPlan     FloorPlan   @relation(fields: [floorPlanId], references: [id])
  photos        Photo[]
  matchesAsLost Match[]     @relation("LostItem")
  matchesAsFound Match[]    @relation("FoundItem")
  
  @@index([type, status, createdAt])
  @@index([category])
  @@index([userId])
  @@index([floorPlanId])
  @@index([roomNumber])
}

model FloorPlan {
  id           String   @id @default(cuid())
  name         String
  buildingName String
  imageUrl     String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  items        Item[]
  
  @@index([buildingName])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_room_number_to_items
```

## How It Works

### User Flow

1. User selects a floor from dropdown (Ground Floor, 2nd Floor, or 3rd & 4th Floor)
2. Floor plan image displays
3. User clicks on the floor plan where they lost/found the item
4. System automatically:
   - Captures the clicked coordinates (x, y as percentages)
   - Extracts a 100x100px region around the click point
   - Runs OCR on that region using Tesseract.js
   - Detects room number (e.g., "101", "A-205", "Room 301")
   - Populates the room number field
5. User can manually edit the room number if OCR is incorrect
6. User confirms the location
7. System saves: floorPlanId, x, y, and roomNumber

### OCR Process

```typescript
// When user clicks at (45%, 62%) on the floor plan
const result = await extractRoomNumber(
  '/floor-plans/ground_floor.png',
  45,  // x percentage
  62,  // y percentage
  50   // radius in pixels
);

// Result:
{
  roomNumber: "101",
  confidence: 87.5,
  nearbyText: ["101", "Classroom"]
}
```

### Room Number Patterns

The OCR service looks for these patterns:
- Simple numbers: `101`, `205`, `3042`
- With prefix: `A-101`, `B-205`
- With suffix: `101A`, `205B`
- With text: `Room 101`, `Office 205`

## API Integration

### Creating an Item with Location

```typescript
// POST /api/items
{
  "title": "Lost Blue Backpack",
  "description": "Blue backpack with laptop inside",
  "type": "lost",
  "category": "bags",
  "floorPlanId": "ground-floor",
  "locationX": 45.5,
  "locationY": 62.3,
  "roomNumber": "101",
  "photos": [...]
}
```

### Searching by Room Number

```typescript
// GET /api/items?roomNumber=101
// Returns all items lost/found in room 101

// GET /api/items?floorPlanId=ground-floor
// Returns all items on ground floor
```

## Displaying Items on Floor Plan

When showing items on the browse page with floor plan view:

```typescript
import { FloorPlanMap } from '@/components/FloorPlanMap';

function BrowsePage() {
  const items = useItems(); // Fetch items from API
  const [selectedFloor, setSelectedFloor] = useState('ground-floor');
  
  const floorPlan = floorPlans.find(fp => fp.id === selectedFloor);
  
  // Convert items to map pins
  const pins = items
    .filter(item => item.floorPlanId === selectedFloor)
    .map(item => ({
      id: item.id,
      x: item.locationX,
      y: item.locationY,
      title: `${item.title} ${item.roomNumber ? `(Room ${item.roomNumber})` : ''}`,
      type: item.type,
    }));

  return (
    <div>
      <FloorPlanSelector value={selectedFloor} onChange={setSelectedFloor} />
      <FloorPlanMap
        floorPlan={floorPlan}
        pins={pins}
        interactive={false}
      />
    </div>
  );
}
```

## Performance Optimization

### Pre-processing Floor Plans (Optional)

For better performance, you can pre-process floor plans to extract all room numbers once:

```typescript
// Run this once when floor plans are uploaded
import { extractAllRoomNumbers } from '@/lib/ocrService';

async function preprocessFloorPlan(floorPlanId: string) {
  const floorPlan = getFloorPlan(floorPlanId);
  const rooms = await extractAllRoomNumbers(floorPlan.imageUrl);
  
  // Store in database or cache
  await prisma.floorPlanRoomCache.createMany({
    data: rooms.map(room => ({
      floorPlanId,
      roomNumber: room.roomNumber,
      x: room.x,
      y: room.y,
      confidence: room.confidence,
    })),
  });
}
```

Then use cached data for faster lookups:

```typescript
// When user clicks, find nearest cached room
const cachedRooms = await prisma.floorPlanRoomCache.findMany({
  where: { floorPlanId: selectedFloorPlan.id },
});

const nearest = findNearestRoom(clickX, clickY, cachedRooms);
if (nearest && nearest.distance < 5) {
  setRoomNumber(nearest.roomNumber);
}
```

## Troubleshooting

### OCR Not Detecting Room Numbers

**Problem**: OCR returns null or incorrect room number

**Solutions**:
1. Increase the search radius (default is 50px, try 75-100px)
2. Ensure floor plan images have good contrast
3. Check if room numbers are clearly visible in the PNG
4. Manually edit the room number field

### OCR is Slow

**Problem**: Takes 3-5 seconds to detect room number

**Solutions**:
1. Reduce search radius to 30-40px
2. Pre-process floor plans and cache room locations
3. Show loading indicator to user
4. Consider server-side OCR for better performance

### Wrong Room Detected

**Problem**: OCR detects nearby room instead of clicked room

**Solutions**:
1. Reduce search radius to be more precise
2. Use pre-processed room cache with nearest neighbor search
3. Allow manual editing (already implemented)
4. Improve floor plan image quality

## Testing

### Test OCR Functionality

```typescript
import { extractRoomNumber } from '@/lib/ocrService';

// Test on ground floor
const result = await extractRoomNumber(
  '/floor-plans/ground_floor.png',
  50,  // Middle of image
  50,
  50
);

console.log('Detected room:', result.roomNumber);
console.log('Confidence:', result.confidence);
console.log('Nearby text:', result.nearbyText);
```

### Test Cases

1. Click directly on a room number - should detect correctly
2. Click between two rooms - should detect nearest room
3. Click on hallway - should detect nearby room or return null
4. Click on edge of floor plan - should handle gracefully
5. Manual edit - should save user's input

## Future Enhancements

1. **Smart Suggestions**: Show list of nearby rooms when OCR is uncertain
2. **Room Search**: Allow users to search for room number instead of clicking
3. **Autocomplete**: Suggest room numbers as user types
4. **Validation**: Verify room number exists on selected floor
5. **Heatmap**: Show which rooms have most lost/found items
6. **Navigation**: Provide directions to room location

## Summary

The OCR integration provides:
- ✅ Automatic room number detection from floor plans
- ✅ Manual editing if OCR is incorrect
- ✅ Percentage-based coordinates for responsive display
- ✅ Support for all three floor plans
- ✅ Fast user experience with loading indicators
- ✅ Searchable room numbers in database

Users can now quickly report lost/found items by simply clicking on the floor plan, and the system will automatically detect which room they're referring to!
