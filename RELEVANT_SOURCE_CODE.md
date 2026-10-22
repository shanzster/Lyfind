# Lyfind — Relevant Source Code

A curated extract of the **core algorithmic source code** actually used by the Lyfind
photo-based lost-and-found campus web app. This is not the full codebase — only the
parts that implement the key logic (photo matching, feature caching, auto-matching, and
OCR-based location detection).

**Stack:** React + TypeScript + Vite, Firebase/Firestore, TensorFlow.js (MobileNet v2),
Tesseract.js (OCR), Cloudinary (image storage).

---

## 1. Photo Matching Algorithm

**File:** `src/services/aiPhotoMatcher.ts`

The heart of the system. Uses **MobileNet v2** (via TensorFlow.js) to turn each photo into
a feature embedding, then compares embeddings with a **calibrated cosine similarity**.
Robustness techniques: gray-world white balance + contrast stretch (lighting
normalization), center-crop to a fixed 224×224 input, and test-time augmentation
(original + mirrored embeddings averaged).

### 1a. Model loading & calibration constants

```ts
import type * as tfType from '@tensorflow/tfjs';
import type * as mobilenetType from '@tensorflow-models/mobilenet';

// Bump this whenever the feature pipeline changes — cached embeddings from
// older versions are invalidated by comparing against this number.
export const AI_FEATURES_VERSION = 2;

// Raw cosine similarity below this maps to 0, above CALIBRATION_MAX maps to 100.
// MobileNet embeddings of completely unrelated photos still land around 0.3-0.5
// cosine, so the naive (cos+1)*50 formula made everything look like a match.
const CALIBRATION_MIN = 0.4;
const CALIBRATION_MAX = 0.92;

let tf: typeof tfType | null = null;
let model: mobilenetType.MobileNet | null = null;
let modelLoading: Promise<mobilenetType.MobileNet> | null = null;

/**
 * Load TensorFlow + the MobileNet v2 model (lazy, dynamically imported so the
 * multi-MB libraries only download when photo matching is actually used).
 */
async function loadModel(): Promise<mobilenetType.MobileNet> {
  if (model) return model;
  if (modelLoading) return modelLoading;

  modelLoading = (async () => {
    const [tfModule, mobilenetModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/mobilenet'),
    ]);
    tf = tfModule;
    const net = await mobilenetModule.load({ version: 2, alpha: 1.0 });
    model = net;
    return net;
  })();

  return modelLoading;
}
```

### 1b. Pre-processing — center-crop + lighting normalization

```ts
/**
 * Center-crop to square and resize onto a 224x224 canvas, then normalize
 * lighting so photos of the same object taken in different lighting produce
 * closer embeddings.
 */
function preprocessImage(img: HTMLImageElement, mirror: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  // Center-crop to square
  const side = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
  const sx = ((img.naturalWidth || img.width) - side) / 2;
  const sy = ((img.naturalHeight || img.height) - side) / 2;

  if (mirror) {
    ctx.translate(224, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, sx, sy, side, side, 0, 0, 224, 224);
  if (mirror) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  normalizeLighting(canvas, ctx);
  return canvas;
}

/**
 * Gray-world white balance + percentile contrast stretch, in place.
 */
function normalizeLighting(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const pixelCount = data.length / 4;

  // Gray-world white balance: scale each channel so its mean matches the
  // overall mean (removes color casts from warm/cool lighting).
  let sumR = 0, sumG = 0, sumB = 0;
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
  }
  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;
  const grayMean = (meanR + meanG + meanB) / 3;
  const scaleR = meanR > 0 ? grayMean / meanR : 1;
  const scaleG = meanG > 0 ? grayMean / meanG : 1;
  const scaleB = meanB > 0 ? grayMean / meanB : 1;

  const luminance = new Float32Array(pixelCount);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    data[i] = Math.min(255, data[i] * scaleR);
    data[i + 1] = Math.min(255, data[i + 1] * scaleG);
    data[i + 2] = Math.min(255, data[i + 2] * scaleB);
    luminance[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Contrast stretch using 2nd-98th percentile (robust to over/underexposure)
  const sorted = Array.from(luminance).sort((a, b) => a - b);
  const lo = sorted[Math.floor(pixelCount * 0.02)];
  const hi = sorted[Math.floor(pixelCount * 0.98)];
  const range = hi - lo;

  if (range > 10) {
    const stretch = 255 / range;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, (data[i] - lo) * stretch));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - lo) * stretch));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - lo) * stretch));
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
```

