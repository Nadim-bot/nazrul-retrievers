import { Item } from '../types';

// Stop words to ignore during similarity scoring
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'at', 'with', 'and', 'or', 'for', 'of', 'has', 'have',
  'there', 'this', 'that', 'these', 'those', 'it', 'its', 'my', 'your', 'their', 'our', 'his',
  'her', 'here', 'there', 'about', 'some', 'any', 'from', 'to', 'by', 'near', 'with', 'without',
  'about', 'above', 'below', 'under', 'over', 'inside', 'outside', 'around', 'about', 'just'
]);

export interface MatchDetails {
  score: number; // 0 to 100
  oppositeItem: Item;
  matchedKeywords: string[];
  reasons: string[];
}

/**
 * Calculates a match score between two items.
 * An item of type 'lost' is matched against an item of type 'found' (or vice-versa).
 */
export function calculateMatchScore(itemA: Item, itemB: Item): MatchDetails {
  // Items must be of opposite types to match (Lost vs Found)
  if (itemA.type === itemB.type) {
    return { score: 0, oppositeItem: itemB, matchedKeywords: [], reasons: [] };
  }

  let score = 0;
  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  // 1. Category Matching (Weight: 35 points)
  const catA = (itemA.category || '').toLowerCase();
  const catB = (itemB.category || '').toLowerCase();
  if (catA && catB && catA === catB) {
    score += 35;
    reasons.push('Same category');
  } else {
    // Check for partial category overlap (e.g. "Bags & Luggage" vs "Accessories")
    const wordsA = catA.split(/[&\s]+/);
    const wordsB = catB.split(/[&\s]+/);
    const hasCategoryOverlap = wordsA.some(w => !STOP_WORDS.has(w) && wordsB.includes(w));
    if (hasCategoryOverlap) {
      score += 15;
      reasons.push('Related item category');
    }
  }

  // Helper to extract clean words
  const getCleanWords = (text: string): string[] => {
    return (text || '')
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  };

  const titleWordsA = getCleanWords(itemA.title);
  const titleWordsB = getCleanWords(itemB.title);
  const descWordsA = getCleanWords(itemA.description);
  const descWordsB = getCleanWords(itemB.description);

  // 2. Title Word Overlap (Weight: 25 points)
  const titleOverlap = titleWordsA.filter(w => titleWordsB.includes(w));
  if (titleOverlap.length > 0) {
    const uniqueTitleOverlap = Array.from(new Set(titleOverlap));
    score += Math.min(25, uniqueTitleOverlap.length * 12);
    uniqueTitleOverlap.forEach(w => {
      if (!matchedKeywords.includes(w)) matchedKeywords.push(w);
    });
    reasons.push(`Title keywords matched: "${uniqueTitleOverlap.join(', ')}"`);
  }

  // 3. Description Word Overlap (Weight: 25 points)
  const descOverlap = descWordsA.filter(w => descWordsB.includes(w));
  const uniqueDescOverlap = Array.from(new Set(descOverlap)).filter(w => !titleOverlap.includes(w));
  if (uniqueDescOverlap.length > 0) {
    score += Math.min(25, uniqueDescOverlap.length * 5);
    uniqueDescOverlap.forEach(w => {
      if (!matchedKeywords.includes(w)) matchedKeywords.push(w);
    });
    reasons.push(`Description details overlap: "${uniqueDescOverlap.slice(0, 4).join(', ')}"`);
  }

  // 4. Location Match (Weight: 15 points)
  const locA = (itemA.location || '').toLowerCase();
  const locB = (itemB.location || '').toLowerCase();
  if (locA && locB && locA === locB) {
    score += 15;
    reasons.push(`Exact location match: ${itemA.location}`);
  } else {
    // Check if they mention the same general areas (e.g. "Library", "Block", "Labs")
    const locWordsA = getCleanWords(itemA.location);
    const locWordsB = getCleanWords(itemB.location);
    const locOverlap = locWordsA.filter(w => locWordsB.includes(w));
    if (locOverlap.length > 0) {
      score += 7;
      reasons.push('Similar campus area');
    }
  }

  // Cap score at 98% to make it feel natural and realistic (AI rarely gives a perfect 100%)
  const finalScore = Math.min(98, score);

  return {
    score: finalScore,
    oppositeItem: itemB,
    matchedKeywords,
    reasons
  };
}

/**
 * Finds all potential matches in a list for a given item.
 * Filters matches that have a score >= threshold (default 30%).
 */
export function findPotentialMatches(item: Item, allItems: Item[], threshold: number = 30): MatchDetails[] {
  if (!item || !allItems || allItems.length === 0) return [];
  
  return allItems
    .map(otherItem => calculateMatchScore(item, otherItem))
    .filter(match => match.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
