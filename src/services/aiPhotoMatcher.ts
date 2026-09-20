import type * as tfType from '@tensorflow/tfjs';
import type * as mobilenetType from '@tensorflow-models/mobilenet';

/**
 * AI-Powered Photo Matching Service using TensorFlow.js and MobileNet
 * Extracts feature embeddings from images and computes similarity scores.
 *
 * Robustness measures (v2 pipeline):
 * - Lighting normalization (gray-world white balance + contrast stretch)
 * - Center-crop + fixed 224x224 input so aspect ratio doesn't skew features
 * - Test-time augmentation (original + mirrored embeddings averaged)
 * - Calibrated similarity scoring (raw cosine remapped to a usable 0-100 range)
 */

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
    console.log('[AI Matcher] Loading TensorFlow + MobileNet v2...');
    const [tfModule, mobilenetModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow-models/mobilenet'),
    ]);
    tf = tfModule;
    const net = await mobilenetModule.load({ version: 2, alpha: 1.0 });
    console.log('[AI Matcher] Model loaded successfully');
    model = net;
    return net;
  })();

  return modelLoading;
}

/**
 * Load an image element from a URL.
 */
async function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  return img;
}

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
 * @param imageUrl - URL of the image to analyze
 * @returns Feature vector (embedding) as number array
 */
export async function extractFeatures(imageUrl: string): Promise<number[]> {
  try {
    console.log('[AI Matcher] Extracting features from image:', imageUrl);

    await loadModel();
    const img = await loadImage(imageUrl);

    const original = l2Normalize(await embedCanvas(preprocessImage(img, false)));
    const mirrored = l2Normalize(await embedCanvas(preprocessImage(img, true)));

    const averaged = original.map((v, i) => (v + mirrored[i]) / 2);
    const features = l2Normalize(averaged);

    console.log('[AI Matcher] Extracted', features.length, 'features');
    return features;
  } catch (error) {
    console.error('[AI Matcher] Feature extraction failed:', error);
    throw error;
  }
}

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
    console.warn(
      '[AI Matcher] Feature length mismatch (' +
        features1.length + ' vs ' + features2.length +
        ') — likely stale cached features; returning 0'
    );
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
 * candidate item may likewise carry `featuresList` (one embedding per photo)
 * or a legacy single `features` vector. An item's score is the BEST score
 * across all query-photo x item-photo pairs.
 * @param threshold - Minimum similarity score to consider (default: 45)
 * @returns Array of matches sorted by score (highest first)
 */
export function findMatches(
  queryFeatures: number[] | number[][],
  candidateItems: Array<{ id: string; features?: number[]; featuresList?: number[][]; [key: string]: any }>,
  threshold: number = 45
): Array<{ id: string; score: number; [key: string]: any }> {
  console.log('[AI Matcher] Finding matches among', candidateItems.length, 'items');

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

  console.log('[AI Matcher] Found', matches.length, 'matches above threshold', threshold);

  return matches;
}

/**
 * Analyze image and detect objects/features
 * @param imageUrl - URL of the image to analyze
 * @returns Analysis results with detected objects and confidence scores
 */
export async function analyzeImage(imageUrl: string): Promise<{
  objects: Array<{ className: string; probability: number }>;
  dominantColors: string[];
  imageSize: { width: number; height: number };
}> {
  try {
    console.log('[AI Matcher] Analyzing image:', imageUrl);

    const net = await loadModel();
    const img = await loadImage(imageUrl);

    const imageSize = { width: img.width, height: img.height };

    const predictions = await net.classify(img);
    const dominantColors = await extractDominantColors(img);

    console.log('[AI Matcher] Analysis complete:', predictions.length, 'objects detected');

    return {
      objects: predictions.map(p => ({
        className: p.className,
        probability: Math.round(p.probability * 100),
      })),
      dominantColors,
      imageSize,
    };
  } catch (error) {
    console.error('[AI Matcher] Image analysis failed:', error);
    throw error;
  }
}

/**
 * Extract dominant colors from an image
 */
async function extractDominantColors(img: HTMLImageElement): Promise<string[]> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  // Resize to small size for faster processing
  canvas.width = 50;
  canvas.height = 50;
  ctx.drawImage(img, 0, 0, 50, 50);

  const imageData = ctx.getImageData(0, 0, 50, 50);
  const data = imageData.data;

  // Sample colors
  const colorMap = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4 * 10) { // Sample every 10th pixel
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Round to nearest 32 to group similar colors
    const rRounded = Math.round(r / 32) * 32;
    const gRounded = Math.round(g / 32) * 32;
    const bRounded = Math.round(b / 32) * 32;

    const color = `#${rRounded.toString(16).padStart(2, '0')}${gRounded.toString(16).padStart(2, '0')}${bRounded.toString(16).padStart(2, '0')}`;
    colorMap.set(color, (colorMap.get(color) || 0) + 1);
  }

  // Get top 3 colors
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([color]) => color);

  return sortedColors;
}

/**
 * Preload the model for faster first-time use
 */
export function preloadModel(): void {
  loadModel().catch(error => {
    console.error('[AI Matcher] Failed to preload model:', error);
  });
}
