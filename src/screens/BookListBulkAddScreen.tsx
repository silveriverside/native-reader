import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getRecentBooks } from '@/services/bookService';
import { getBookTags, getTagsByBook } from '@/services/bookTagService';
import { addBooksToList, getBookIdsInList, getBookListSummaries } from '@/services/bookListService';
import type { BookSummary } from '@/types';

interface TagItem { id: string; name: string; color: string | null }
interface SelectableBook extends BookSummary { tags: TagItem[] }

export default function BookListBulkAddScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookListBulkAdd'>>();
  const { bookListId } = route.params;
  const [title, setTitle] = useState('');
  const [books, setBooks] = useState<SelectableBook[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filteredBooks = useMemo(() => {
    const text = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesText = !text || book.title.toLowerCase().includes(text);
      const matchesTag = !selectedTagId || book.tags.some((tag) => tag.id === selectedTagId);
      return matchesText && matchesTag;
    });
  }, [books, query, selectedTagId]);

  const load = useCallback(async () => {
    const [summaries, allBooks, existingIds, allTags] = await Promise.all([
      getBookListSummaries(),
      getRecentBooks(true),
      getBookIdsInList(bookListId),
      getBookTags(),
    ]);
    const existing = new Set(existingIds);
    const candidates = allBooks.filter((book) => !existing.has(book.id));
    const tagsByBook = await Promise.all(candidates.map((book) => getTagsByBook(book.id)));
    setTitle(summaries.find((item) => item.id === bookListId)?.title ?? '书单');
    setBooks(candidates.map((book, index) => ({ ...book, tags: tagsByBook[index].map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })) })));
    setTags(allTags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })));
    setSelectedIds(new Set());
  }, [bookListId]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    load().catch((error) => Alert.alert('加载书籍失败', error instanceof Error ? error.message : '未知错误')).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [load]));

  const toggleBook = useCallback((bookId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }, []);

  const addSelectedBooks = useCallback(async () => {
    if (saving || selectedIds.size === 0) return;
    setSaving(true);
    try {
      await addBooksToList(bookListId, Array.from(selectedIds));
      navigation.goBack();
    } catch (error) {
      Alert.alert('添加书籍失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setSaving(false);
    }
  }, [bookListId, navigation, saving, selectedIds]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹ 返回</Text></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>添加到书单</Text>
        <View style={styles.navSpacer} />
      </View>
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View>
          <Text style={styles.header}>{title}</Text>
          <Text style={styles.desc}>选择多本书一次性加入书单，已在书单内的书不会重复显示。</Text>
          <TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="搜索书名" placeholderTextColor="#8A8F99" />
          {tags.length > 0 ? <View style={styles.tagRow}>
            <TouchableOpacity style={[styles.tagPill, selectedTagId == null ? styles.tagPillActive : null]} onPress={() => setSelectedTagId(null)}><Text style={[styles.tagText, selectedTagId == null ? styles.tagTextActive : null]}>全部标签</Text></TouchableOpacity>
            {tags.map((tag) => <TouchableOpacity key={tag.id} style={[styles.tagPill, selectedTagId === tag.id ? styles.tagPillActive : null]} onPress={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}><View style={[styles.tagDot, { backgroundColor: tag.color ?? '#007AFF' }]} /><Text style={[styles.tagText, selectedTagId === tag.id ? styles.tagTextActive : null]}>{tag.name}</Text></TouchableOpacity>)}
          </View> : null}
          <TouchableOpacity style={[styles.addButton, selectedIds.size === 0 || saving ? styles.buttonDisabled : null]} disabled={selectedIds.size === 0 || saving} onPress={addSelectedBooks}><Text style={styles.addButtonText}>添加已选 {selectedIds.size} 本</Text></TouchableOpacity>
          {loading ? <ActivityIndicator style={styles.loading} color="#007AFF" /> : null}
        </View>}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          return <TouchableOpacity style={[styles.bookRow, selected ? styles.bookRowSelected : null]} activeOpacity={0.85} onPress={() => toggleBook(item.id)}>
            {item.coverUri ? <Image source={{ uri: item.coverUri }} style={styles.cover} /> : <View style={styles.coverPlaceholder}><Text style={styles.coverText}>{item.title.trim().charAt(0) || '书'}</Text></View>}
            <View style={styles.bookInfo}><Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.bookMeta}>{item.pageCount} 页 · {item.sourceLang.toUpperCase()} → {item.targetLang.toUpperCase()}</Text></View>
            <Text style={[styles.checkText, selected ? styles.checkTextActive : null]}>{selected ? '已选' : '选择'}</Text>
          </TouchableOpacity>;
        }}
        ListEmptyComponent={loading ? null : <View style={styles.empty}><Text style={styles.emptyTitle}>没有可添加的书</Text><Text style={styles.emptyDesc}>可能所有书已经在书单内，或当前搜索/标签筛选没有命中。</Text></View>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  back: { fontSize: 17, color: '#007AFF', width: 64 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  navSpacer: { width: 64 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { marginTop: 8, fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  desc: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#5A6068' },
  searchInput: { minHeight: 42, marginTop: 16, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFFFFF', color: '#1A1A1A', fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  tagPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFFFFF', marginRight: 8, marginBottom: 8 },
  tagPillActive: { backgroundColor: '#EAF3FF' },
  tagDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  tagText: { fontSize: 12, fontWeight: '600', color: '#5A6068' },
  tagTextActive: { color: '#0066CC' },
  addButton: { alignItems: 'center', justifyContent: 'center', minHeight: 42, marginTop: 10, marginBottom: 16, borderRadius: 12, backgroundColor: '#007AFF' },
  buttonDisabled: { opacity: 0.55 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  loading: { marginBottom: 16 },
  bookRow: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  bookRowSelected: { backgroundColor: '#EAF3FF' },
  cover: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#EEF1F5' },
  coverPlaceholder: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#5B8DEF', alignItems: 'center', justifyContent: 'center' },
  coverText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  bookInfo: { flex: 1, marginLeft: 12 },
  bookTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 5 },
  bookMeta: { fontSize: 12, color: '#5A6068' },
  checkText: { fontSize: 13, fontWeight: '700', color: '#8A8F99' },
  checkTextActive: { color: '#0066CC' },
  empty: { alignItems: 'center', paddingTop: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#5A6068', textAlign: 'center' },
});
