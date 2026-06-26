import { database } from '@/database';
import Book from '@/database/models/Book';

const booksCollection = database.get<Book>('books');

export async function pinBook(bookId: string): Promise<Book> {
  const book = await booksCollection.find(bookId);
  const now = Date.now();
  return database.write(async () => {
    return book.update((b) => {
      b.pinnedAt = now;
      b.updatedAt = now;
    });
  });
}

export async function unpinBook(bookId: string): Promise<Book> {
  const book = await booksCollection.find(bookId);
  const now = Date.now();
  return database.write(async () => {
    return book.update((b) => {
      b.pinnedAt = null;
      b.updatedAt = now;
    });
  });
}

export async function archiveBook(bookId: string): Promise<Book> {
  const book = await booksCollection.find(bookId);
  const now = Date.now();
  return database.write(async () => {
    return book.update((b) => {
      b.archivedAt = now;
      b.updatedAt = now;
    });
  });
}

export async function restoreBook(bookId: string): Promise<Book> {
  const book = await booksCollection.find(bookId);
  const now = Date.now();
  return database.write(async () => {
    return book.update((b) => {
      b.archivedAt = null;
      b.updatedAt = now;
    });
  });
}

export async function setBookSortOrder(bookId: string, sortOrder: number): Promise<Book> {
  const book = await booksCollection.find(bookId);
  const now = Date.now();
  return database.write(async () => {
    return book.update((b) => {
      b.sortOrder = sortOrder;
      b.updatedAt = now;
    });
  });
}
