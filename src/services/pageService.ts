import { database } from '@/database';
import { Q } from '@nozbe/watermelondb';
import Page from '@/database/models/Page';
import type { PageInput } from '@/types';

const pagesCollection = database.get<Page>('pages');

export async function createPage(input: PageInput): Promise<Page> {
  return database.write(async () => {
    return pagesCollection.create((page) => {
      page.bookId = input.bookId;
      page.pageNumber = input.pageNumber ?? null;
      page.markdownContent = input.markdownContent;
      page.imageUri = input.imageUri;
      page.ocrRawJson = input.ocrRawJson ?? null;
      page.createdAt = Date.now();
    });
  });
}

export async function getPagesByBook(bookId: string): Promise<Page[]> {
  return pagesCollection
    .query(Q.where('book_id', bookId), Q.sortBy('created_at', Q.asc))
    .fetch();
}

export async function deletePage(pageId: string): Promise<void> {
  const page = await pagesCollection.find(pageId);
  await database.write(async () => {
    await page.destroyPermanently();
  });
}
