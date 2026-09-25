# Post Page Floor Plan Update

## File to Update
`src/pages/lycean/Post.tsx`

## Changes Needed

### 1. Remove Old Location State and Handlers

Remove these lines (around line 40-55):
```typescript
const [showMapModal, setShowMapModal] = useState(false)

const handleMapClick = (locationName: string, coords: {lat: number, lng: number}) => {
  setLocation(locationName)
  setLocationCoords(coords)
  setShowMapModal(false)
}

const handleUseMyLocation = () => {
  // In real app, use geolocation API
  const mockLocation = {
    name: 'Current Location',
    coords: { lat: 14.8167, lng: 120.2833 }
  }
  setLocation(mockLocation.name)
  setLocationCoords(mockLocation.coords)
  setShowMapModal(false)
}
```

### 2. Replace Location UI Section

Find this section (around line 348-380):
```typescript
<button
  type="button"
  onClick={() => setShowMapModal(true)}
  className="w-full aspect-[16/9] rounded-xl lg:rounded-2xl border-2 border-dashed border-white/20 hover:border-[#ff7400]/50 bg-gradient-to-br from-[#2f1632] to-[#1a0d1c] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden group"
>
  {location ? (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#2f1632] to-[#1a0d1c] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#ff7400]/20 border border-[#ff7400]/30 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-[#ff7400]" />
          </div>
          <h4 className="text-white font-medium text-lg mb-2">{location}</h4>
          {locationCoords && (
            <p className="text-white/50 text-sm">
              Lat: {locationCoords.lat}, Lng: {locationCoords.lng}
            </p>
          )}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 px-4 py-2 bg-[#ff7400] text-white rounded-xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Change Location
      </div>
    </>
  ) : (
    <>
      <MapPin className="w-12 h-12 text-white/40 mb-3" />
      <span className="text-white/60 text-base lg:text-lg font-medium mb-2">Click to Select Location</span>
      <span className="text-white/40 text-sm">Mark the location on campus map</span>
    </>
  )}
</button>
```

Replace with:
```typescript
<LocationPickerWithOCR
  value={floorPlanLocation}
  onChange={setFloorPlanLocation}
/>
```

### 3. Remove Campus Map Modal

Remove the entire modal section (around line 540-620):
```typescript
{/* Campus Map Modal */}
{showMapModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    ... entire modal content ...
  </div>
)}
```

### 4. Update Submit Handler

In the `handleSubmit` function, update the location data being sent:

Change from:
```typescript
location: location,
locationCoords: locationCoords,
```

To:
```typescript
floorPlanId: floorPlanLocation?.floorPlanId,
locationX: floorPlanLocation?.x,
locationY: floorPlanLocation?.y,
roomNumber: floorPlanLocation?.roomNumber,
location: floorPlanLocation?.roomNumber || 'Not specified',
```

### 5. Update Form Validation

In the submit button's disabled condition, change:
```typescript
disabled={!title || !category || !description || !date || !location || imageFiles.length === 0 || uploading}
```

To:
```typescript
disabled={!title || !category || !description || !date || !floorPlanLocation || imageFiles.length === 0 || uploading}
```

## Complete Updated Section

Here's the complete updated location section:

```typescript
{/* Location & Date with Floor Plan */}
<div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
  <h2 className="text-white font-medium text-lg lg:text-xl">Location & Date</h2>

  {/* Floor Plan Picker */}
  <div>
    <label className="text-white/70 text-sm lg:text-base mb-3 block flex items-center gap-2">
      <MapPin className="w-4 h-4" />
      Where was it {itemType === 'lost' ? 'lost' : 'found'}? *
    </label>
    
    <LocationPickerWithOCR
      value={floorPlanLocation}
      onChange={setFloorPlanLocation}
    />
  </div>

  {/* Date */}
  <div>
    <label className="text-white/70 text-sm lg:text-base mb-2 block flex items-center gap-2">
      <Calendar className="w-4 h-4" />
      Date {itemType === 'lost' ? 'Lost' : 'Found'} *
    </label>
    <input
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      required
      className="w-full px-4 py-3 lg:py-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl text-white focus:outline-none focus:border-[#ff7400]/50 focus:bg-white/10 transition-all"
    />
  </div>
</div>
```

## Testing

After making these changes:

1. Navigate to the Post page
2. You should see floor selector (Ground Floor, 2nd Floor, 3rd & 4th Floor)
3. Click on a floor plan to pin location
4. OCR should detect room number
5. Submit form with floor plan location data

## Benefits

- ✅ Uses your uploaded floor plans (ground_floor.png, 2nd_floor.png, 3rd_4th_floor.png)
- ✅ Automatic room number detection via OCR
- ✅ Precise location pinning with percentage coordinates
- ✅ No more mock location dropdowns
- ✅ Better user experience with visual floor plans
