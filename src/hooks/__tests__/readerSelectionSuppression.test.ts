import { shouldAcceptMarkdownSelection } from '../readerSelectionSuppression';

describe('readerSelectionSuppression', () => {
  it('ignores late selectionChanged events immediately after clearing selection', () => {
    expect(
      shouldAcceptMarkdownSelection({
        action: 'selectionChanged',
        selectionClearedAt: 1000,
        now: 1100,
      })
    ).toBe(false);
  });

  it('accepts selectionChanged events outside the suppression window', () => {
    expect(
      shouldAcceptMarkdownSelection({
        action: 'selectionChanged',
        selectionClearedAt: 1000,
        now: 1600,
      })
    ).toBe(true);
  });

  it('does not suppress explicit native menu actions', () => {
    expect(
      shouldAcceptMarkdownSelection({
        action: 'translate',
        selectionClearedAt: 1000,
        now: 1100,
      })
    ).toBe(true);
  });
});
