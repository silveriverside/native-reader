import { useCallback, useMemo, useState } from 'react';
import { getRecentBooks } from '@/services/bookService';
import { getBookIdsInList, getBookListSummaries } from '@/services/bookListService';
import { getBookTags, getTagsByBook } from '@/services/bookTagService';
import { getStudyBook } from '@/services/vocabularyService';
import type { BookSummary } from '@/types';
import type { BookCardList, BookCardTag } from '@/components/BookCard';

export interface ShelfBook extends BookSummary {
  tags: BookCardTag[];
  lists: BookCardList[];
}

export interface ShelfStats {
  archivedCount: number;
  capturedPages: number;
  pinnedCount: number;
  progressPercent: number | null;
  totalPages: number;
}

export function useBookshelfData(showArchived: boolean) {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [availableTags, setAvailableTags] = useState<BookCardTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [availableLists, setAvailableLists] = useState<BookCardList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [learningCount, setLearningCount] = useState(0);

  const displayedBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesTag = !selectedTagId || book.tags.some((tag) => tag.id === selectedTagId);
      const matchesList = !selectedListId || book.lists.some((list) => list.id === selectedListId);
      return matchesTag && matchesList;
    });
  }, [books, selectedListId, selectedTagId]);

  const shelfStats: ShelfStats = useMemo(() => {
    const capturedPages = displayedBooks.reduce((sum, book) => sum + book.pageCount, 0);
    const totalPages = displayedBooks.reduce((sum, book) => sum + (book.totalPages ?? 0), 0);
    const pinnedCount = displayedBooks.filter((book) => book.pinnedAt != null).length;
    const archivedCount = displayedBooks.filter((book) => book.archivedAt != null).length;
    const progressPercent =
      totalPages > 0 ? Math.round((Math.min(capturedPages, totalPages) / totalPages) * 100) : null;
    return { archivedCount, capturedPages, pinnedCount, progressPercent, totalPages };
  }, [displayedBooks]);

  const load = useCallback(async () => {
    const [recent, vocab, allTags, listSummaries] = await Promise.all([
      getRecentBooks(showArchived),
      getStudyBook(),
      getBookTags(),
      getBookListSummaries(),
    ]);
    const [tagsByBook, bookIdsByList] = await Promise.all([
      Promise.all(recent.map((book) => getTagsByBook(book.id))),
      Promise.all(listSummaries.map((list) => getBookIdsInList(list.id))),
    ]);
    const listsByBookId = new Map<string, BookCardList[]>();
    listSummaries.forEach((list, index) => {
      bookIdsByList[index].forEach((bookId) => {
        const next = listsByBookId.get(bookId) ?? [];
        next.push({ id: list.id, title: list.title });
        listsByBookId.set(bookId, next);
      });
    });
    setBooks(
      recent.map((book, index) => ({
        ...book,
        tags: tagsByBook[index].map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
        lists: listsByBookId.get(book.id) ?? [],
      }))
    );
    setAvailableLists(listSummaries.map((list) => ({ id: list.id, title: list.title })));
    setAvailableTags(allTags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })));
    setLearningCount(vocab.filter((item) => item.status !== 'known').length);
  }, [showArchived]);

  return {
    availableLists,
    availableTags,
    books,
    displayedBooks,
    learningCount,
    load,
    selectedListId,
    selectedTagId,
    setSelectedListId,
    setSelectedTagId,
    shelfStats,
  };
}
