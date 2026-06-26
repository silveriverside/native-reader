import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { DimensionValue } from 'react-native';
import type { BookSummary } from '@/types';
import BookCardPills, { type BookCardList, type BookCardTag } from '@/components/bookshelf/BookCardPills';

export type { BookCardList, BookCardTag } from '@/components/bookshelf/BookCardPills';

interface BookCardProps {
  book: BookSummary;
  tags?: BookCardTag[];
  lists?: BookCardList[];
  onPress: () => void;
}

/** 根据书名生成稳定的占位封面背景色。 */
const PLACEHOLDER_COLORS = ['#5B8DEF', '#34C7A4', '#F2994A', '#9B6BDF', '#EB5757', '#2D9CDB', '#27AE60'];

function colorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) % 1000000007;
  }
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

function BookCard({ book, tags = [], lists = [], onPress }: BookCardProps) {
  const initial = book.title.trim().charAt(0).toUpperCase() || '书';
  const totalPages = book.totalPages ?? null;
  const progressPercent =
    book.progressRatio != null ? Math.round(book.progressRatio * 100) : null;
  const progressWidth: DimensionValue = `${Math.max(0, Math.min(book.progressRatio ?? 0, 1)) * 100}%`;
  const pageText =
    totalPages && totalPages > 0
      ? `${book.pageCount}/${totalPages} 页`
      : `${book.pageCount} 页`;

  return (
    <TouchableOpacity
      style={[styles.card, book.archivedAt ? styles.archivedCard : null]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {book.coverUri ? (
        <Image source={{ uri: book.coverUri }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.placeholder, { backgroundColor: colorForTitle(book.title) }]}>
          <Text style={styles.placeholderText}>{initial}</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          {book.pinnedAt ? (
            <View style={styles.pinBadge}>
              <Text style={styles.pinBadgeText}>置顶</Text>
            </View>
          ) : null}
          {book.archivedAt ? (
            <View style={styles.archiveBadge}>
              <Text style={styles.archiveBadgeText}>已归档</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{pageText}</Text>
          <View style={styles.dot} />
          <Text style={styles.meta}>
            {book.sourceLang.toUpperCase()} → {book.targetLang.toUpperCase()}
          </Text>
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.progressText}>
            {progressPercent != null ? `阅读进度 ${progressPercent}%` : '未录入总页数'}
          </Text>
        </View>
        <BookCardPills tags={tags} lists={lists} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  archivedCard: {
    opacity: 0.78,
  },
  cover: {
    width: 64,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#EEF1F5',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  pinBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EAF3FF',
  },
  pinBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0066CC',
  },
  archiveBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EEF1F5',
  },
  archiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5A6068',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 13,
    color: '#8A8F99',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#C4C9D1',
    marginHorizontal: 8,
  },
  progressBlock: {
    marginTop: 10,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E7EBF0',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#007AFF',
  },
  progressText: {
    marginTop: 5,
    fontSize: 12,
    color: '#5A6068',
  },
});

export default BookCard;