### 1c. Feature extraction with test-time augmentation

```ts
/**
 * L2-normalize a vector in place and return it.
 */
function l2Normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

async function embedCanvas(canvas: HTMLCanvasElement): Promise<number[]> {
  const net = await loadModel();
  const tensor = tf!.browser.fromPixels(canvas);
  const embeddings = net.infer(tensor, true) as tfType.Tensor;
  const embeddingArray = await embeddings.data();
  const features = Array.from(embeddingArray);
  tensor.dispose();
  embeddings.dispose();
  return features;
}

/**
 * Extract a feature embedding from an image.
 * Uses test-time augmentation: the original and a horizontally mirrored copy
 * are both embedded, L2-normalized, averaged, and re-normalized, so photos
 * taken from mirrored angles still match.
 */
export async function extractFeatures(imageUrl: string): Promise<number[]> {
  await loadModel();
  const img = await loadImage(imageUrl);

  const original = l2Normalize(await embedCanvas(preprocessImage(img, false)));
  const mirrored = l2Normalize(await embedCanvas(preprocessImage(img, true)));

  const averaged = original.map((v, i) => (v + mirrored[i]) / 2);
  const features = l2Normalize(averaged);

  return features;
}
```

### 1d. Calibrated similarity + match finding

```ts
/**
 * Compute a calibrated similarity between two feature vectors.
 * Raw cosine similarity is remapped so CALIBRATION_MIN -> 0 and
 * CALIBRATION_MAX -> 100, which spreads real matches across the scale
 * instead of bunching everything at 60-95.
 * @returns Similarity score (0-100)
 */
export function computeSimilarity(features1: number[], features2: number[]): number {
  if (features1.length !== features2.length) {
    // Stale cache from an older pipeline version — treat as no match.
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < features1.length; i++) {
    dotProduct += features1[i] * features2[i];
    norm1 += features1[i] * features1[i];
    norm2 += features2[i] * features2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;

  const cosine = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

  const calibrated = (cosine - CALIBRATION_MIN) / (CALIBRATION_MAX - CALIBRATION_MIN);
  const score = Math.max(0, Math.min(100, calibrated * 100));

  return Math.round(score * 100) / 100;
}

/**
 * Find matching items by comparing feature embeddings.
 * The query may be a single embedding or several (one per photo); each
 * candidate item may likewise carry `featuresList` (one embedding per photo).
 * An item's score is the BEST score across all query-photo x item-photo pairs.
 * @param threshold - Minimum similarity score to consider (default: 45)
 * @returns Array of matches sorted by score (highest first)
 */
export function findMatches(
  queryFeatures: number[] | number[][],
  candidateItems: Array<{ id: string; features?: number[]; featuresList?: number[][]; [key: string]: any }>,
  threshold: number = 45
): Array<{ id: string; score: number; [key: string]: any }> {
  const queryList: number[][] = Array.isArray(queryFeatures[0])
    ? (queryFeatures as number[][])
    : [queryFeatures as number[]];

  const matches = candidateItems
    .map(item => {
      const itemVectors: number[][] =
        item.featuresList && item.featuresList.length > 0
          ? item.featuresList
          : item.features
            ? [item.features]
            : [];

      let best = 0;
      for (const q of queryList) {
        for (const f of itemVectors) {
          const s = computeSimilarity(q, f);
          if (s > best) best = s;
        }
      }

      return { ...item, score: best };
    })
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score);

  return matches;
}
```

### 1e. Image analysis (object detection + dominant colors)

