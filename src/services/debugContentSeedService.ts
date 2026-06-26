import type { AnnotationInput, BookInput, PageInput, VocabularyInput } from '@/types';
import type Book from '@/database/models/Book';
import type Page from '@/database/models/Page';
import type VocabularyItem from '@/database/models/VocabularyItem';
import type { Annotation as AnnotationModel } from '@/database/models/LibraryModels';
import { debugFlagsLocal } from '@/config/debugFlags.local';
import { buildAnchorSnapshot } from '@/utils/textUtils';

const DEBUG_BOOK_TITLE = 'Debug C3 Annotation Test';

const DEBUG_MARKDOWN = `# The roots of science

## The quest for the forces that shape the world

What laws govern our universe? How shall we know them?
How may this knowledge help us to comprehend the world and hence guide
its actions to our advantage?

Since the dawn of humanity, people have been deeply concerned by
questions like these.`;

interface DebugReaderSeedFixture {
  book: BookInput;
  page: Omit<PageInput, 'bookId'>;
  vocabulary: Array<Omit<VocabularyInput, 'pageId'>>;
  annotations: Array<Omit<AnnotationInput, 'bookId' | 'pageId'>>;
}

function isActiveRecord(record: { _raw?: { _status?: string } }): boolean {
  return record._raw?._status !== 'deleted';
}

function annotationFor(
  text: string,
  type: AnnotationInput['type'],
  noteText?: string
): Omit<AnnotationInput, 'bookId' | 'pageId'> {
  const start = DEBUG_MARKDOWN.indexOf(text);
  if (start < 0) {
    throw new Error(`Debug seed text not found: ${text}`);
  }
  const end = start + text.length;
  const snapshot = buildAnchorSnapshot(DEBUG_MARKDOWN, start, end);
  return {
    type,
    startOffset: start,
    endOffset: end,
    selectedText: snapshot.selectedText,
    prefixText: snapshot.prefixText,
    suffixText: snapshot.suffixText,
    noteText,
    color: '#FFEB3B',
  };
}

export function buildDebugReaderSeedFixture(): DebugReaderSeedFixture {
  return {
    book: {
      title: DEBUG_BOOK_TITLE,
      sourceLang: 'en',
      targetLang: 'zh',
      totalPages: 1,
      description: 'Local debug fixture for C-3 annotation verification.',
    },
    page: {
      pageNumber: 1,
      markdownContent: DEBUG_MARKDOWN,
      imageUri: 'debug://c3-annotation-fixture',
      ocrRawJson: JSON.stringify({ source: 'debugContentSeedService' }),
    },
    vocabulary: [
      {
        content: 'universe',
        type: 'word',
        status: 'unknown',
        translation: '宇宙',
        contextSentence: 'What laws govern our universe?',
      },
      {
        content: 'knowledge',
        type: 'word',
        status: 'unknown',
        translation: '知识',
        contextSentence: 'How may this knowledge help us to comprehend the world?',
      },
    ],
    annotations: [
      annotationFor('universe', 'highlight'),
      annotationFor('knowledge', 'comment', 'Debug note for iOS annotation tap.'),
      annotationFor(
        'How may this knowledge help us to comprehend the world and hence guide',
        'highlight'
      ),
    ],
  };
}

export function shouldOpenDebugReaderOnStart(
  env: Record<string, string | undefined> = process.env,
  localFlags: { openReaderOnStart?: boolean } = debugFlagsLocal
): boolean {
  if (localFlags.openReaderOnStart === true) return true;
  return (
    env.EXPO_PUBLIC_DEBUG_API_SEED_ENABLED === 'true' &&
    env.EXPO_PUBLIC_DEBUG_OPEN_READER_ON_START === 'true'
  );
}

