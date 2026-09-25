# OCR Room Number Detection

## Overview

LyFind automatically detects room numbers from floor plan images when users click to pin a location. This feature uses Tesseract.js for client-side OCR (Optical Character Recognition).

## How It Works

### User Flow

1. User selects a floor (Ground, 2nd, or 3rd & 4th)
2. Floor plan image displays
3. User clicks on the location where they lost/found an item
4. System shows "Detecting room number..." loading indicator
5. OCR extracts room number from clicked area
6. Room number appears in an editable field
7. User can:
   - Accept the detected room number
   - Edit if incorrect
   - Enter manually if detection failed
8. User confirms location

### Technical Flow

```typescript
// 1. User clicks on floor plan at coordinates (x%, y%)
handleMapClick(x: 45.5, y: 62.3)

// 2. Extract region around click point
const region = extractRegion(floorPlanImage, x, y, 150px)

// 3. Preprocess image for better OCR
const processed = enhanceContrast(region)
const binary = applyThreshold(processed, 128)

// 4. Run OCR
const result = await Tesseract.recognize(binary, 'eng')

// 5. Extract room number from text
const roomNumber = extractRoomPattern(result.text)
// Examples: "101", "A-204", "CS Lab"

// 6. Return result with confidence
return {
  roomNumber: "101",
  confidence: 87.5
}
```

## Configuration

### OCR Service (`src/lib/ocrService.ts`)

Key parameters you can adjust:

```typescript
// Region size around clicked point
const regionSize = 150; // pixels (default: 150)

// Binary threshold for image enhancement
const threshold = 128; // 0-255 (default: 128)

// Character whitelist (what characters to look for)
tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-'

// Minimum confidence to accept result
const minConfidence = 50; // percentage (default: 50)
```

### Room Number Patterns

The system recognizes these regex patterns:

```typescript
const patterns = [
  /\b([A-Z]?-?\d{3,4}[A-Z]?)\b/i,  // 101, A-201, 304B
  /\b(Room\s+\d{3,4})\b/i,          // Room 101
  /\b([A-Z]{1,2}\d{3,4})\b/i,       // CS101, AB204
];
```

Add custom patterns for your specific room numbering system.

## Optimization Tips

### For Your Floor Plans

Since your floor plans have room numbers in boxes:

1. **Increase Region Size**: Larger boxes need larger extraction regions
   ```typescript
   const regionSize = 200; // Increase from 150
   ```

2. **Adjust Threshold**: If room numbers are light on dark background
   ```typescript
   const enhanced = avg < 128 ? 255 : 0; // Invert threshold
   ```

3. **Add Custom Patterns**: If you have specific room formats
   ```typescript
   /\b([A-Z]{2}-\d{3})\b/i,  // e.g., "CS-101"
   ```

### Performance Optimization

OCR can be slow on large images. Optimize by:

1. **Reduce Region Size**: Smaller regions = faster processing
   ```typescript
   const regionSize = 100; // Faster but less accurate
   ```

2. **Server-Side OCR**: Move OCR to backend API
   ```typescript
   // Client sends coordinates, server does OCR
   const result = await fetch('/api/ocr/detect-room', {
     method: 'POST',
     body: JSON.stringify({ imageUrl, x, y })
   });
   ```

3. **Cache Results**: Store OCR results for common click areas
   ```typescript
   const cacheKey = `${floorPlanId}-${Math.round(x)}-${Math.round(y)}`;
   const cached = localStorage.getItem(cacheKey);
   if (cached) return JSON.parse(cached);
   ```

4. **Debounce Clicks**: Prevent multiple OCR calls
   ```typescript
   const debouncedOCR = debounce(detectRoomNumber, 500);
   ```

## Testing OCR Accuracy

### Test Script

Create `scripts/test-ocr.ts`:

