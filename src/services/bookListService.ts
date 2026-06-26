import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import Book from '@/database/models/Book';
import { BookList, BookListItem } from '@/database/models/LibraryModels';

const booksCollection = database.get<Book>('books');
const listsCollection = database.get<BookList>('book_lists');
const itemsCollection = database.get<BookListItem>('book_list_items');

export interface BookListSummary {
  id: string;
  title: string;
  description: string | null;
  coverUri: string | null;
  sortOrder: number;
  bookCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookListUpdateInput {
  title?: string;
  description?: string | null;
  coverUri?: string | null;
}

export interface BookListBookItem { itemId: string; book: Book; sortOrder: number; createdAt: number }

function normalizeListTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

export async function createBookList(
  title: string,
  description?: string,
  coverUri?: string
): Promise<BookList> {
  const normalized = normalizeListTitle(title);
  if (!normalized) {
    throw new Error('书单名不能为空');
  }

  const now = Date.now();
  const count = await listsCollection.query().fetchCount();
  return database.write(async () => {
    return listsCollection.create((list) => {
      list.title = normalized;
      list.description = description?.trim() || null;
      list.coverUri = coverUri ?? null;
      list.sortOrder = count;
      list.createdAt = now;
      list.updatedAt = now;
    });
  });
}

export async function getBookLists(): Promise<BookList[]> {
  return listsCollection.query(Q.sortBy('sort_order', Q.asc), Q.sortBy('created_at', Q.asc)).fetch();
}

export async function getBookListSummaries(): Promise<BookListSummary[]> {
  const lists = await getBookLists();
  const counts = await Promise.all(
    lists.map((list) => itemsCollection.query(Q.where('book_list_id', list.id)).fetchCount())
  );
  return lists.map((list, index) => ({
    id: list.id,
    title: list.title,
    description: list.description,
    coverUri: list.coverUri,
    sortOrder: list.sortOrder,
    bookCount: counts[index],
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  }));
}

export async function updateBookList(
  bookListId: string,
  input: BookListUpdateInput
): Promise<BookList> {
  const list = await listsCollection.find(bookListId);
  const title = input.title == null ? undefined : normalizeListTitle(input.title);
  if (title === '') {
    throw new Error('书单名不能为空');
  }

  const now = Date.now();
  return database.write(async () => {
    return list.update((record) => {
      if (title !== undefined) record.title = title;
      if (input.description !== undefined) record.description = input.description?.trim() || null;
      if (input.coverUri !== undefined) record.coverUri = input.coverUri;
      record.updatedAt = now;
    });
  });
}

export async function deleteBookList(bookListId: string): Promise<void> {
  const list = await listsCollection.find(bookListId);
  const items = await itemsCollection.query(Q.where('book_list_id', bookListId)).fetch();
  await database.write(async () => {
    await Promise.all(items.map((item) => item.destroyPermanently()));
    await list.destroyPermanently();
  });
}

export async function setBookListSortOrder(
  bookListId: string,
  sortOrder: number
): Promise<BookList> {
  const list = await listsCollection.find(bookListId);
  const now = Date.now();
  return database.write(async () => {
    return list.update((record) => {
      record.sortOrder = sortOrder;
      record.updatedAt = now;
    });
  });
}

export async function addBookToList(bookListId: string, bookId: string): Promise<BookListItem> {
  await listsCollection.find(bookListId);
  await booksCollection.find(bookId);

  const existing = await itemsCollection
    .query(Q.where('book_list_id', bookListId), Q.where('book_id', bookId))
    .fetch();
  if (existing.length > 0) return existing[0];

  const count = await itemsCollection.query(Q.where('book_list_id', bookListId)).fetchCount();
  return database.write(async () => {
    return itemsCollection.create((item) => {
      item.bookListId = bookListId;
      item.bookId = bookId;
      item.sortOrder = count;
      item.createdAt = Date.now();
    });
  });
}

export async function addBooksToList(bookListId: string, bookIds: string[]): Promise<BookListItem[]> {
  const uniqueBookIds = Array.from(new Set(bookIds));
  const createdOrExisting: BookListItem[] = [];
  for (const bookId of uniqueBookIds) {
    createdOrExisting.push(await addBookToList(bookListId, bookId));
  }
  return createdOrExisting;
}

export async function removeBookFromList(bookListId: string, bookId: string): Promise<void> {
  const items = await itemsCollection
    .query(Q.where('book_list_id', bookListId), Q.where('book_id', bookId))
    .fetch();
  await database.write(async () => {
    await Promise.all(items.map((item) => item.destroyPermanently()));
  });
}

export async function removeBooksFromList(bookListId: string, bookIds: string[]): Promise<void> {
  const uniqueBookIds = Array.from(new Set(bookIds));
  await Promise.all(uniqueBookIds.map((bookId) => removeBookFromList(bookListId, bookId)));
}

export async function setBookListItemOrder(itemId: string, sortOrder: number): Promise<BookListItem> {
  const item = await itemsCollection.find(itemId);
  return database.write(async () => {
    return item.update((record) => {
      record.sortOrder = sortOrder;
    });
  });
}

export async function getBooksInList(bookListId: string): Promise<Book[]> {
  const items = await itemsCollection
    .query(Q.where('book_list_id', bookListId), Q.sortBy('sort_order', Q.asc))
    .fetch();
  return Promise.all(items.map((item) => booksCollection.find(item.bookId)));
}

export async function getBookListItemsWithBooks(bookListId: string): Promise<BookListBookItem[]> {
  const items = await itemsCollection.query(Q.where('book_list_id', bookListId), Q.sortBy('sort_order', Q.asc)).fetch();
  const books = await Promise.all(items.map((item) => booksCollection.find(item.bookId)));
  return items.map((item, index) => ({ itemId: item.id, book: books[index], sortOrder: item.sortOrder, createdAt: item.createdAt }));
}

export async function getBookIdsInList(bookListId: string): Promise<string[]> {
  const items = await itemsCollection.query(Q.where('book_list_id', bookListId), Q.sortBy('sort_order', Q.asc)).fetch();
  return items.map((item) => item.bookId);
}
