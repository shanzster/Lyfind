# Daily Usage Limit Implementation

## Overview
Implemented a daily usage limit for the Photo Match feature to prevent system overload and ensure fair usage across all users.

## Features Implemented

### 1. Usage Tracking
- Users can use photo matching **2 times per day**
- Usage count is tracked per user using localStorage
- Storage key format: `photoMatch_${userId}_${date}`

### 2. 12-Hour Cooldown
- After using 2 matches, users must wait 12 hours before using again
- Cooldown starts from the first use of the day
- Cooldown timestamp stored in: `photoMatch_cooldown_${userId}`

### 3. Real-Time Countdown Timer
- Shows remaining time in format: `Xh Ym Zs`
- Updates every second
- Automatically resets when cooldown expires

### 4. User Interface Updates

#### Usage Indicator
- Badge showing "X uses left today" in the upload section
- Green when uses available, red when limit reached
- Updates in real-time after each use

#### Upload Button States
- Normal: "Add to Queue (X left)"
- Uploading: "Adding to Queue..." with spinner
- Limit Reached: "Daily Limit Reached" (disabled)

#### Limit Modal
- Displays LyFind logo
- Clear message: "Daily Limit Reached"
- Real-time countdown timer
- "Got it" button to dismiss
- Explanation text about 12-hour reset

### 5. Automatic Reset Logic
- Checks every minute if 12 hours have passed
- Automatically clears usage count and cooldown
- Users can immediately use the feature after reset

## Technical Implementation

### State Variables
```typescript
const [showLimitModal, setShowLimitModal] = useState(false);
const [remainingTime, setRemainingTime] = useState<string>('');
const [usageCount, setUsageCount] = useState(0);
```

### Usage Check (useEffect)
- Runs on component mount and every minute
- Checks if 12 hours have passed since first use
- Resets usage if cooldown expired

### Countdown Timer (useEffect)
- Only runs when usage count >= 2
- Updates every second
- Calculates hours, minutes, seconds remaining

### Upload Handler
- Checks usage limit before processing
- Shows modal if limit reached
- Increments count after successful upload
- Sets cooldown timestamp on first use

## User Experience Flow

1. **First Use**: User uploads photo, sees "1 uses left today"
2. **Second Use**: User uploads photo, sees "0 uses left today"
3. **Third Attempt**: Modal appears with countdown timer
4. **After 12 Hours**: Usage automatically resets, user can upload again

## Storage Keys
- `photoMatch_${userId}_${date}`: Current day's usage count
- `photoMatch_${userId}_lastReset`: Timestamp of first use (for cooldown calculation)

## Benefits
- Prevents system overload from excessive photo matching requests
- Fair usage across all users
- Clear communication of limits and cooldown
- Automatic reset without manual intervention
- Persistent across page refreshes (localStorage)

## Files Modified
- `src/pages/lycean/PhotoMatch.tsx`
