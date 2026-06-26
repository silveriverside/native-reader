import type { CEFRLevel } from '@/types';

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function estimateLevel(
  totalKnownWords: number,
  totalStudiedWords: number
): CEFRLevel {
  const knownWords = Math.max(0, totalKnownWords);
  const studiedWords = Math.max(0, totalStudiedWords);
  if (studiedWords === 0) return 'A1';

  const masteryRatio = Math.min(1, knownWords / studiedWords);
  const baseIndex = levelIndexByKnownWords(knownWords);

  if (masteryRatio < 0.4 && baseIndex > 0) {
    return LEVEL_ORDER[baseIndex - 1];
  }
  if (masteryRatio > 0.8 && knownWords >= nextLevelThreshold(baseIndex)) {
    return LEVEL_ORDER[Math.min(baseIndex + 1, LEVEL_ORDER.length - 1)];
  }
  return LEVEL_ORDER[baseIndex];
}

export function nextLevel(current: CEFRLevel): CEFRLevel | null {
  const idx = LEVEL_ORDER.indexOf(current);
  return LEVEL_ORDER[idx + 1] ?? null;
}

function levelIndexByKnownWords(totalKnownWords: number): number {
  if (totalKnownWords >= 5000) return 5;
  if (totalKnownWords >= 3500) return 4;
  if (totalKnownWords >= 2200) return 3;
  if (totalKnownWords >= 1200) return 2;
  if (totalKnownWords >= 500) return 1;
  return 0;
}

function nextLevelThreshold(currentIndex: number): number {
  const thresholds = [500, 1200, 2200, 3500, 5000, Number.POSITIVE_INFINITY];
  return thresholds[currentIndex] ?? Number.POSITIVE_INFINITY;
}