export function shouldResetDebugReaderSeed(
  env: Record<string, string | undefined> = process.env,
  localFlags: { openReaderOnStart?: boolean } = debugFlagsLocal
): boolean {
  if (localFlags.openReaderOnStart === true) return true;
  return env.EXPO_PUBLIC_DEBUG_API_SEED_ENABLED === 'true';
}

export async function seedDebugReaderContentIfAvailable(): Promise<void> {
  if (!shouldResetDebugReaderSeed()) {
    return;
  }

  const [{ Q }, { database }] = await Promise.all([
    import('@nozbe/watermelondb'),
    import('@/database'),
  ]);
  const booksCollection = database.get<Book>('books');
  const existingBooks = (await booksCollection.query(Q.where('title', DEBUG_BOOK_TITLE)).fetch())
    .filter(isActiveRecord);

  const fixture = buildDebugReaderSeedFixture();
  const now = Date.now();

  await database.write(async () => {
    if (shouldResetDebugReaderSeed()) {
      await Promise.all(existingBooks.map((book) => book.markAsDeleted()));
    } else if (existingBooks.length > 0) {
      return;
    }

    const book = await booksCollection.create((item) => {
      item.title = fixture.book.title;
      item.sourceLang = fixture.book.sourceLang;
      item.targetLang = fixture.book.targetLang;
      item.coverUri = fixture.book.coverUri ?? null;
      item.isbn = fixture.book.isbn ?? null;
      item.publisher = fixture.book.publisher ?? null;
      item.publishedDate = fixture.book.publishedDate ?? null;
      item.description = fixture.book.description ?? null;
      item.totalPages = fixture.book.totalPages ?? null;
      item.metadataJson = fixture.book.metadataJson ?? null;
      item.pinnedAt = Date.now();
      item.archivedAt = null;
      item.sortOrder = -1;
      item.createdAt = now;
      item.updatedAt = now;
    });

    const page = await database.get<Page>('pages').create((item) => {
      item.bookId = book.id;
      item.pageNumber = fixture.page.pageNumber ?? null;
      item.markdownContent = fixture.page.markdownContent;
      item.imageUri = fixture.page.imageUri;
      item.ocrRawJson = fixture.page.ocrRawJson ?? null;
      item.createdAt = now;
    });

    await Promise.all(
      fixture.vocabulary.map((entry) =>
        database.get<VocabularyItem>('vocabulary_items').create((item) => {
          item.pageId = page.id;
          item.content = entry.content;
          item.type = entry.type;
          item.status = entry.status;
          item.translation = entry.translation ?? null;
          item.contextSentence = entry.contextSentence ?? null;
          item.explanation = entry.explanation ?? null;
          item.createdAt = now;
        })
      )
    );

    for (const entry of fixture.annotations) {
      await database.get<AnnotationModel>('annotations').create((item) => {
        item.bookId = book.id;
        item.pageId = page.id;
        item.type = entry.type;
        item.startOffset = entry.startOffset;
        item.endOffset = entry.endOffset;
        item.selectedText = entry.selectedText;
        item.prefixText = entry.prefixText ?? null;
        item.suffixText = entry.suffixText ?? null;
        item.noteText = entry.noteText ?? null;
        item.color = entry.color ?? null;
        item.createdAt = now;
        item.updatedAt = now;
      });
    }
  });
}

export async function getDebugReaderSeedPageIdIfAvailable(): Promise<string | null> {
  if (!shouldOpenDebugReaderOnStart()) return null;

  const [{ Q }, { database }] = await Promise.all([
    import('@nozbe/watermelondb'),
    import('@/database'),
  ]);
  const books = await database
    .get<Book>('books')
    .query(Q.where('title', DEBUG_BOOK_TITLE))
    .fetch();
  const book = books.filter(isActiveRecord)[0];
  if (!book) return null;

  const pages = await database
    .get<Page>('pages')
    .query(Q.where('book_id', book.id), Q.sortBy('page_number', Q.asc))
    .fetch();
  return pages.filter(isActiveRecord)[0]?.id ?? null;
}
