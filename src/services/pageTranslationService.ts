import { Q } from '@nozbe/watermelondb';
import { database } from '@/database';
import Page from '@/database/models/Page';
import { PageTranslation } from '@/database/models/LibraryModels';
import { getActiveAIProvider } from '@/api/core/providerFactory';

const pagesCollection = database.get<Page>('pages');
const translationsCollection = database.get<PageTranslation>('page_translations');

export interface PageTranslationResult {
  content: string;
  fromCache: boolean;
  language: string;
  pageId: string;
  sourceHash: string;
}

export function createContentHash(content: string): string {
  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (!normalized) {
    throw new Error('译文语言不能为空');
  }
  return normalized;
}

export async function getCachedPageTranslation(
  pageId: string,
  language: string,
  sourceHash: string
): Promise<PageTranslation | null> {
  const normalizedLanguage = normalizeLanguage(language);
  const records = await translationsCollection
    .query(
      Q.where('page_id', pageId),
      Q.where('language', normalizedLanguage),
      Q.where('source_hash', sourceHash)
    )
    .fetch();
  return records[0] ?? null;
}

export async function translatePageWithCache(
  pageId: string,
  targetLanguage: string
): Promise<PageTranslationResult> {
  const language = normalizeLanguage(targetLanguage);
  const page = await pagesCollection.find(pageId);
  const source = page.markdownContent.trim();
  if (!source) {
    throw new Error('当前页面没有可翻译内容');
  }

  const sourceHash = createContentHash(source);
  const cached = await getCachedPageTranslation(pageId, language, sourceHash);
  if (cached) {
    return { content: cached.content, fromCache: true, language, pageId, sourceHash };
  }

  const provider = await getActiveAIProvider();
  const translated = await provider.translate(source, 'auto', language);
  const content = translated.trim();
  if (!content) {
    throw new Error('翻译结果为空，这是需要继续修复的异常。');
  }

  const now = Date.now();
  await database.write(async () => {
    await translationsCollection.create((record) => {
      record.pageId = pageId;
      record.language = language;
      record.content = content;
      record.format = 'markdown';
      record.provider = provider.name;
      record.modelName = null;
      record.sourceHash = sourceHash;
      record.createdAt = now;
      record.updatedAt = now;
    });
  });

  return { content, fromCache: false, language, pageId, sourceHash };
}
