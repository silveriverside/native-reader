import type { SelectionAction } from '@/native/markdownSelection/types';

interface ShouldAcceptMarkdownSelectionInput {
  action: SelectionAction;
  selectionClearedAt: number;
  now: number;
  suppressMs?: number;
}

export const SELECTION_CLEAR_SUPPRESS_MS = 350;

export function shouldAcceptMarkdownSelection(
  input: ShouldAcceptMarkdownSelectionInput
): boolean {
  if (input.action !== 'selectionChanged') return true;
  if (input.selectionClearedAt <= 0) return true;
  const elapsed = input.now - input.selectionClearedAt;
  return elapsed < 0 || elapsed > (input.suppressMs ?? SELECTION_CLEAR_SUPPRESS_MS);
}