```ts
/**
 * Analyze image and detect objects/features using MobileNet classification.
 */
export async function analyzeImage(imageUrl: string): Promise<{
  objects: Array<{ className: string; probability: number }>;
  dominantColors: string[];
  imageSize: { width: number; height: number };
}> {
  const net = await loadModel();
  const img = await loadImage(imageUrl);

  const imageSize = { width: img.width, height: img.height };
  const predictions = await net.classify(img);
  const dominantColors = await extractDominantColors(img);

  return {
    objects: predictions.map(p => ({
      className: p.className,
      probability: Math.round(p.probability * 100),
    })),
    dominantColors,
    imageSize,
  };
}

/**
 * Extract dominant colors by sampling a downscaled 50x50 copy and bucketing
 * colors to the nearest 32 per channel.
 */
async function extractDominantColors(img: HTMLImageElement): Promise<string[]> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  canvas.width = 50;
  canvas.height = 50;
  ctx.drawImage(img, 0, 0, 50, 50);

  const imageData = ctx.getImageData(0, 0, 50, 50);
  const data = imageData.data;
  const colorMap = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4 * 10) { // sample every 10th pixel
    const rRounded = Math.round(data[i] / 32) * 32;
    const gRounded = Math.round(data[i + 1] / 32) * 32;
    const bRounded = Math.round(data[i + 2] / 32) * 32;
    const color = `#${rRounded.toString(16).padStart(2, '0')}${gRounded.toString(16).padStart(2, '0')}${bRounded.toString(16).padStart(2, '0')}`;
    colorMap.set(color, (colorMap.get(color) || 0) + 1);
  }

  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);
}
```

---

## 2. Feature Caching

**File:** `src/services/itemFeatureCache.ts`

Embeddings are expensive to compute, so each item's vectors are cached on its Firestore
doc (`aiFeatures` field) and reused as long as the cache matches the current pipeline
version (`AI_FEATURES_VERSION`). Nested arrays aren't allowed in Firestore, so vectors are
stored under map keys `v0`, `v1`, `v2`.

```ts
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { extractFeatures, AI_FEATURES_VERSION } from './aiPhotoMatcher';
import type { Item } from './itemService';

// Max photos embedded per item — keeps Firestore doc size and compute bounded.
const MAX_PHOTOS = 3;

/**
 * Returns the AI feature vectors (one per photo, up to MAX_PHOTOS) for an item,
 * using cached embeddings when they match the current pipeline version.
 * Otherwise recomputes them and best-effort writes the cache back.
 */
export async function getItemFeatureVectors(item: Item): Promise<number[][]> {
  if (!item.photos || item.photos.length === 0) return [];

  const photos = item.photos.slice(0, MAX_PHOTOS);

  // Use cache when present and current
  const cache = item.aiFeatures;
  if (cache && cache.version === AI_FEATURES_VERSION && cache.count > 0) {
    const vectors: number[][] = [];
    for (let i = 0; i < cache.count; i++) {
      const v = cache[`v${i}`];
      if (Array.isArray(v) && v.length > 0) {
        vectors.push(v);
      }
    }
    if (vectors.length > 0) {
      return vectors;
    }
  }

  // Recompute
  const vectors: number[][] = [];
  for (const photoUrl of photos) {
    try {
      vectors.push(await extractFeatures(photoUrl));
    } catch (error) {
      console.error('[FeatureCache] Failed to embed photo for item', item.id, error);
    }
  }

  // Best-effort cache write-back
  if (item.id && vectors.length > 0) {
    try {
      const cacheDoc: Record<string, any> = {
        version: AI_FEATURES_VERSION,
        count: vectors.length,
      };
      vectors.forEach((v, i) => { cacheDoc[`v${i}`] = v; });
      await updateDoc(doc(db, 'items', item.id), { aiFeatures: cacheDoc });
    } catch (error) {
      console.warn('[FeatureCache] Failed to write feature cache for item', item.id, error);
    }
  }

  return vectors;
}
```

---

## 3. Photo Match Queue & Pipeline

**File:** `src/services/photoMatchService.ts`

User-uploaded "search by photo" requests are queued in Firestore and processed one at a
time (10s spacing) with live progress updates. This is the orchestration layer that wires
the matching algorithm (§1) and feature cache (§2) together.

### 3a. Request creation & queue draining

```ts
// Create photo match request
async createMatchRequest(userId: string, imageUrl: string): Promise<string> {
  // Get all queued and processing requests to calculate position
  const queueQuery = query(
    collection(db, PHOTO_MATCH_COLLECTION),
    where('status', 'in', ['queued', 'processing'])
  );
  const queueSnapshot = await getDocs(queueQuery);
  const position = queueSnapshot.size + 1;
  const estimatedWaitSeconds = queueSnapshot.size * 10;

  const docRef = await addDoc(collection(db, PHOTO_MATCH_COLLECTION), {
    userId,
    imageUrl,
    status: 'queued',
    position,
    progress: 0,
    currentStep: `Position #${position} in queue - Estimated wait: ${estimatedWaitSeconds}s`,
    createdAt: Timestamp.now(),
  });

  this.processQueue();
  return docRef.id;
},

