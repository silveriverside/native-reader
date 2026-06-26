import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { mySchema } from './schema';
import { migrations } from './migrations';
import Book from './models/Book';
import Page from './models/Page';
import VocabularyItem from './models/VocabularyItem';
import UserProfile from './models/UserProfile';
import ApiConfig from './models/ApiConfig';
import {
  Annotation,
  BookList,
  BookListItem,
  BookTag,
  BookTagAssignment,
  PageNote,
  PageTranslation,
} from './models/LibraryModels';

const adapter = new SQLiteAdapter({
  schema: mySchema,
  migrations,
  dbName: 'native_reader',
  jsi: false,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Book,
    Page,
    VocabularyItem,
    UserProfile,
    ApiConfig,
    BookTag,
    BookTagAssignment,
    BookList,
    BookListItem,
    PageTranslation,
    Annotation,
    PageNote,
  ],
});

export type DatabaseType = typeof database;
