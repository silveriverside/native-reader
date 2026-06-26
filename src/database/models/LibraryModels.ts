import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type Book from './Book';
import type Page from './Page';

export class BookTag extends Model {
  static table = 'book_tags';

  @field('name') name!: string;
  @field('color') color!: string | null;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}

export class BookTagAssignment extends Model {
  static table = 'book_tag_assignments';

  @field('book_id') bookId!: string;
  @field('tag_id') tagId!: string;
  @field('created_at') createdAt!: number;

  @relation('books', 'book_id') book!: Book;
  @relation('book_tags', 'tag_id') tag!: BookTag;
}

export class BookList extends Model {
  static table = 'book_lists';

  @field('title') title!: string;
  @field('description') description!: string | null;
  @field('cover_uri') coverUri!: string | null;
  @field('sort_order') sortOrder!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
}

export class BookListItem extends Model {
  static table = 'book_list_items';

  @field('book_list_id') bookListId!: string;
  @field('book_id') bookId!: string;
  @field('sort_order') sortOrder!: number;
  @field('created_at') createdAt!: number;

  @relation('book_lists', 'book_list_id') bookList!: BookList;
  @relation('books', 'book_id') book!: Book;
}

export class PageTranslation extends Model {
  static table = 'page_translations';

  @field('page_id') pageId!: string;
  @field('language') language!: string;
  @field('content') content!: string;
  @field('format') format!: 'markdown' | 'plain_text';
  @field('provider') provider!: string | null;
  @field('model_name') modelName!: string | null;
  @field('source_hash') sourceHash!: string;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @relation('pages', 'page_id') page!: Page;
}

export class Annotation extends Model {
  static table = 'annotations';

  @field('book_id') bookId!: string;
  @field('page_id') pageId!: string;
  @field('type') type!: 'highlight' | 'underline' | 'comment';
  @field('start_offset') startOffset!: number;
  @field('end_offset') endOffset!: number;
  @field('selected_text') selectedText!: string;
  @field('prefix_text') prefixText!: string | null;
  @field('suffix_text') suffixText!: string | null;
  @field('note_text') noteText!: string | null;
  @field('color') color!: string | null;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @relation('books', 'book_id') book!: Book;
  @relation('pages', 'page_id') page!: Page;
}

export class PageNote extends Model {
  static table = 'page_notes';

  @field('book_id') bookId!: string;
  @field('page_id') pageId!: string | null;
  @field('note_scope') noteScope!: 'page' | 'chapter' | 'book';
  @field('anchor_key') anchorKey!: string | null;
  @field('content') content!: string;
  @field('format') format!: 'markdown' | 'plain_text';
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @relation('books', 'book_id') book!: Book;
  @relation('pages', 'page_id') page!: Page;
}
