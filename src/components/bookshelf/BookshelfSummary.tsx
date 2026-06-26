import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ShelfStats } from '@/hooks/useBookshelfData';

interface BookshelfSummaryProps {
  bookCount: number;
  stats: ShelfStats;
}

export default function BookshelfSummary({ bookCount, stats }: BookshelfSummaryProps) {
  return (
    <>
      <View style={styles.summary}>
        <View style={styles.item}>
          <Text style={styles.value}>{bookCount}</Text>
          <Text style={styles.label}>本书</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.value}>{stats.capturedPages}</Text>
          <Text style={styles.label}>已拍页</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Text style={styles.value}>{stats.progressPercent != null ? `${stats.progressPercent}%` : '待录入'}</Text>
          <Text style={styles.label}>整体进度</Text>
        </View>
      </View>
      {stats.pinnedCount > 0 ? (
        <Text style={styles.hint}>{stats.pinnedCount} 本置顶书籍会优先显示</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 3,
  },
  label: {
    fontSize: 12,
    color: '#5A6068',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: '#DDE2E8',
  },
  hint: {
    fontSize: 12,
    color: '#5A6068',
    marginBottom: 14,
  },
});
