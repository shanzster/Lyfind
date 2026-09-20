import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { extractFeatures, AI_FEATURES_VERSION } from './aiPhotoMatcher';
import type { Item } from './itemService';

// Max photos embedded per item — keeps Firestore doc size and compute bounded.
const MAX_PHOTOS = 3;

/**
 * Returns the AI feature vectors (one per photo, up to MAX_PHOTOS) for an
 * item, using the cached embeddings stored on the item doc when they exist
 * and match the current pipeline version. Otherwise recomputes them and
 * best-effort writes the cache back.
 *
 * Cache shape on the item doc (`aiFeatures` field):
 *   { version: number, count: number, v0: number[], v1: number[], v2: number[] }
 * Map keys are used because Firestore does not allow nested arrays.
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
      vectors.forEach((v, i) => {
        cacheDoc[`v${i}`] = v;
      });
      await updateDoc(doc(db, 'items', item.id), { aiFeatures: cacheDoc });
    } catch (error) {
      console.warn('[FeatureCache] Failed to write feature cache for item', item.id, error);
    }
  }

  return vectors;
}
