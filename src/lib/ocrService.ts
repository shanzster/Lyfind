import { createWorker, PSM, type Worker } from 'tesseract.js';

interface OCRResult {
  roomNumber: string | null;
  confidence: number;
  nearbyText: string[];
}

// Characters we expect on a floor plan: room names + numbers.
const CHAR_WHITELIST =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -.';

// ---------------------------------------------------------------------------
// Worker: Tesseract is expensive to spin up. Keep ONE warm worker and reuse it
// across clicks instead of recreating it every call (the old code did that).
// ---------------------------------------------------------------------------
let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: CHAR_WHITELIST,
        // Keep interword spaces so multi-word labels ("Comp Lab 2") survive.
        preserve_interword_spaces: '1',
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Warm the OCR engine ahead of the first click (optional, improves UX). */
export async function preloadOCR(): Promise<void> {
  await getWorker();
}

// ---------------------------------------------------------------------------
// Image cache: the floor plan doesn't change between clicks, so load it once.
// ---------------------------------------------------------------------------
const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  let cached = imageCache.get(url);
  if (!cached) {
    cached = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
    imageCache.set(url, cached);
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Pre-processing: this is where OCR accuracy is won or lost.
//  1. Crop a generous region around the click.
//  2. Upscale it so small label text becomes large enough for Tesseract.
//  3. Grayscale + Otsu threshold -> clean black/white (floor plans are line art).
//  4. Auto-invert so we always feed dark text on a light background.
// ---------------------------------------------------------------------------
function preprocessRegion(
  img: HTMLImageElement,
  x: number,
  y: number,
  radius: number
): HTMLCanvasElement {
  const actualX = (x / 100) * img.width;
  const actualY = (y / 100) * img.height;

  // Clamp the crop box to the image bounds.
  const sx = Math.max(0, actualX - radius);
  const sy = Math.max(0, actualY - radius);
  const sw = Math.min(radius * 2, img.width - sx);
  const sh = Math.min(radius * 2, img.height - sy);

  // Upscale so the smallest side is ~600px — Tesseract wants text ~30px tall,
  // and floor-plan labels are far smaller than that at native resolution.
  const TARGET = 600;
  const scale = Math.max(1, TARGET / Math.min(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  // High-quality upscaling keeps letter edges readable.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  const imageData = ctx.getImageData(0, 0, dw, dh);
  const data = imageData.data;

  // Grayscale + build a 256-bin histogram for Otsu thresholding.
  const histogram = new Array(256).fill(0);
  const gray = new Uint8ClampedArray(dw * dh);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[p] = g;
    histogram[g]++;
  }

  const threshold = otsuThreshold(histogram, gray.length);

  // Binarize, and figure out whether text is dark-on-light or light-on-dark.
  let belowCount = 0;
  for (let p = 0; p < gray.length; p++) {
    if (gray[p] < threshold) belowCount++;
  }
  // If most pixels are dark, the label is light-on-dark -> invert so the
  // foreground text ends up dark on a light background (what Tesseract wants).
  const invert = belowCount > gray.length / 2;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let value = gray[p] < threshold ? 0 : 255;
    if (invert) value = 255 - value;
    data[i] = data[i + 1] = data[i + 2] = value;
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Otsu's method: pick the grayscale threshold that best separates fg/bg. */
function otsuThreshold(histogram: number[], total: number): number {
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];

  let sumB = 0;
  let wB = 0;
  let maxVariance = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

interface Pass {
  text: string;
  confidence: number;
  words: Array<{ text: string; confidence: number }>;
}

async function recognizeWithMode(worker: Worker, blob: Blob, psm: PSM): Promise<Pass> {
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await worker.recognize(blob);
  const words = ((data as any).words || []).map((w: any) => ({
    text: (w.text || '').trim(),
    confidence: w.confidence || 0,
  }));
  return { text: data.text.trim(), confidence: data.confidence || 0, words };
}

/**
 * Extract a room number / label from a specific area of the floor plan.
 * @param imageUrl - URL of the floor plan image
 * @param x - X coordinate as percentage (0-100)
 * @param y - Y coordinate as percentage (0-100)
 * @param radius - Half the crop size, in source pixels (default: 120)
 */
export async function extractRoomNumber(
  imageUrl: string,
  x: number,
  y: number,
  radius: number = 120
): Promise<OCRResult> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = preprocessRegion(img, x, y, radius);
    const blob = await canvasToBlob(canvas);

    const worker = await getWorker();

    // Floor-plan regions vary: sometimes a single centered label (SINGLE_BLOCK),
    // sometimes a couple of scattered labels (SPARSE_TEXT). Try both and keep
    // whichever reads with higher confidence.
    const passes = await Promise.all([
      recognizeWithMode(worker, blob, PSM.SINGLE_BLOCK),
      recognizeWithMode(worker, blob, PSM.SPARSE_TEXT),
    ]);

    const best = passes.reduce((a, b) => (scorePass(b) > scorePass(a) ? b : a));

    const nearbyText = best.words
      .filter((w) => w.text.length > 0 && w.confidence > 40)
      .map((w) => w.text);

    // Prefer an explicit room-number pattern (e.g. "101", "A-205", "Rm 3B").
    const roomNumberPattern = /\b([A-Z]{0,2}-?\d{1,4}[A-Z]?)\b/i;
    const match = best.text.match(roomNumberPattern);

    let detectedText: string | null = match ? match[1] : null;

    // No number? Fall back to the most confident meaningful label text.
    if (!detectedText && nearbyText.length > 0) {
      const byConfidence = [...best.words]
        .filter((w) => w.text.length > 1 && w.confidence > 40)
        .sort((a, b) => b.confidence - a.confidence);
      detectedText = byConfidence[0]?.text ?? nearbyText[0];
    }

    if (!detectedText && best.text && best.text !== '-' && best.text.length > 1) {
      detectedText = best.text;
    }

    return {
      roomNumber: detectedText ? detectedText.trim() : null,
      confidence: best.confidence,
      nearbyText,
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return { roomNumber: null, confidence: 0, nearbyText: [] };
  }
}

// Rank a pass by how much readable text it captured, weighted by confidence.
function scorePass(pass: Pass): number {
  const good = pass.words.filter((w) => w.text.length > 0 && w.confidence > 40);
  if (good.length === 0) return 0;
  const avgConf = good.reduce((s, w) => s + w.confidence, 0) / good.length;
  const chars = good.reduce((s, w) => s + w.text.length, 0);
  return avgConf + chars; // confidence first, break ties by amount of text
}

/**
 * Extract all room numbers from the entire floor plan.
 * Useful for pre-processing / caching room locations.
 */
export async function extractAllRoomNumbers(imageUrl: string): Promise<
  Array<{ roomNumber: string; x: number; y: number; confidence: number }>
> {
  try {
    const img = await loadImage(imageUrl);
    const worker = await getWorker();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(imageUrl);

    const roomNumbers: Array<{
      roomNumber: string;
      x: number;
      y: number;
      confidence: number;
    }> = [];

    const roomNumberPattern = /\b([A-Z]{0,2}-?\d{1,4}[A-Z]?)\b/i;

    ((data as any).words || []).forEach((word: any) => {
      const match = (word.text || '').match(roomNumberPattern);
      if (match && word.confidence > 60 && word.bbox) {
        const cx = (word.bbox.x0 + word.bbox.x1) / 2;
        const cy = (word.bbox.y0 + word.bbox.y1) / 2;
        roomNumbers.push({
          roomNumber: match[1],
          x: (cx / img.width) * 100,
          y: (cy / img.height) * 100,
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
 * Find the nearest room number to a given coordinate.
 * Useful when the user clicks near but not exactly on a room label.
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

  return minDistance < 10 ? { roomNumber: nearest.roomNumber, distance: minDistance } : null;
}

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