// Process queue with 10-second delay between each request
async processQueue() {
  const queueSnapshot = await getDocs(
    query(collection(db, PHOTO_MATCH_COLLECTION), where('status', '==', 'queued'))
  );
  if (queueSnapshot.empty) return;

  // Sort by createdAt client-side to get oldest first
  const queuedRequests = queueSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() as PhotoMatchRequest }))
    .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

  // Don't start a new one if something is already processing
  const processingSnapshot = await getDocs(
    query(collection(db, PHOTO_MATCH_COLLECTION), where('status', '==', 'processing'))
  );
  if (!processingSnapshot.empty) {
    setTimeout(() => this.processQueue(), 5000);
    return;
  }

  await this.processMatchRequest(queuedRequests[0].id);
  setTimeout(() => this.processQueue(), 10000);
},
```

### 3b. The matching pipeline (progress-tracked)

```ts
async processMatchRequest(requestId: string) {
  const startTime = Date.now();

  const request = /* fetched PhotoMatchRequest */;
  const imageUrl = request.imageUrl;

  await this.updateMatchRequest(requestId, {
    status: 'processing', progress: 10, currentStep: 'Loading AI model...',
  });

  // Extract features from the uploaded query image
  await this.updateMatchRequest(requestId, { progress: 30, currentStep: 'Extracting visual features...' });
  const queryFeatures = await extractFeatures(imageUrl);

  // Analyze image (objects + colors + size)
  await this.updateMatchRequest(requestId, { progress: 50, currentStep: 'Analyzing image content...' });
  const analysis = await analyzeImage(imageUrl);

  // Load active items and embed those with photos (cache-backed)
  await this.updateMatchRequest(requestId, { progress: 60, currentStep: 'Loading items from database...' });
  const allItems = await itemService.getAllItems({ status: 'active' });

  await this.updateMatchRequest(requestId, { progress: 70, currentStep: 'Comparing with database items...' });
  const itemsWithFeatures: Array<Item & { featuresList: number[][] }> = [];
  for (const item of allItems) {
    if (item.photos && item.photos.length > 0) {
      const featuresList = await getItemFeatureVectors(item);
      if (featuresList.length > 0) itemsWithFeatures.push({ ...item, featuresList });
    }
  }

  // Run the matcher (threshold 45) and keep top 10
  await this.updateMatchRequest(requestId, { progress: 85, currentStep: 'Finding best matches...' });
  const validItems = itemsWithFeatures.filter((i): i is (Item & { featuresList: number[][]; id: string }) => !!i.id);
  const matches = findMatches(queryFeatures, validItems, 45);

  const results: MatchResult[] = matches.slice(0, 10).map(match => ({
    itemId: match.id || '',
    title: match.title,
    type: match.type,
    score: match.score,
    imageUrl: match.photos[0],
    location: match.location?.address || 'Unknown location',
    date: match.createdAt?.toDate().toISOString() || new Date().toISOString(),
    postedBy: match.userName || 'Anonymous',
  }));

  const processingTime = (Date.now() - startTime) / 1000;

  // Persist results + analysis details, then notify the user
  await this.updateMatchRequest(requestId, {
    status: 'completed', progress: 100, currentStep: 'Analysis complete!',
    results, completedAt: Timestamp.now(),
    analysisDetails: {
      imageSize: `${analysis.imageSize.width}x${analysis.imageSize.height}`,
      detectedObjects: analysis.objects.slice(0, 5).map(o => o.className),
      dominantColors: analysis.dominantColors,
      features: queryFeatures.length,
      comparedItems: itemsWithFeatures.length,
      processingTime: Math.round(processingTime * 10) / 10,
    },
  });

  if (results.length > 0) {
    await notificationService.notifyMatch(request.userId, results.length);
  }
}
```

---

## 4. Automatic Matching (on new item approval)

**File:** `src/services/autoMatchService.ts`

When a new item goes live, it's automatically matched against all **opposite-type** items
(lost ↔ found) using a stricter threshold (60). Matches are stored in the `matches`
collection and both owners are notified.

```ts
import { findMatches } from './aiPhotoMatcher';
import { getItemFeatureVectors } from './itemFeatureCache';
import { itemService, Item } from './itemService';
import { notificationService } from './notificationService';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function autoMatchNewItem(itemId: string, itemData: Item): Promise<void> {
  if (!itemData.photos || itemData.photos.length === 0) return;

  // Embed the new item's photos (also pre-warms its feature cache)
  const queryVectors = await getItemFeatureVectors({ ...itemData, id: itemId });
  if (queryVectors.length === 0) return;

  // Lost items match with found, found with lost
  const oppositeType = itemData.type === 'lost' ? 'found' : 'lost';
  const candidateItems = await itemService.getAllItems({ type: oppositeType, status: 'active' });

  const itemsWithFeatures: Array<Item & { featuresList: number[][] }> = [];
  for (const item of candidateItems) {
    if (item.id === itemId) continue;
    if (item.photos && item.photos.length > 0) {
      const featuresList = await getItemFeatureVectors(item);
      if (featuresList.length > 0) itemsWithFeatures.push({ ...item, featuresList });
    }
  }

  const validItems = itemsWithFeatures.filter((i): i is typeof i & { id: string } => !!i.id);
  const matches = findMatches(queryVectors, validItems, 60);

  // Store each match + notify the other owner
  for (const match of matches) {
    await addDoc(collection(db, 'matches'), {
      lostItemId: itemData.type === 'lost' ? itemId : match.id,
      foundItemId: itemData.type === 'found' ? itemId : match.id,
      score: match.score,
      viewedByLost: false,
      viewedByFound: false,
      createdAt: Timestamp.now(),
    });

    if (match.userId && match.userId !== itemData.userId) {
      await notificationService.notifyAutoMatch(match.userId, match.title, 1, {
        myItemTitle: match.title,
        myItemImage: match.photos?.[0],
        matchedItemId: itemId,
        matchedItemTitle: itemData.title,
        matchedItemImage: itemData.photos?.[0],
        confidence: match.score,
      });
    }
  }

  // Notify the new item's owner with the total count + best match
  if (matches.length > 0) {
    const best = matches[0];
    await notificationService.notifyAutoMatch(itemData.userId, itemData.title, matches.length,
      best.id ? {
        myItemTitle: itemData.title,
        myItemImage: itemData.photos?.[0],
        matchedItemId: best.id,
        matchedItemTitle: best.title,
        matchedItemImage: best.photos?.[0],
        confidence: best.score,
      } : undefined);
  }
}
```

---

## 5. OCR Location Detection (Floor-Plan Room Reader)

**File:** `src/lib/ocrService.ts`

When a user clicks on a campus floor plan, **Tesseract.js** reads the room number/label
near the click. A single warm worker is reused across clicks; the clicked region is
cropped, upscaled, grayscaled, and binarized with **Otsu's thresholding** (with auto-invert
for light-on-dark labels) to maximize OCR accuracy on small line-art text.

### 5a. Pre-processing — crop, upscale, Otsu binarize

```ts
import { createWorker, PSM, type Worker } from 'tesseract.js';

