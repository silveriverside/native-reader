import type { AnnotationRange } from '@/native/markdownSelection/types';

function annotationLength(annotation: Pick<AnnotationRange, 'startOffset' | 'endOffset'>): number {
  return annotation.endOffset - annotation.startOffset;
}

export function compareAnnotationHitPriority(
  left: Pick<AnnotationRange, 'startOffset' | 'endOffset'>,
  right: Pick<AnnotationRange, 'startOffset' | 'endOffset'>
): number {
  const lengthDelta = annotationLength(left) - annotationLength(right);
  if (lengthDelta !== 0) return lengthDelta;

  return right.startOffset - left.startOffset;
}

export function sortAnnotationsForHitTesting<T extends AnnotationRange>(annotations: readonly T[]): T[] {
  return annotations
    .map((annotation, index) => ({ annotation, index }))
    .sort((left, right) => {
      const priority = compareAnnotationHitPriority(left.annotation, right.annotation);
      if (priority !== 0) return priority;
      return left.index - right.index;
    })
    .map((item) => item.annotation);
}
