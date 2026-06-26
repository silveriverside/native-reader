import { extractSentenceByRange, extractWords, normalizeInlineText, truncate } from '../textUtils';

describe('textUtils', () => {
  describe('extractWords', () => {
    it('extracts words from simple text', () => {
      expect(extractWords('Hello world')).toEqual(['hello', 'world']);
    });

    it('removes punctuation', () => {
      expect(extractWords('Hello, world!')).toEqual(['hello', 'world']);
    });

    it('handles empty string', () => {
      expect(extractWords('')).toEqual([]);
    });
  });

  describe('truncate', () => {
    it('returns original text if short enough', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates long text', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });
  });

  describe('normalizeInlineText', () => {
    it('collapses extra whitespace', () => {
      expect(normalizeInlineText('Hello   \n   world')).toBe('Hello world');
    });
  });

  describe('extractSentenceByRange', () => {
    it('extracts the full English sentence containing the selection', () => {
      const text = 'Hello world. This is a selected phrase in the second sentence! Last one.';
      const start = text.indexOf('selected phrase');
      const end = start + 'selected phrase'.length;
      expect(extractSentenceByRange(text, start, end)).toBe(
        'This is a selected phrase in the second sentence!'
      );
    });

    it('extracts the current line when the page uses line breaks', () => {
      const text = 'Title line\nFirst paragraph line\nSecond paragraph line';
      const start = text.indexOf('paragraph');
      const end = start + 'paragraph'.length;
      expect(extractSentenceByRange(text, start, end)).toBe('First paragraph line');
    });

    it('returns null for empty text', () => {
      expect(extractSentenceByRange('', 0, 1)).toBeNull();
    });
  });
});
