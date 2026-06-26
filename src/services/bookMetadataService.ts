import type { BookMetadata } from '@/types';
import type Book from '@/database/models/Book';

const REQUEST_TIMEOUT_MS = 12000;

export function normalizeISBN(value: string): string {
  return value.replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function isValidISBN13(value: string): boolean {
  const isbn = normalizeISBN(value);
  if (!/^\d{13}$/.test(isbn)) return false;

  const sum = isbn
    .slice(0, 12)
    .split('')
    .reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(isbn[12]);
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  return undefined;
}

function firstStringFromArray(value: unknown): string | undefined {
  return Array.isArray(value) ? firstString(value[0]) : undefined;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'native-reader/1.0 (book metadata lookup)',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface OpenLibraryBookData {
  title?: string;
  authors?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  publish_date?: string;
  number_of_pages?: number | string;
  cover?: { small?: string; medium?: string; large?: string };
  subjects?: Array<{ name?: string }>;
}

export async function lookupOpenLibraryByISBN(isbnInput: string): Promise<BookMetadata | null> {
  const isbn = normalizeISBN(isbnInput);
  if (!isValidISBN13(isbn)) {
    throw new Error('无效的 ISBN-13');
  }

  const url =
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}` +
    '&format=json&jscmd=data';
  const data = await fetchJson<Record<string, OpenLibraryBookData>>(url);
  const item = data[`ISBN:${isbn}`];
  if (!item) return null;

  return {
    isbn,
    title: firstString(item.title),
    authors: item.authors?.map((author) => firstString(author.name)).filter(Boolean) as string[] | undefined,
    publisher: firstStringFromArray(item.publishers?.map((publisher) => publisher.name)),
    publishedDate: firstString(item.publish_date),
    totalPages: parsePositiveInt(item.number_of_pages),
    coverUri: item.cover?.large ?? item.cover?.medium ?? item.cover?.small,
    categories: item.subjects?.map((subject) => firstString(subject.name)).filter(Boolean) as string[] | undefined,
    source: 'open_library',
    raw: item,
  };
}

interface GoogleBooksVolumeInfo {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  language?: string;
  categories?: string[];
  imageLinks?: { smallThumbnail?: string; thumbnail?: string };
}

interface GoogleBooksResponse {
  totalItems?: number;
  items?: Array<{ volumeInfo?: GoogleBooksVolumeInfo }>;
}

export async function lookupGoogleBooksByISBN(isbnInput: string): Promise<BookMetadata | null> {
  const isbn = normalizeISBN(isbnInput);
  if (!isValidISBN13(isbn)) {
    throw new Error('无效的 ISBN-13');
  }

  const params = new URLSearchParams({ q: `isbn:${isbn}` });
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
  if (apiKey) params.set('key', apiKey);
  const data = await fetchJson<GoogleBooksResponse>(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`
  );
  const volumeInfo = data.items?.[0]?.volumeInfo;
  if (!volumeInfo) return null;

  return {
    isbn,
    title: firstString(volumeInfo.title),
    authors: volumeInfo.authors?.filter(Boolean),
    publisher: firstString(volumeInfo.publisher),
    publishedDate: firstString(volumeInfo.publishedDate),
    description: firstString(volumeInfo.description),
    totalPages: parsePositiveInt(volumeInfo.pageCount),
    language: firstString(volumeInfo.language),
    coverUri: volumeInfo.imageLinks?.thumbnail ?? volumeInfo.imageLinks?.smallThumbnail,
    categories: volumeInfo.categories?.filter(Boolean),
    source: 'google_books',
    raw: volumeInfo,
  };
}

export async function lookupBookMetadataByISBN(isbnInput: string): Promise<BookMetadata | null> {
  const openLibrary = await lookupOpenLibraryByISBN(isbnInput).catch(() => null);
  if (openLibrary) return openLibrary;
  return lookupGoogleBooksByISBN(isbnInput).catch(() => null);
}

export async function applyBookMetadata(
  bookId: string,
  metadata: BookMetadata,
  overwrite = false
): Promise<import('@/database/models/Book').default> {
  const { database } = await import('@/database');
  const booksCollection = database.get<Book>('books');
  const book = await booksCollection.find(bookId);
  const now = Date.now();
  return database.write(async () => {
    return book.update((b) => {
      if (overwrite || !b.isbn) b.isbn = metadata.isbn ?? b.isbn;
      if (overwrite || !b.publisher) b.publisher = metadata.publisher ?? b.publisher;
      if (overwrite || !b.publishedDate) b.publishedDate = metadata.publishedDate ?? b.publishedDate;
      if (overwrite || !b.description) b.description = metadata.description ?? b.description;
      if (overwrite || b.totalPages == null) b.totalPages = metadata.totalPages ?? b.totalPages;
      if (overwrite || !b.coverUri) b.coverUri = metadata.coverUri ?? b.coverUri;
      b.metadataJson = JSON.stringify(metadata);
      b.updatedAt = now;
    });
  });
}
