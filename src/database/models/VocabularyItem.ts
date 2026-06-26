import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import type Page from './Page';

export default class VocabularyItem extends Model {
  static table = 'vocabulary_items';

  @field('page_id') pageId!: string;
  @field('content') content!: string;
  @field('type') type!: 'word' | 'phrase' | 'idiom';
  @field('status') status!: 'known' | 'unknown' | 'learning';
  @field('translation') translation!: string | null;
  @field('context_sentence') contextSentence!: string | null;
  @field('explanation') explanation!: string | null;
  @field('created_at') createdAt!: number;

  @relation('pages', 'page_id') page!: Page;
}
