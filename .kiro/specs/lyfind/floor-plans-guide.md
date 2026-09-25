# Floor Plans Setup Guide

## Overview

LyFind uses PNG images of building floor plans for location selection. Users click directly on the floor plan to pin where they lost or found an item. The system automatically detects room numbers using OCR (Optical Character Recognition) from the clicked location.

## Your Floor Plans

The following floor plans are configured for your building:

1. **Ground Floor** (`ground_floor.png`) - 1st Floor
2. **2nd Floor** (`2nd_floor.png`) - 2nd Floor  
3. **3rd & 4th Floor** (`3rd_4th_floor.png`) - 3rd and 4th Floors

These files are located in `public/floor-plans/`.

## OCR Room Detection

### How It Works

When a user clicks on the floor plan:
1. System captures the click coordinates (x, y percentages)
2. Extracts a 150x150 pixel region around the clicked point
3. Applies image processing (grayscale, contrast enhancement)
4. Runs Tesseract.js OCR to detect text
5. Searches for room number patterns (e.g., "101", "A-204", "CS Lab")
6. Returns the detected room number with confidence score
7. User can edit if detection is incorrect

### Supported Room Number Formats

The OCR system recognizes these patterns:
- Standard numbers: `101`, `204`, `3045`
- With prefix: `A-201`, `B-304`
- With suffix: `304B`, `101A`
- With text: `Room 101`, `CS101`, `AB204`

### Improving OCR Accuracy

For best results, your floor plan images should have:
- **Clear text**: Room numbers should be legible at 12pt or larger
- **High contrast**: Dark text on light background (or vice versa)
- **Simple fonts**: Sans-serif fonts work best
- **Consistent placement**: Room numbers in center of rooms
- **No rotation**: Text should be horizontal
- **Clean boxes**: Room boundaries clearly defined

## Floor Plan Image Requirements

### Image Specifications
- **Format**: PNG (recommended) or JPEG
- **Resolution**: Minimum 1920x1080px, maximum 4096x4096px
- **File Size**: Under 5MB per image
- **Aspect Ratio**: Any (will be displayed proportionally)
- **Quality**: Clear, readable labels and room numbers

### Best Practices
1. **High Contrast**: Ensure walls, rooms, and labels are clearly visible
2. **Labeled**: Include room numbers, building names, and key landmarks
3. **Oriented**: North should be at the top (or indicate orientation)
4. **Clean**: Remove unnecessary details that might confuse users
5. **Consistent**: Use the same style/format for all floor plans

## Preparing Floor Plans

### Step 1: Obtain Floor Plans
- Request architectural drawings from facilities management
- Use existing campus maps
- Create simplified versions if originals are too detailed

### Step 2: Edit for Clarity
Using image editing software (Photoshop, GIMP, etc.):
1. Crop to show only the relevant building/floor
2. Increase contrast for better visibility
3. Add or enhance labels for rooms and areas
4. Remove sensitive information (security systems, etc.)
5. Optimize file size while maintaining quality

### Step 3: Naming Convention
Use a consistent naming pattern:
```
[building-code]-floor-[number].png

Examples:
- main-library-floor-1.png
- science-building-floor-2.png
- student-center-floor-ground.png
```

## Uploading Floor Plans

### Option 1: Direct File Upload (Development)

Place floor plan images in the `public/floor-plans/` directory:
```
public/
  floor-plans/
    main-library-floor-1.png
    main-library-floor-2.png
    science-building-floor-1.png
    science-building-floor-2.png
    student-center-floor-ground.png
```

### Option 2: Admin Interface (Production)

Use the admin dashboard to upload floor plans:

1. Navigate to `/admin/floor-plans`
2. Click "Upload New Floor Plan"
3. Fill in the form:
   - **Building Name**: e.g., "Main Library"
   - **Floor**: e.g., "1", "2", "Ground"
   - **Display Name**: e.g., "Main Library - Floor 1"
   - **Upload Image**: Select the PNG file
4. Click "Save"

The system will:
- Validate the image format and size
- Upload to cloud storage
- Generate a thumbnail
- Add to the database
- Make available for location selection

## Configuring Floor Plans in Code

### Current Configuration

