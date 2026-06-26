import { database } from '@/database';
import { Q } from '@nozbe/watermelondb';
import Book from '@/database/models/Book';
import Page from '@/database/models/Page';
import type { BookInput, BookSummary } from '@/types';

const booksCollection = database.get<Book>('books');
const pagesCollection = database.get<Page>('pages');

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

function normalizeOptionalText(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function shouldBackfill(current: string | number | null, next: string | number | null): boolean {
  return current == null && next != null;
}

function toBookSummary(book: Book, pageCount: number): BookSummary {
  const totalPages = book.totalPages;
  const progressRatio =
    totalPages && totalPages > 0 ? Math.min(pageCount, totalPages) / totalPages : null;
  return {
    id: book.id,
    title: book.title,
    sourceLang: book.sourceLang,
    targetLang: book.targetLang,
    coverUri: book.coverUri,
    isbn: book.isbn,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    description: book.description,
    totalPages,
    metadataJson: book.metadataJson,
    pinnedAt: book.pinnedAt,
    archivedAt: book.archivedAt,
    sortOrder: book.sortOrder ?? 0,
    pageCount,
    progressRatio,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

function compareBooksForShelf(a: Book, b: Book): number {
  const aPinned = a.pinnedAt ?? 0;
  const bPinned = b.pinnedAt ?? 0;
  if (aPinned !== bPinned) return bPinned - aPinned;

  const aSort = a.sortOrder ?? 0;
  const bSort = b.sortOrder ?? 0;
  if (aSort !== bSort) return aSort - bSort;

  return b.updatedAt - a.updatedAt;
}

export async function createBook(input: BookInput): Promise<Book> {
  const now = Date.now();
  const sortOrder = await booksCollection.query().fetchCount();
  return database.write(async () => {
    return booksCollection.create((book) => {
      book.title = normalizeTitle(input.title);
      book.sourceLang = input.sourceLang;
      book.targetLang = input.targetLang;
      book.coverUri = input.coverUri ?? null;
      book.isbn = normalizeOptionalText(input.isbn);
      book.publisher = normalizeOptionalText(input.publisher);
      book.publishedDate = normalizeOptionalText(input.publishedDate);
      book.description = normalizeOptionalText(input.description);
      book.totalPages = input.totalPages ?? null;
      book.metadataJson = input.metadataJson ?? null;
      book.pinnedAt = null;
      book.archivedAt = null;
      book.sortOrder = sortOrder;
      book.createdAt = now;
      book.updatedAt = now;
    });
  });
}

/**
 * 相同书籍只合并：标题去除多余空白后完全相同，即视为同一本书。
 * 命中已有书则复用（并按需补封面、刷新更新时间），否则新建。
 */
export async function findOrCreateBook(input: BookInput): Promise<Book> {
  const normalized = normalizeTitle(input.title);
  const existing = await booksCollection
    .query(Q.where('title', normalized))
    .fetch();

  if (existing.length > 0) {
    const book = existing[0];
    const now = Date.now();
    const isbn = normalizeOptionalText(input.isbn);
    const publisher = normalizeOptionalText(input.publisher);
    const publishedDate = normalizeOptionalText(input.publishedDate);
    const description = normalizeOptionalText(input.description);
    const totalPages = input.totalPages ?? null;
    const metadataJson = input.metadataJson ?? null;
    await database.write(async () => {
      await book.update((b) => {
        if (input.coverUri && !b.coverUri) {
          b.coverUri = input.coverUri;
        }
        if (shouldBackfill(b.isbn, isbn)) b.isbn = isbn;
        if (shouldBackfill(b.publisher, publisher)) b.publisher = publisher;
        if (shouldBackfill(b.publishedDate, publishedDate)) b.publishedDate = publishedDate;
        if (shouldBackfill(b.description, description)) b.description = description;
        if (shouldBackfill(b.totalPages, totalPages)) b.totalPages = totalPages;
        if (shouldBackfill(b.metadataJson, metadataJson)) b.metadataJson = metadataJson;
        b.updatedAt = now;
      });
    });
    return book;
  }

  return createBook({ ...input, title: normalized });
}

export async function getBooks(): Promise<Book[]> {
  return booksCollection.query().fetch();
}

export async function getBookById(bookId: string): Promise<Book> {
  return booksCollection.find(bookId);
}

/** 书架列表：默认隐藏归档书籍，置顶优先，其次按自定义排序和更新时间展示。 */
export async function getRecentBooks(includeArchived = false): Promise<BookSummary[]> {
  const books = await booksCollection.query().fetch();
  const visibleBooks = includeArchived
    ? books
    : books.filter((book) => book.archivedAt == null);
  const sortedBooks = [...visibleBooks].sort(compareBooksForShelf);

  const summaries = await Promise.all(
    sortedBooks.map(async (book) => {
      const pageCount = await pagesCollection
        .query(Q.where('book_id', book.id))
        .fetchCount();
      return toBookSummary(book, pageCount);
    })
  );

  return summaries;
}

export async function updateBookCover(bookId: string, coverUri: string): Promise<void> {
  const book = await booksCollection.find(bookId);
  await database.write(async () => {
    await book.update((b) => {
      b.coverUri = coverUri;
      b.updatedAt = Date.now();
    });
  });
}

/** 书籍有新内容时刷新更新时间，使其排到最近列表前面。 */
export async function touchBook(bookId: string): Promise<void> {
  const book = await booksCollection.find(bookId);
  await database.write(async () => {
    await book.update((b) => {
      b.updatedAt = Date.now();
    });
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  const book = await booksCollection.find(bookId);
  const pages = await pagesCollection.query(Q.where('book_id', bookId)).fetch();
  await database.write(async () => {
    await Promise.all(pages.map((page) => page.destroyPermanently()));
    await book.destroyPermanently();
  });
}
