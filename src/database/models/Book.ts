import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type { Query } from '@nozbe/watermelondb';
import type Page from './Page';

export default class Book extends Model {
  static table = 'books';

  @field('title') title!: string;
  @field('source_lang') sourceLang!: string;
  @field('target_lang') targetLang!: string;
  @field('cover_uri') coverUri!: string | null;
  @field('isbn') isbn!: string | null;
  @field('publisher') publisher!: string | null;
  @field('published_date') publishedDate!: string | null;
  @field('description') description!: string | null;
  @field('total_pages') totalPages!: number | null;
  @field('metadata_json') metadataJson!: string | null;
  @field('pinned_at') pinnedAt!: number | null;
  @field('archived_at') archivedAt!: number | null;
  @field('sort_order') sortOrder!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;

  @relation('pages', 'book_id') pages!: Query<Page>;
}
