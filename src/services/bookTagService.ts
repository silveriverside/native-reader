import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import Book from '@/database/models/Book';
import { BookTag, BookTagAssignment } from '@/database/models/LibraryModels';

const booksCollection = database.get<Book>('books');
const tagsCollection = database.get<BookTag>('book_tags');
const assignmentsCollection = database.get<BookTagAssignment>('book_tag_assignments');

function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export async function createBookTag(name: string, color?: string): Promise<BookTag> {
  const normalized = normalizeTagName(name);
  if (!normalized) {
    throw new Error('标签名不能为空');
  }

  const existing = await tagsCollection.query(Q.where('name', normalized)).fetch();
  if (existing.length > 0) return existing[0];

  const now = Date.now();
  return database.write(async () => {
    return tagsCollection.create((tag) => {
      tag.name = normalized;
      tag.color = color ?? null;
      tag.createdAt = now;
      tag.updatedAt = now;
    });
  });
}

export async function getBookTags(): Promise<BookTag[]> {
  return tagsCollection.query(Q.sortBy('name', Q.asc)).fetch();
}

export async function updateBookTagColor(tagId: string, color: string | null): Promise<BookTag> {
  if (color != null && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error('标签颜色必须是 6 位十六进制颜色');
  }

  const tag = await tagsCollection.find(tagId);
  const now = Date.now();
  return database.write(async () => {
    return tag.update((t) => {
      t.color = color;
      t.updatedAt = now;
    });
  });
}

export async function addTagToBook(bookId: string, tagId: string): Promise<BookTagAssignment> {
  await booksCollection.find(bookId);
  await tagsCollection.find(tagId);

  const existing = await assignmentsCollection
    .query(Q.where('book_id', bookId), Q.where('tag_id', tagId))
    .fetch();
  if (existing.length > 0) return existing[0];

  return database.write(async () => {
    return assignmentsCollection.create((assignment) => {
      assignment.bookId = bookId;
      assignment.tagId = tagId;
      assignment.createdAt = Date.now();
    });
  });
}

export async function removeTagFromBook(bookId: string, tagId: string): Promise<void> {
  const assignments = await assignmentsCollection
    .query(Q.where('book_id', bookId), Q.where('tag_id', tagId))
    .fetch();
  await database.write(async () => {
    await Promise.all(assignments.map((assignment) => assignment.destroyPermanently()));
  });
}

export async function getTagsByBook(bookId: string): Promise<BookTag[]> {
  const assignments = await assignmentsCollection.query(Q.where('book_id', bookId)).fetch();
  return Promise.all(assignments.map((assignment) => tagsCollection.find(assignment.tagId)));
}
