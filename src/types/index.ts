export type VocabularyType = 'word' | 'phrase' | 'idiom';
export type VocabularyStatus = 'known' | 'unknown' | 'learning';
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type AIProviderType = 'volcengine' | 'aliyun' | 'openai';
export type ReaderMode = 'original' | 'translation' | 'bilingual';
export type AnnotationType = 'highlight' | 'underline' | 'comment';
export type NoteScope = 'page' | 'chapter' | 'book';
export type TextContentFormat = 'markdown' | 'plain_text';

export interface BookInput {
  title: string;
  sourceLang: string;
  targetLang: string;
  coverUri?: string;
  isbn?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  totalPages?: number | null;
  metadataJson?: string;
}

export interface BookSummary {
  id: string;
  title: string;
  sourceLang: string;
  targetLang: string;
  coverUri?: string | null;
  isbn?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  description?: string | null;
  totalPages?: number | null;
  metadataJson?: string | null;
  pinnedAt?: number | null;
  archivedAt?: number | null;
  sortOrder?: number;
  pageCount: number;
  progressRatio?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface BookMetadata {
  isbn?: string;
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  totalPages?: number | null;
  language?: string;
  coverUri?: string;
  categories?: string[];
  source: 'open_library' | 'google_books' | 'manual' | 'other';
  raw?: unknown;
}

export interface BookReadingProgress {
  bookId: string;
  capturedPages: number;
  totalPages?: number | null;
  progressRatio?: number | null;
}

export interface BookTag {
  id: string;
  name: string;
  color?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface BookList {
  id: string;
  title: string;
  description?: string | null;
  coverUri?: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface BookListItem {
  id: string;
  bookListId: string;
  bookId: string;
  sortOrder: number;
  createdAt: number;
}

export interface PageInput {
  bookId: string;
  pageNumber?: number | null;
  markdownContent: string;
  imageUri: string;
  ocrRawJson?: string;
}

export interface VocabularyInput {
  pageId: string;
  content: string;
  type: VocabularyType;
  status: VocabularyStatus;
  translation?: string;
  contextSentence?: string;
  explanation?: string;
}

export interface VocabularyItem {
  id: string;
  pageId: string;
  content: string;
  type: VocabularyType;
  status: VocabularyStatus;
  translation?: string | null;
  contextSentence?: string | null;
  explanation?: string | null;
  createdAt?: number;
}

export interface PageTranslation {
  id: string;
  pageId: string;
  language: string;
  content: string;
  format: TextContentFormat;
  provider?: AIProviderType | string | null;
  modelName?: string | null;
  sourceHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface AnnotationAnchor {
  bookId: string;
  pageId: string;
  startOffset: number;
  endOffset: number;
  selectedText: string;
  prefixText?: string | null;
  suffixText?: string | null;
}

export interface AnnotationInput extends AnnotationAnchor {
  type: AnnotationType;
  noteText?: string;
  color?: string;
}

export interface Annotation extends AnnotationAnchor {
  id: string;
  type: AnnotationType;
  noteText?: string | null;
  color?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PageNoteInput {
  bookId: string;
  pageId?: string | null;
  noteScope: NoteScope;
  anchorKey?: string | null;
  content: string;
  format?: TextContentFormat;
}

export interface PageNote extends PageNoteInput {
  id: string;
  format: TextContentFormat;
  createdAt: number;
  updatedAt: number;
}

export interface MarkdownBookExportManifest {
  version: 1;
  exportedAt: number;
  book: BookSummary;
  tags: BookTag[];
  bookLists: BookList[];
  pageFiles: string[];
  translationFiles: string[];
  annotationsFile: string;
  notesDirectory: string;
  assetsDirectory: string;
}

export interface ApiConfigInput {
  provider: AIProviderType;
  apiKey: string;
  apiSecret?: string;
  endpoint?: string;
  modelName?: string;
  isActive: boolean;
}

export interface LearningGuide {
  difficultWords: Array<{
    word: string;
    translation: string;
    explanation: string;
    context?: string;
  }>;
  phrases: Array<{
    phrase: string;
    translation: string;
    explanation: string;
    context?: string;
  }>;
  idioms: Array<{
    idiom: string;
    translation: string;
    explanation: string;
    context?: string;
  }>;
  previewQuestions: string[];
  summary: string;
}
