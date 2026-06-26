import {
  buildDebugReaderSeedFixture,
  shouldResetDebugReaderSeed,
  shouldOpenDebugReaderOnStart,
} from '../debugContentSeedService';

describe('debugContentSeedService', () => {
  it('builds deterministic reader seed data with annotation anchors inside markdown', () => {
    const fixture = buildDebugReaderSeedFixture();

    expect(fixture.book.title).toBe('Debug C3 Annotation Test');
    expect(fixture.page.markdownContent).toContain('What laws govern our universe?');
    expect(fixture.vocabulary.map((item) => item.content)).toEqual(['universe', 'knowledge']);

    const universeStart = fixture.page.markdownContent.indexOf('universe');
    expect(fixture.annotations[0]).toMatchObject({
      type: 'highlight',
      startOffset: universeStart,
      endOffset: universeStart + 'universe'.length,
      selectedText: 'universe',
      color: '#FFEB3B',
    });

    const knowledgeStart = fixture.page.markdownContent.indexOf('knowledge');
    expect(fixture.annotations[1]).toMatchObject({
      type: 'comment',
      startOffset: knowledgeStart,
      endOffset: knowledgeStart + 'knowledge'.length,
      selectedText: 'knowledge',
      noteText: 'Debug note for iOS annotation tap.',
      color: '#FFEB3B',
    });

    const overlapText = 'How may this knowledge help us to comprehend the world and hence guide';
    const overlapStart = fixture.page.markdownContent.indexOf(overlapText);
    expect(fixture.annotations[2]).toMatchObject({
      type: 'highlight',
      startOffset: overlapStart,
      endOffset: overlapStart + overlapText.length,
      selectedText: overlapText,
      color: '#FFEB3B',
    });
    expect(fixture.annotations[2].startOffset).toBeLessThan(knowledgeStart);
    expect(fixture.annotations[2].endOffset).toBeGreaterThan(knowledgeStart + 'knowledge'.length);
  });

  it('opens the debug reader only when both debug seed and open-reader flags are enabled', () => {
    expect(
      shouldOpenDebugReaderOnStart({
        EXPO_PUBLIC_DEBUG_API_SEED_ENABLED: 'true',
        EXPO_PUBLIC_DEBUG_OPEN_READER_ON_START: 'true',
      }, { openReaderOnStart: false })
    ).toBe(true);

    expect(
      shouldOpenDebugReaderOnStart({
        EXPO_PUBLIC_DEBUG_API_SEED_ENABLED: 'false',
        EXPO_PUBLIC_DEBUG_OPEN_READER_ON_START: 'true',
      }, { openReaderOnStart: false })
    ).toBe(false);

    expect(
      shouldOpenDebugReaderOnStart({
        EXPO_PUBLIC_DEBUG_API_SEED_ENABLED: 'true',
        EXPO_PUBLIC_DEBUG_OPEN_READER_ON_START: 'false',
      }, { openReaderOnStart: false })
    ).toBe(false);

    expect(
      shouldOpenDebugReaderOnStart({}, { openReaderOnStart: true })
    ).toBe(true);
  });

  it('resets the debug reader seed whenever debug seeding is enabled', () => {
    expect(
      shouldResetDebugReaderSeed({
        EXPO_PUBLIC_DEBUG_API_SEED_ENABLED: 'true',
      }, { openReaderOnStart: false })
    ).toBe(true);

    expect(
      shouldResetDebugReaderSeed({
        EXPO_PUBLIC_DEBUG_API_SEED_ENABLED: 'false',
      }, { openReaderOnStart: false })
    ).toBe(false);

    expect(shouldResetDebugReaderSeed({}, { openReaderOnStart: true })).toBe(true);
    expect(shouldResetDebugReaderSeed({}, { openReaderOnStart: false })).toBe(false);
  });
});
