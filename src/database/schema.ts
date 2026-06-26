import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const mySchema = appSchema({
  version: 5,
  tables: [
    tableSchema({
      name: 'books',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'source_lang', type: 'string' },
        { name: 'target_lang', type: 'string' },
        { name: 'cover_uri', type: 'string', isOptional: true },
        { name: 'isbn', type: 'string', isOptional: true },
        { name: 'publisher', type: 'string', isOptional: true },
        { name: 'published_date', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'total_pages', type: 'number', isOptional: true },
        { name: 'metadata_json', type: 'string', isOptional: true },
        { name: 'pinned_at', type: 'number', isOptional: true },
        { name: 'archived_at', type: 'number', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'pages',
      columns: [
        { name: 'book_id', type: 'string', isIndexed: true },
        { name: 'page_number', type: 'number', isOptional: true },
        { name: 'markdown_content', type: 'string' },
        { name: 'image_uri', type: 'string' },
        { name: 'ocr_raw_json', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'vocabulary_items',
      columns: [
        { name: 'page_id', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
        { name: 'type', type: 'string' }, // word | phrase | idiom
        { name: 'status', type: 'string' }, // known | unknown | learning
        { name: 'translation', type: 'string', isOptional: true },
        { name: 'context_sentence', type: 'string', isOptional: true },
        { name: 'explanation', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'user_profiles',
      columns: [
        { name: 'current_level', type: 'string' },
        { name: 'target_level', type: 'string' },
        { name: 'total_known_words', type: 'number' },
        { name: 'total_studied_words', type: 'number' },
        { name: 'preferences_json', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'api_configs',
      columns: [
        { name: 'provider', type: 'string' },
        { name: 'api_key', type: 'string' },
        { name: 'api_secret', type: 'string', isOptional: true },
        { name: 'endpoint', type: 'string', isOptional: true },
        { name: 'model_name', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'book_tags',
      columns: [
        { name: 'name', type: 'string', isIndexed: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'book_tag_assignments',
      columns: [
        { name: 'book_id', type: 'string', isIndexed: true },
        { name: 'tag_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'book_lists',
      columns: [
        { name: 'title', type: 'string', isIndexed: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'cover_uri', type: 'string', isOptional: true },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'book_list_items',
      columns: [
        { name: 'book_list_id', type: 'string', isIndexed: true },
        { name: 'book_id', type: 'string', isIndexed: true },
        { name: 'sort_order', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'page_translations',
      columns: [
        { name: 'page_id', type: 'string', isIndexed: true },
        { name: 'language', type: 'string', isIndexed: true },
        { name: 'content', type: 'string' },
        { name: 'format', type: 'string' },
        { name: 'provider', type: 'string', isOptional: true },
        { name: 'model_name', type: 'string', isOptional: true },
        { name: 'source_hash', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'annotations',
      columns: [
        { name: 'book_id', type: 'string', isIndexed: true },
        { name: 'page_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true },
        { name: 'start_offset', type: 'number' },
        { name: 'end_offset', type: 'number' },
        { name: 'selected_text', type: 'string' },
        { name: 'prefix_text', type: 'string', isOptional: true },
        { name: 'suffix_text', type: 'string', isOptional: true },
        { name: 'note_text', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'page_notes',
      columns: [
        { name: 'book_id', type: 'string', isIndexed: true },
        { name: 'page_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'note_scope', type: 'string', isIndexed: true },
        { name: 'anchor_key', type: 'string', isOptional: true },
        { name: 'content', type: 'string' },
        { name: 'format', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
  ],
});
