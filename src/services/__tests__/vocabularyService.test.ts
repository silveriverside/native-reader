jest.mock('@/database', () => ({
  database: {
    get: jest.fn(() => ({
      find: jest.fn(),
      query: jest.fn(),
    })),
  },
}));

import { getKnownWordsDelta } from '../vocabularyService';

describe('vocabularyService', () => {
  describe('getKnownWordsDelta', () => {
    it('increments when an item becomes known', () => {
      expect(getKnownWordsDelta('learning', 'known')).toBe(1);
      expect(getKnownWordsDelta('unknown', 'known')).toBe(1);
    });

    it('decrements when a known item is marked non-known', () => {
      expect(getKnownWordsDelta('known', 'learning')).toBe(-1);
      expect(getKnownWordsDelta('known', 'unknown')).toBe(-1);
    });

    it('does not change known count for non-known transitions', () => {
      expect(getKnownWordsDelta('learning', 'unknown')).toBe(0);
      expect(getKnownWordsDelta('unknown', 'learning')).toBe(0);
      expect(getKnownWordsDelta('known', 'known')).toBe(0);
    });
  });
});
