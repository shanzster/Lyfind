// Tesseract is heavy — load it only when OCR is actually used
async function getTesseract() {
  const module = await import('tesseract.js');
  return module.default;
}

interface OCRResult {
  roomNumber: string | null;
  confidence: number;
  nearbyText: string[];
}

/**
 * Extract room number from a specific area of the floor plan
 * @param imageUrl - URL of the floor plan image
 * @param x - X coordinate as percentage (0-100)
 * @param y - Y coordinate as percentage (0-100)
 * @param radius - Search radius in pixels (default: 50)
 */
export async function extractRoomNumber(
  imageUrl: string,
  x: number,
  y: number,
  radius: number = 150 // Increased to 150 for better text capture
): Promise<OCRResult> {
  try {
    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Create canvas to extract the region
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Calculate actual pixel coordinates
    const actualX = (x / 100) * img.width;
    const actualY = (y / 100) * img.height;

    // Set canvas size to the region we want to OCR (larger region for better detection)
    const regionSize = radius * 2;
    canvas.width = regionSize;
    canvas.height = regionSize;

    // Draw the region onto the canvas
    ctx.drawImage(
      img,
      Math.max(0, actualX - radius),
      Math.max(0, actualY - radius),
      regionSize,
      regionSize,
      0,
      0,
      regionSize,
      regionSize
    );

    // Enhance the image for better OCR
    const imageData = ctx.getImageData(0, 0, regionSize, regionSize);
    const data = imageData.data;
    
    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Increase contrast (adjust the multiplier for more/less contrast)
      const contrast = 1.5;
      const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128));
      
      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
    }
    
    ctx.putImageData(imageData, 0, 0);

    console.log('[OCR] Region extracted:', regionSize, 'x', regionSize, 'at', actualX, actualY);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });

    // Perform OCR with better settings for text detection
    console.log('[OCR] Starting OCR on region...');
    const Tesseract = await getTesseract();
    const result = await Tesseract.recognize(blob, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      },
    });

    // Extract text and filter for room numbers or location names
    const text = result.data.text.trim();
    const words = (result.data as any).words || [];

    console.log('[OCR] Extracted text:', text);
    console.log('[OCR] Words found:', words.length, 'words');
    if (words.length > 0) {
      console.log('[OCR] Word details:', words.map((w: any) => ({ text: w.text, conf: w.confidence })));
    }

    // Get all text found in the region
    const nearbyText: string[] = [];
    if (words.length > 0) {
      words.forEach((w: any) => {
        if (w.text && w.text.trim().length > 0 && w.confidence > 50) {
          nearbyText.push(w.text.trim());
        }
      });
    }

    console.log('[OCR] Nearby text:', nearbyText);

    // Look for patterns that match room numbers (e.g., "101", "A-205", "Room 301")
    const roomNumberPattern = /\b([A-Z]?-?\d{2,4}[A-Z]?)\b/i;
    const match = text.match(roomNumberPattern);

    // If we found a room number pattern, use it
    // Otherwise, use the first significant text found
    let detectedText = match ? match[1] : null;
    
    if (!detectedText && nearbyText.length > 0) {
      // Use the longest text as it's likely the room/location name
      detectedText = nearbyText.reduce((a: string, b: string) => a.length > b.length ? a : b);
      console.log('[OCR] Using longest text as location:', detectedText);
    }
    
    // If still no text, use the raw text if it's not empty and not just a dash
    if (!detectedText && text && text !== '-' && text.length > 1) {
      detectedText = text;
      console.log('[OCR] Using raw text as location:', detectedText);
    }

    return {
      roomNumber: detectedText,
      confidence: result.data.confidence,
      nearbyText,
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return {
      roomNumber: null,
      confidence: 0,
      nearbyText: [],
    };
  }
}

/**
 * Extract all room numbers from the entire floor plan
 * This can be used to pre-process floor plans and cache room locations
 */
export async function extractAllRoomNumbers(imageUrl: string): Promise<
  Array<{
    roomNumber: string;
    x: number;
    y: number;
    confidence: number;
  }>
> {
  try {
    const Tesseract = await getTesseract();
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (m) => console.log(m),
    });

    const roomNumbers: Array<{
      roomNumber: string;
      x: number;
      y: number;
      confidence: number;
    }> = [];

    // Get image dimensions
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve) => (img.onload = resolve));

    // Extract room numbers from OCR results
    const roomNumberPattern = /\b([A-Z]?-?\d{2,4}[A-Z]?)\b/i;

    (result.data as any).words.forEach((word: any) => {
      const match = word.text.match(roomNumberPattern);
      if (match && word.confidence > 60) {
        // Convert pixel coordinates to percentages
        const x = (word.bbox.x0 / img.width) * 100;
        const y = (word.bbox.y0 / img.height) * 100;

        roomNumbers.push({
          roomNumber: match[1],
          x,
          y,
          confidence: word.confidence,
        });
      }
    });

    return roomNumbers;
  } catch (error) {
    console.error('Failed to extract all room numbers:', error);
    return [];
  }
}

/**
 * Find the nearest room number to a given coordinate
 * Useful when user clicks near but not exactly on a room label
 */
export function findNearestRoom(
  x: number,
  y: number,
  rooms: Array<{ roomNumber: string; x: number; y: number }>
): { roomNumber: string; distance: number } | null {
  if (rooms.length === 0) return null;

  let nearest = rooms[0];
  let minDistance = calculateDistance(x, y, nearest.x, nearest.y);

  for (const room of rooms) {
    const distance = calculateDistance(x, y, room.x, room.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = room;
    }
  }

  // Only return if within reasonable distance (10% of image)
  return minDistance < 10 ? { roomNumber: nearest.roomNumber, distance: minDistance } : null;
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