// Characters we expect on a floor plan: room names + numbers.
const CHAR_WHITELIST =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 -.';

// Keep ONE warm worker and reuse it across clicks (spinning up Tesseract is expensive).
let workerPromise: Promise<Worker> | null = null;
async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: CHAR_WHITELIST,
        preserve_interword_spaces: '1', // keep "Comp Lab 2" intact
      });
      return worker;
    })();
  }
  return workerPromise;
}

/**
 * Crop a region around the click, upscale it, grayscale + Otsu threshold into
 * clean black/white, and auto-invert so we always feed dark-on-light to OCR.
 */
function preprocessRegion(img: HTMLImageElement, x: number, y: number, radius: number): HTMLCanvasElement {
  const actualX = (x / 100) * img.width;
  const actualY = (y / 100) * img.height;

  const sx = Math.max(0, actualX - radius);
  const sy = Math.max(0, actualY - radius);
  const sw = Math.min(radius * 2, img.width - sx);
  const sh = Math.min(radius * 2, img.height - sy);

  // Upscale so the smallest side is ~600px (Tesseract wants ~30px-tall text).
  const TARGET = 600;
  const scale = Math.max(1, TARGET / Math.min(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

  const imageData = ctx.getImageData(0, 0, dw, dh);
  const data = imageData.data;

  // Grayscale + 256-bin histogram for Otsu thresholding.
  const histogram = new Array(256).fill(0);
  const gray = new Uint8ClampedArray(dw * dh);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    gray[p] = g;
    histogram[g]++;
  }

  const threshold = otsuThreshold(histogram, gray.length);

  // If most pixels are dark, the label is light-on-dark -> invert.
  let belowCount = 0;
  for (let p = 0; p < gray.length; p++) if (gray[p] < threshold) belowCount++;
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

  let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) { maxVariance = variance; threshold = t; }
  }
  return threshold;
}
```

### 5b. Room-number extraction (dual-mode OCR + pattern match)

```ts
/**
 * Extract a room number / label from a specific area of the floor plan.
 * @param x, y - click coordinates as percentages (0-100)
 */
