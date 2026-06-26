import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import BookCard from '@/components/BookCard';
import BookshelfArchiveFilter from '@/components/bookshelf/BookshelfArchiveFilter';
import BookshelfEmptyState from '@/components/bookshelf/BookshelfEmptyState';
import BookshelfEntryCard from '@/components/bookshelf/BookshelfEntryCard';
import BookshelfFilters from '@/components/bookshelf/BookshelfFilters';
import BookshelfSummary from '@/components/bookshelf/BookshelfSummary';
import { useBookshelfData } from '@/hooks/useBookshelfData';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showArchived, setShowArchived] = useState(false);
  const {
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
  } = useBookshelfData(showArchived);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      load()
        .catch(() => undefined)
        .finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
      return () => {
        mounted = false;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => undefined);
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={displayedBooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <Text style={styles.header}>书架</Text>
            <BookshelfSummary bookCount={books.length} stats={shelfStats} />
            <BookshelfFilters
              tags={availableTags}
              selectedTagId={selectedTagId}
              onSelectTag={setSelectedTagId}
              lists={availableLists}
              selectedListId={selectedListId}
              onSelectList={setSelectedListId}
            />
            <BookshelfArchiveFilter archivedCount={shelfStats.archivedCount} showArchived={showArchived} onToggle={() => setShowArchived((value) => !value)} />

            <BookshelfEntryCard
              icon="★"
              iconBackgroundColor="#FFF3E0"
              iconColor="#F2994A"
              title="学习本"
              description={learningCount > 0 ? `${learningCount} 个词条待复习` : '收集生词与短语'}
              onPress={() => navigation.navigate('StudyBook')}
            />

            <BookshelfEntryCard
              icon="≡"
              iconBackgroundColor="#EAF3FF"
              iconColor="#007AFF"
              title="书单"
              description="创建主题书单，整理多本书"
              onPress={() => navigation.navigate('BookLists')}
            />

            {displayedBooks.length > 0 ? (
              <Text style={styles.sectionTitle}>{showArchived ? '全部书籍' : '最近阅读'}</Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <BookCard
            book={item}
            tags={item.tags}
            lists={item.lists}
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id })}
          />
        )}
        ListEmptyComponent={loading ? null : <BookshelfEmptyState />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 18,
  },
  tagFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  tagFilterPillActive: {
    backgroundColor: '#EAF3FF',
  },
  tagFilterDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  tagFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6068',
  },
  tagFilterTextActive: {
    color: '#0066CC',
  },
  listFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  listFilterPillActive: {
    backgroundColor: '#F7F1E8',
  },
  listFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A6068',
  },
  listFilterTextActive: {
    color: '#7A4A12',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5A6068',
    marginBottom: 14,
  },
});