Edit `src/lib/floorPlans.ts`:

```typescript
export interface FloorPlan {
  id: string;
  name: string;
  displayName: string;
  imageUrl: string;
  floor: string;
}

export const floorPlans: FloorPlan[] = [
  {
    id: 'ground-floor',
    name: 'Ground Floor',
    displayName: '1st Floor (Ground)',
    imageUrl: '/floor-plans/ground_floor.png',
    floor: '1',
  },
  {
    id: '2nd-floor',
    name: '2nd Floor',
    displayName: '2nd Floor',
    imageUrl: '/floor-plans/2nd_floor.png',
    floor: '2',
  },
  {
    id: '3rd-4th-floor',
    name: '3rd & 4th Floor',
    displayName: '3rd & 4th Floor',
    imageUrl: '/floor-plans/3rd_4th_floor.png',
    floor: '3-4',
  },
];

export function getFloorPlan(id: string): FloorPlan | undefined {
  return floorPlans.find(plan => plan.id === id);
}
```

### Database Schema

Floor plans and locations are stored with OCR-detected room numbers:

```prisma
model Item {
  id           String   @id @default(cuid())
  // ... other fields ...
  
  floorPlanId  String
  locationX    Float    // Percentage (0-100)
  locationY    Float    // Percentage (0-100)
  roomNumber   String?  // OCR-detected or manually entered
  locationDesc String?  // Optional additional description
  
  // ... relations ...
}
```

## Location Storage

When a user pins a location on a floor plan, the system stores:

```typescript
{
  floorPlanId: "ground-floor",
  locationX: 45.5,      // Percentage from left (0-100)
  locationY: 62.3,      // Percentage from top (0-100)
  roomNumber: "101",    // OCR-detected room number
  locationDesc: "Near the reference desk" // Optional user input
}
```

This percentage-based system ensures pins remain accurate regardless of:
- Screen size
- Image resolution
- Zoom level

## User Experience with OCR

### Posting an Item

1. User fills in item details (title, description, photos)
2. Clicks "Select Location"
3. Chooses floor from dropdown (Ground, 2nd, or 3rd & 4th)
4. Floor plan displays
5. User clicks on the floor plan where they lost/found the item
6. System shows "Detecting room number..." loading indicator
7. OCR extracts room number from clicked area (e.g., "101")
8. Room number appears in editable field
9. User can:
   - Keep the detected room number
   - Edit if incorrect
   - Add additional description
10. Clicks "Confirm Location"

### If OCR Fails

If the system cannot detect a room number:
- Shows message: "Could not detect room number. Please enter manually."
- User can type the room number manually
- Location is still saved with coordinates

### Viewing Items

1. User browses items or views item details
2. Floor plan displays with pin showing exact location
3. User can see which floor and room number
4. Hovering over pin shows:
   - Item title
   - Room number (if detected)
5. Clicking pin opens item details

## OCR Testing and Calibration

### Testing OCR Accuracy

Test the OCR system with your floor plans:

```typescript
// Test script: test-ocr.ts
import { detectRoomNumberLarge } from '@/lib/ocrService';

const testCases = [
  { floor: 'ground_floor.png', x: 30, y: 40, expected: '101' },
  { floor: '2nd_floor.png', x: 50, y: 50, expected: '201' },
  { floor: '3rd_4th_floor.png', x: 60, y: 30, expected: '301' },
];

for (const test of testCases) {
  const result = await detectRoomNumberLarge(
    `/floor-plans/${test.floor}`,
    test.x,
    test.y
  );
  
  console.log(`Floor: ${test.floor}`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Detected: ${result.roomNumber}`);
  console.log(`Confidence: ${result.confidence}%`);
  console.log(`Match: ${result.roomNumber === test.expected ? '✓' : '✗'}`);
  console.log('---');
}
```

### Adjusting OCR Parameters

If OCR accuracy is low, adjust these parameters in `ocrService.ts`:

```typescript
// Increase region size for larger room labels
const regionSize = 200; // Default: 150

// Adjust threshold for binary conversion
const enhanced = avg > 140 ? 255 : 0; // Default: 128

// Modify whitelist for specific characters
tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-',