export async function extractRoomNumber(
  imageUrl: string, x: number, y: number, radius: number = 120
): Promise<OCRResult> {
  const img = await loadImage(imageUrl);
  const canvas = preprocessRegion(img, x, y, radius);
  const blob = await canvasToBlob(canvas);
  const worker = await getWorker();

  // Try SINGLE_BLOCK and SPARSE_TEXT; keep whichever reads with higher confidence.
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
}

// Rank a pass by how much readable text it captured, weighted by confidence.
function scorePass(pass: Pass): number {
  const good = pass.words.filter((w) => w.text.length > 0 && w.confidence > 40);
  if (good.length === 0) return 0;
  const avgConf = good.reduce((s, w) => s + w.confidence, 0) / good.length;
  const chars = good.reduce((s, w) => s + w.text.length, 0);
  return avgConf + chars; // confidence first, break ties by amount of text
}
```

---

## Module Map

| Area | File | Role |
|------|------|------|
| Photo Matching Algorithm | `src/services/aiPhotoMatcher.ts` | MobileNet embeddings, lighting normalization, calibrated cosine similarity, `findMatches` |
| Feature Caching | `src/services/itemFeatureCache.ts` | Per-item embedding cache on Firestore docs, versioned |
| Photo Match Queue & Pipeline | `src/services/photoMatchService.ts` | Queued "search by photo" requests with live progress |
| Automatic Matching | `src/services/autoMatchService.ts` | Auto lost↔found matching on new item approval |
| OCR Location Detection | `src/lib/ocrService.ts` | Tesseract floor-plan room-label reader (Otsu binarization) |
