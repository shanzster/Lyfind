import { findMatches } from './aiPhotoMatcher';
import { getItemFeatureVectors } from './itemFeatureCache';
import { itemService, Item } from './itemService';
import { notificationService } from './notificationService';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Automatically find matches for a newly approved item.
 * This runs in the background after an item goes live.
 */
export async function autoMatchNewItem(itemId: string, itemData: Item): Promise<void> {
  try {
    console.log('[AutoMatch] Starting auto-match for item:', itemId);

    // Only process if item has photos
    if (!itemData.photos || itemData.photos.length === 0) {
      console.log('[AutoMatch] No photos to process');
      return;
    }

    // Embed the new item's photos (also pre-warms its feature cache)
    console.log('[AutoMatch] Extracting features from photos...');
    const queryVectors = await getItemFeatureVectors({ ...itemData, id: itemId });
    if (queryVectors.length === 0) {
      console.log('[AutoMatch] Could not extract any features');
      return;
    }

    // Get opposite type items (lost items match with found, found with lost)
    const oppositeType = itemData.type === 'lost' ? 'found' : 'lost';
    console.log('[AutoMatch] Fetching', oppositeType, 'items...');

    const candidateItems = await itemService.getAllItems({
      type: oppositeType,
      status: 'active'
    });

    console.log('[AutoMatch] Found', candidateItems.length, 'candidate items');

    // Get feature vectors for candidates (all photos, cached where possible)
    const itemsWithFeatures: Array<Item & { featuresList: number[][] }> = [];

    for (const item of candidateItems) {
      if (item.id === itemId) continue;
      if (item.photos && item.photos.length > 0) {
        try {
          const featuresList = await getItemFeatureVectors(item);
          if (featuresList.length > 0) {
            itemsWithFeatures.push({ ...item, featuresList });
          }
        } catch (error) {
          console.error('[AutoMatch] Failed to extract features for item:', item.id, error);
        }
      }
    }

    console.log('[AutoMatch] Finding matches...');
    const validItems = itemsWithFeatures.filter((item): item is typeof item & { id: string } => !!item.id);
    const matches = findMatches(queryVectors, validItems, 60);

    console.log('[AutoMatch] Found', matches.length, 'matches');

    // Store matches in database and notify the other item's owner
    for (const match of matches) {
      try {
        await addDoc(collection(db, 'matches'), {
          lostItemId: itemData.type === 'lost' ? itemId : match.id,
          foundItemId: itemData.type === 'found' ? itemId : match.id,
          score: match.score,
          viewedByLost: false,
          viewedByFound: false,
          createdAt: Timestamp.now(),
        });

        console.log('[AutoMatch] Stored match:', match.id, 'with score:', match.score);

        if (match.userId && match.userId !== itemData.userId) {
          try {
            await notificationService.notifyAutoMatch(match.userId, match.title, 1, {
              myItemTitle: match.title,
              myItemImage: match.photos?.[0],
              matchedItemId: itemId,
              matchedItemTitle: itemData.title,
              matchedItemImage: itemData.photos?.[0],
              confidence: match.score,
            });
          } catch (error) {
            console.error('[AutoMatch] Failed to notify matched item owner:', error);
          }
        }
      } catch (error) {
        console.error('[AutoMatch] Failed to store match:', error);
      }
    }

    // Notify the new item's owner with the total count
    if (matches.length > 0) {
      try {
        const best = matches[0];
        await notificationService.notifyAutoMatch(
          itemData.userId,
          itemData.title,
          matches.length,
          best.id
            ? {
                myItemTitle: itemData.title,
                myItemImage: itemData.photos?.[0],
                matchedItemId: best.id,
                matchedItemTitle: best.title,
                matchedItemImage: best.photos?.[0],
                confidence: best.score,
              }
            : undefined
        );
      } catch (error) {
        console.error('[AutoMatch] Failed to notify item owner:', error);
      }
    }

    console.log('[AutoMatch] Auto-match complete');
  } catch (error) {
    console.error('[AutoMatch] Auto-match failed:', error);
    // Don't throw - we don't want to block item posting if matching fails
  }
}

/**
 * Get matches for a specific item
 */
export async function getItemMatches(itemId: string, itemType: 'lost' | 'found'): Promise<Array<{
  item: Item;
  score: number;
  matchId: string;
}>> {
  try {
    const { getDocs, query, where, collection: firestoreCollection } = await import('firebase/firestore');

    // Query matches where this item is either lost or found
    const matchField = itemType === 'lost' ? 'lostItemId' : 'foundItemId';
    const q = query(
      firestoreCollection(db, 'matches'),
      where(matchField, '==', itemId)
    );

    const snapshot = await getDocs(q);
    const matches = [];

    for (const doc of snapshot.docs) {
      const matchData = doc.data();
      const oppositeItemId = itemType === 'lost' ? matchData.foundItemId : matchData.lostItemId;

      // Get the matched item
      const item = await itemService.getItemById(oppositeItemId);
      if (item) {
        matches.push({
          item,
          score: matchData.score,
          matchId: doc.id,
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    return matches;
  } catch (error) {
    console.error('[AutoMatch] Failed to get item matches:', error);
    return [];
  }
}

/**
 * Mark matches as viewed for one side (the lost-item owner or the
 * found-item owner).
 */
export async function markMatchesViewed(matchIds: string[], side: 'lost' | 'found'): Promise<void> {
  if (matchIds.length === 0) return;
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const field = side === 'lost' ? 'viewedByLost' : 'viewedByFound';
    await Promise.all(
      matchIds.map(id => updateDoc(doc(db, 'matches', id), { [field]: true }))
    );
  } catch (error) {
    console.error('[AutoMatch] Failed to mark matches viewed:', error);
  }
}