// Lower confidence threshold if needed
if (match && result.data.confidence > 40) { // Default: 50
```

## Testing Floor Plans

### Checklist

- [ ] All floor plans are uploaded to `public/floor-plans/`
- [ ] Images load quickly (under 2 seconds)
- [ ] Floor plans display correctly on mobile devices
- [ ] Pins appear at correct locations
- [ ] Floor selector shows all 3 options
- [ ] Clicking on floor plan creates pin
- [ ] OCR detects room numbers accurately (>70% success rate)
- [ ] Manual room number entry works when OCR fails
- [ ] Pin coordinates are stored correctly
- [ ] Floor plans work offline (PWA cached)

### Test Scenarios

1. **Pin Accuracy**: Place pin, save, reload - pin should be in same location
2. **Multiple Floors**: Switch between floors - correct floor plan should display
3. **OCR Detection**: Click on various rooms - room numbers should be detected
4. **Manual Override**: Edit detected room number - should save correctly
5. **Responsive**: Test on phone, tablet, desktop - floor plan should scale properly
6. **Offline**: Go offline, view item - floor plan should load from cache
7. **Performance**: Load page with 50+ pins - should render smoothly
8. **OCR Edge Cases**: Test corners, hallways, unlabeled areas - should handle gracefully

## Maintenance

### Updating Floor Plans

If building layouts change:

1. Upload new floor plan image with same filename
2. Clear CDN cache if using one
3. Service worker will update cached version
4. Existing pins remain at same percentage coordinates
5. Verify pins still make sense on new layout

### Archiving Old Floor Plans

If a building is demolished or renovated:

1. Mark floor plan as inactive in database
2. Keep historical data for reference
3. Items with old floor plan still display correctly
4. New items cannot select archived floor plans

## Troubleshooting

### Floor Plan Not Displaying

**Problem**: Image doesn't load
- Check file path is correct
- Verify image is in public/floor-plans/ directory
- Check browser console for 404 errors
- Ensure Next.js Image component is configured

**Problem**: Image is blurry
- Use higher resolution source image
- Check image compression settings
- Verify image dimensions in configuration

### Pin Location Issues

**Problem**: Pin appears in wrong location
- Verify percentage calculations are correct
- Check container dimensions are set
- Ensure floor plan image has loaded before calculating position

**Problem**: Pin doesn't appear
- Check z-index of pin element
- Verify pin coordinates are within 0-100 range
- Check CSS for hidden overflow

### OCR Issues

**Problem**: Room numbers not detected
- Check image quality and contrast
- Verify room labels are readable
- Increase OCR region size in `ocrService.ts`
- Test with different threshold values
- Ensure Tesseract.js is loaded properly

**Problem**: Wrong room numbers detected
- Adjust OCR confidence threshold
- Modify character whitelist
- Enhance image preprocessing (contrast, binary threshold)
- Add custom room number patterns to regex

**Problem**: OCR is slow
- Reduce region size (trade-off with accuracy)
- Implement server-side OCR for better performance
- Cache OCR results for frequently clicked areas
- Show loading indicator to manage user expectations

### Performance Issues

**Problem**: Floor plans load slowly
- Compress images further (use tools like TinyPNG)
- Implement lazy loading for floor plans
- Use CDN for image delivery
- Generate and use thumbnails for list views

## Future Enhancements

Potential improvements to consider:

1. **Server-Side OCR**: Move OCR to backend for better performance and caching
2. **OCR Training**: Train custom Tesseract model on your specific floor plans
3. **Room Database**: Pre-populate room numbers and locations for instant lookup
4. **Zoom and Pan**: Allow users to zoom into floor plan for precise pinning
5. **Search**: Search for room numbers or locations
6. **Heatmap**: Show areas with most lost/found items
7. **3D Views**: Interactive 3D building models
8. **Indoor Navigation**: Directions to pinned location
9. **AR Integration**: Use phone camera to show location in real-world view
10. **Smart Suggestions**: Suggest nearby rooms based on OCR confidence

## Resources

- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [OCR Best Practices](https://github.com/tesseract-ocr/tesseract/wiki/ImproveQuality)
- [TinyPNG - Image Compression](https://tinypng.com/)
- [GIMP - Free Image Editor](https://www.gimp.org/)
