import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getBookListItemsWithBooks, getBookListSummaries, removeBookFromList, setBookListItemOrder, type BookListBookItem, type BookListSummary } from '@/services/bookListService';

export default function BookListDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookListDetail'>>();
  const { bookListId } = route.params;
  const [list, setList] = useState<BookListSummary | null>(null);
  const [items, setItems] = useState<BookListBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [summaries, nextItems] = await Promise.all([
      getBookListSummaries(),
      getBookListItemsWithBooks(bookListId),
    ]);
    setList(summaries.find((item) => item.id === bookListId) ?? null);
    setItems(nextItems);
  }, [bookListId]);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    load().catch((error) => Alert.alert('加载书单失败', error instanceof Error ? error.message : '未知错误')).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [load]));

  const moveItem = useCallback(async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (saving || nextIndex < 0 || nextIndex >= items.length) return;
    const current = items[index];
    const target = items[nextIndex];
    setSaving(true);
    try {
      await Promise.all([
        setBookListItemOrder(current.itemId, target.sortOrder),
        setBookListItemOrder(target.itemId, current.sortOrder),
      ]);
      await load();
    } catch (error) {
      Alert.alert('调整排序失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setSaving(false);
    }
  }, [items, load, saving]);

  const confirmRemove = useCallback((item: BookListBookItem) => {
    Alert.alert('移出书单？', `从“${list?.title ?? '书单'}”移出“${item.book.title}”，不会删除书籍。`, [
      { text: '取消', style: 'cancel' },
      { text: '移出', style: 'destructive', onPress: async () => {
        setSaving(true);
        try {
          await removeBookFromList(bookListId, item.book.id);
          await load();
        } catch (error) {
          Alert.alert('移出书籍失败', error instanceof Error ? error.message : '未知错误');
        } finally {
          setSaving(false);
        }
      } },
    ]);
  }, [bookListId, list?.title, load]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹ 返回</Text></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{list?.title ?? '书单详情'}</Text>
        <View style={styles.navSpacer} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.itemId}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<View>
          <Text style={styles.header}>{list?.title ?? '书单'}</Text>
          <Text style={styles.desc}>{items.length} 本书。可进入书籍详情、移出书单，或调整书单内排序。</Text>
          <TouchableOpacity style={styles.addButton} activeOpacity={0.85} onPress={() => navigation.navigate('BookListBulkAdd', { bookListId })}>
            <Text style={styles.addButtonText}>添加书籍</Text>
          </TouchableOpacity>
          {loading ? <ActivityIndicator style={styles.loading} color="#007AFF" /> : null}
        </View>}
        renderItem={({ item, index }) => (
          <View style={styles.bookRow}>
            <TouchableOpacity style={styles.bookMain} activeOpacity={0.85} onPress={() => navigation.navigate('BookDetail', { bookId: item.book.id })}>
              {item.book.coverUri ? <Image source={{ uri: item.book.coverUri }} style={styles.cover} /> : <View style={styles.coverPlaceholder}><Text style={styles.coverText}>{item.book.title.trim().charAt(0) || '书'}</Text></View>}
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.book.title}</Text>
                <Text style={styles.bookMeta}>{item.book.sourceLang.toUpperCase()} → {item.book.targetLang.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.smallButton} disabled={saving || index === 0} onPress={() => void moveItem(index, -1)}><Text style={styles.smallButtonText}>上移</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} disabled={saving || index === items.length - 1} onPress={() => void moveItem(index, 1)}><Text style={styles.smallButtonText}>下移</Text></TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} disabled={saving} onPress={() => confirmRemove(item)}><Text style={styles.dangerButtonText}>移出</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={loading ? null : <View style={styles.empty}><Text style={styles.emptyTitle}>书单里还没有书</Text><Text style={styles.emptyDesc}>下一步会支持多选书籍一次性添加到书单。</Text></View>}
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
  desc: { marginTop: 8, marginBottom: 18, fontSize: 13, lineHeight: 19, color: '#5A6068' },
  addButton: { alignItems: 'center', justifyContent: 'center', minHeight: 42, marginBottom: 16, borderRadius: 12, backgroundColor: '#007AFF' },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  loading: { marginBottom: 16 },
  bookRow: { padding: 12, marginBottom: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  bookMain: { flexDirection: 'row', alignItems: 'center' },
  cover: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#EEF1F5' },
  coverPlaceholder: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#5B8DEF', alignItems: 'center', justifyContent: 'center' },
  coverText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  bookInfo: { flex: 1, marginLeft: 12 },
  bookTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 5 },
  bookMeta: { fontSize: 12, color: '#5A6068' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#EAF3FF', marginRight: 8 },
  smallButtonText: { fontSize: 12, fontWeight: '700', color: '#0066CC' },
  dangerButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFF0F0' },
  dangerButtonText: { fontSize: 12, fontWeight: '700', color: '#C62828' },
  empty: { alignItems: 'center', paddingTop: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#5A6068', textAlign: 'center' },
});
