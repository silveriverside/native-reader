import {
  schemaMigrations,
  addColumns,
  createTable,
} from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'vocabulary_items',
          columns: [{ name: 'translation', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        addColumns({
          table: 'books',
          columns: [{ name: 'cover_uri', type: 'string', isOptional: true }],
        }),
      ],
    },
    {
      toVersion: 4,
      steps: [
        addColumns({
          table: 'books',
          columns: [
            { name: 'pinned_at', type: 'number', isOptional: true },
            { name: 'archived_at', type: 'number', isOptional: true },
            { name: 'sort_order', type: 'number' },
          ],
        }),
        createTable({
          name: 'book_tags',
          columns: [
            { name: 'name', type: 'string', isIndexed: true },
            { name: 'color', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'book_tag_assignments',
          columns: [
            { name: 'book_id', type: 'string', isIndexed: true },
            { name: 'tag_id', type: 'string', isIndexed: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
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
        createTable({
          name: 'book_list_items',
          columns: [
            { name: 'book_list_id', type: 'string', isIndexed: true },
            { name: 'book_id', type: 'string', isIndexed: true },
            { name: 'sort_order', type: 'number' },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
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
        createTable({
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
        createTable({
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
    },
    {
      toVersion: 5,
      steps: [
        addColumns({
          table: 'books',
          columns: [
            { name: 'isbn', type: 'string', isOptional: true },
            { name: 'publisher', type: 'string', isOptional: true },
            { name: 'published_date', type: 'string', isOptional: true },
            { name: 'description', type: 'string', isOptional: true },
            { name: 'total_pages', type: 'number', isOptional: true },
            { name: 'metadata_json', type: 'string', isOptional: true },
          ],
        }),
      ],
    },
  ],
});
