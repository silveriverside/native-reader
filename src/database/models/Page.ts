import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type Book from './Book';
import type VocabularyItem from './VocabularyItem';

export default class Page extends Model {
  static table = 'pages';

  @field('book_id') bookId!: string;
  @field('page_number') pageNumber!: number | null;
  @field('markdown_content') markdownContent!: string;
  @field('image_uri') imageUri!: string;
  @field('ocr_raw_json') ocrRawJson!: string | null;
  @field('created_at') createdAt!: number;

  @relation('books', 'book_id') book!: Book;
  @relation('vocabulary_items', 'page_id') vocabularyItems!: Query<VocabularyItem>;
}
