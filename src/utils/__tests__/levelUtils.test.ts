import { estimateLevel, nextLevel } from '../levelUtils';
import type { CEFRLevel } from '@/types';

describe('levelUtils', () => {
  describe('estimateLevel', () => {
    it('returns A1 for zero studied words', () => {
      expect(estimateLevel(0, 0)).toBe('A1');
    });

    it('returns A1 for low known words', () => {
      expect(estimateLevel(100, 200)).toBe('A1');
    });

    it('returns A2 for 500 known words with good ratio', () => {
      expect(estimateLevel(500, 600)).toBe('A2');
    });

    it('downgrades when ratio is low', () => {
      expect(estimateLevel(500, 2000)).toBe('A1');
    });

    it('caps at C2', () => {
      expect(estimateLevel(10000, 10000)).toBe('C2');
    });
  });

  describe('nextLevel', () => {
    it('returns next level', () => {
      expect(nextLevel('A1')).toBe('A2');
      expect(nextLevel('B1')).toBe('B2');
    });

    it('returns null for C2', () => {
      expect(nextLevel('C2')).toBeNull();
    });
  });
});
