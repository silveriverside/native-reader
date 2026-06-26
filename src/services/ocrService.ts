import * as FileSystem from 'expo-file-system/legacy';
import { getActiveAIProvider } from '@/api/core/providerFactory';
import type { AIProvider } from '@/api/types';
import type { OCRStructuredResult } from '@/api/providers/VolcengineProvider';
import { findOrCreateBook } from './bookService';
import { createPage } from './pageService';
import type { BookInput } from '@/types';
import type Book from '@/database/models/Book';
import type Page from '@/database/models/Page';

export interface OCRJob {
  imageUri: string;
  /**
   * 用户手动填写的页码；填写则优先生效，未填（undefined/null）则交给 AI 识别。
   * 绝不伪造序号。
   */
  manualPageNumber?: number | null;
}

export interface OCRResultItem {
  /** AI 识别出的页码；识别不到为 null（不伪造序号）。 */
  pageNumber: number | null;
  markdown: string;
  imageUri: string;
}

/** 支持结构化 OCR（携带页码）的 provider。 */
type StructuredOCRProvider = AIProvider & {
  ocrStructured(imageBase64: string): Promise<OCRStructuredResult>;
};

function supportsStructuredOCR(
  provider: AIProvider
): provider is StructuredOCRProvider {
  return (
    typeof (provider as Partial<StructuredOCRProvider>).ocrStructured ===
    'function'
  );
}

/**
 * 调用 provider 做 OCR。
 * - provider 支持结构化 OCR 时，返回 AI 识别出的页码（可能为 null）。
 * - 不支持时退回普通 ocr()，页码记为 null（绝不伪造）。
 */
async function runOCR(
  provider: AIProvider,
  base64: string
): Promise<OCRStructuredResult> {
  if (supportsStructuredOCR(provider)) {
    return provider.ocrStructured(base64);
  }
  const result = await provider.ocr(base64);
  return { markdown: result.markdown, pageNumber: null };
}

export async function performOCR(
  jobs: OCRJob[],
  bookInput: BookInput
): Promise<{ book: Book; pages: Page[] }> {
  const book = await findOrCreateBook(bookInput);
  const provider = await getActiveAIProvider();
  const pages: Page[] = [];

  // Process with concurrency limit of 2 to avoid rate limiting
  for (let i = 0; i < jobs.length; i += 2) {
    const batch = jobs.slice(i, i + 2);
    const results = await Promise.all(
      batch.map(async (job): Promise<OCRResultItem> => {
        const base64 = await imageToBase64(job.imageUri);
        const ocrResult = await runOCR(provider, base64);
        // 页码优先级：用户手动填写 > AI 识别结果（识别不到为 null，绝不伪造）
        const pageNumber =
          job.manualPageNumber != null ? job.manualPageNumber : ocrResult.pageNumber;
        return {
          pageNumber,
          markdown: ocrResult.markdown,
          imageUri: job.imageUri,
        };
      })
    );

    for (const result of results) {
      const page = await createPage({
        bookId: book.id,
        pageNumber: result.pageNumber,
        markdownContent: result.markdown,
        imageUri: result.imageUri,
      });
      pages.push(page);
    }
  }

  return { book, pages };
}

async function imageToBase64(uri: string): Promise<string> {
  // Handle remote URLs vs local file URIs
  if (uri.startsWith('http')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Local file
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}
