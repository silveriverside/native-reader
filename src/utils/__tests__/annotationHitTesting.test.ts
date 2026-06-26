import type { AnnotationRange } from '@/native/markdownSelection/types';
import { sortAnnotationsForHitTesting } from '../annotationHitTesting';

function ann(
  id: string,
  startOffset: number,
  endOffset: number
): AnnotationRange {
  return {
    id,
    type: 'highlight',
    startOffset,
    endOffset,
    color: '#FFEB3B',
  };
}

describe('annotationHitTesting', () => {
  it('prefers the shortest overlapping annotation range', () => {
    const sorted = sortAnnotationsForHitTesting([
      ann('long', 10, 40),
      ann('short', 18, 25),
      ann('medium', 15, 30),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['short', 'medium', 'long']);
  });

  it('prefers the later start offset when ranges have the same length', () => {
    const sorted = sortAnnotationsForHitTesting([
      ann('earlier', 10, 20),
      ann('later', 15, 25),
      ann('latest', 20, 30),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['latest', 'later', 'earlier']);
  });

  it('preserves input order when ranges have the same start and length', () => {
    const sorted = sortAnnotationsForHitTesting([
      ann('first', 10, 20),
      ann('second', 10, 20),
      ann('third', 10, 20),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['first', 'second', 'third']);
  });
});