```typescript
import { detectRoomNumberLarge } from '@/lib/ocrService';

const testCases = [
  // Ground Floor
  { floor: 'ground_floor.png', x: 20, y: 30, expected: '101' },
  { floor: 'ground_floor.png', x: 50, y: 40, expected: '102' },
  { floor: 'ground_floor.png', x: 80, y: 50, expected: '103' },
  
  // 2nd Floor
  { floor: '2nd_floor.png', x: 25, y: 35, expected: '201' },
  { floor: '2nd_floor.png', x: 55, y: 45, expected: '202' },
  
  // 3rd & 4th Floor
  { floor: '3rd_4th_floor.png', x: 30, y: 40, expected: '301' },
  { floor: '3rd_4th_floor.png', x: 30, y: 70, expected: '401' },
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const result = await detectRoomNumberLarge(
      `/floor-plans/${test.floor}`,
      test.x,
      test.y
    );
    
    const match = result.roomNumber === test.expected;
    
    console.log(`\n${match ? '✓' : '✗'} ${test.floor} @ (${test.x}, ${test.y})`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Detected: ${result.roomNumber || 'none'}`);
    console.log(`  Confidence: ${result.confidence.toFixed(1)}%`);
    
    if (match) passed++;
    else failed++;
  }

  console.log(`\n\nResults: ${passed} passed, ${failed} failed`);
  console.log(`Accuracy: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
}

runTests();
```

Run with:
```bash
npx tsx scripts/test-ocr.ts
```

### Accuracy Goals

- **Excellent**: >90% accuracy
- **Good**: 70-90% accuracy
- **Acceptable**: 50-70% accuracy (with manual override)
- **Poor**: <50% accuracy (consider alternative approaches)

## Fallback Strategies

If OCR accuracy is low:

### 1. Manual Entry Only
Remove OCR, let users type room numbers:
```typescript
// Disable OCR
const USE_OCR = false;

if (USE_OCR) {
  const result = await detectRoomNumber(imageUrl, x, y);
} else {
  // Just save coordinates, user enters room manually
  onPinAdd({ x, y });
}
```

### 2. Room Database Lookup
Pre-populate room locations:
```typescript
const roomLocations = {
  'ground-floor': {
    '101': { x: 20, y: 30, width: 10, height: 8 },
    '102': { x: 50, y: 40, width: 10, height: 8 },
  },
};

function findRoomByCoordinates(floorId: string, x: number, y: number) {
  const rooms = roomLocations[floorId];
  for (const [roomNum, bounds] of Object.entries(rooms)) {
    if (isWithinBounds(x, y, bounds)) {
      return roomNum;
    }
  }
  return null;
}
```

### 3. Hybrid Approach
Try OCR first, fall back to database:
```typescript
let roomNumber = await detectRoomNumber(imageUrl, x, y);

if (!roomNumber || roomNumber.confidence < 60) {
  roomNumber = findRoomByCoordinates(floorId, x, y);
}

if (!roomNumber) {
  // Prompt user for manual entry
}
```

## API Endpoints

### Detect Room Number

**POST** `/api/ocr/detect-room`

Request:
```json
{
  "imageUrl": "/floor-plans/ground_floor.png",
  "x": 45.5,
  "y": 62.3
}
```

Response:
```json
{
  "roomNumber": "101",
  "confidence": 87.5
}
```

Error Response:
```json
{
  "roomNumber": null,
  "confidence": 0
}
```

## Troubleshooting

### OCR Not Working

**Problem**: Tesseract.js fails to load
- Check browser console for errors
- Verify Tesseract.js is installed: `npm list tesseract.js`
- Check CDN availability (Tesseract loads worker from CDN)
- Try local worker: Download and host Tesseract worker files

**Problem**: Always returns null
- Check image CORS settings
- Verify image URL is accessible
- Test with a simple image first
- Check browser console for OCR errors

### Poor Accuracy

**Problem**: Wrong room numbers detected
- Increase region size: `regionSize = 200`
- Adjust binary threshold: Try values 100-150
- Check image quality: Ensure text is readable
- Add preprocessing: Sharpen, denoise, etc.

**Problem**: No room numbers detected
- Verify text is horizontal (not rotated)
- Check text size (should be >12pt)
- Ensure sufficient contrast
- Try different Tesseract language: `'eng+osd'`

### Performance Issues

**Problem**: OCR is too slow (>3 seconds)
- Reduce region size: `regionSize = 100`
- Move to server-side OCR
- Implement caching
- Show better loading indicators

**Problem**: Blocks UI during detection
- Use Web Workers for OCR
- Implement async/await properly
- Add timeout: Cancel after 5 seconds

## Advanced Features

### Multi-Language Support

If room labels are in multiple languages:
```typescript
const result = await Tesseract.recognize(canvas, 'eng+spa+fra');
```

### Custom Training

Train Tesseract on your specific floor plans:
1. Create training data from your floor plans
2. Generate .traineddata file
3. Load custom model in Tesseract.js

### Confidence-Based UI

Show different UI based on confidence:
```typescript
if (confidence > 80) {
  // High confidence - auto-fill, green indicator
  showSuccess("Room detected: " + roomNumber);
} else if (confidence > 50) {
  // Medium confidence - suggest, yellow indicator
  showWarning("Possible room: " + roomNumber + " (please verify)");
} else {
  // Low confidence - manual entry, red indicator
  showError("Could not detect room. Please enter manually.");
}
```

### Analytics

Track OCR performance:
```typescript
analytics.track('ocr_detection', {
  floorPlanId,
  confidence,
  success: confidence > 60,
  manualOverride: userEditedRoomNumber,
  detectionTime: endTime - startTime,
});
```

## Resources

- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Tesseract OCR Best Practices](https://github.com/tesseract-ocr/tesseract/wiki/ImproveQuality)
- [Image Preprocessing for OCR](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)
- [Web Workers for Performance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
