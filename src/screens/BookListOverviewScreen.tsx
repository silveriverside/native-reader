import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { createBookList, deleteBookList, getBookListSummaries, setBookListSortOrder, updateBookList, type BookListSummary } from '@/services/bookListService';

export default function BookListOverviewScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [lists, setLists] = useState<BookListSummary[]>([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => setLists(await getBookListSummaries()), []);

  useFocusEffect(useCallback(() => {
    let mounted = true;
    setLoading(true);
    load().catch((error) => Alert.alert('加载书单失败', error instanceof Error ? error.message : '未知错误')).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [load]));

  const createList = useCallback(async () => {
    if (saving) return;
    const normalized = title.trim().replace(/\s+/g, ' ');
    if (!normalized) return Alert.alert('无法创建书单', '书单名不能为空');
    setSaving(true);
    try {
      await createBookList(normalized);
      setTitle('');
      await load();
    } catch (error) {
      Alert.alert('创建书单失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setSaving(false);
    }
  }, [load, saving, title]);

  const saveEditing = useCallback(async () => {
    if (!editingId || saving) return;
    const normalized = editingTitle.trim().replace(/\s+/g, ' ');
    if (!normalized) return Alert.alert('无法保存书单', '书单名不能为空');
    setSaving(true);
    try {
      await updateBookList(editingId, { title: normalized });
      setEditingId(null);
      setEditingTitle('');
      await load();
    } catch (error) {
      Alert.alert('保存书单失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setSaving(false);
    }
  }, [editingId, editingTitle, load, saving]);

  const confirmDelete = useCallback((list: BookListSummary) => {
    Alert.alert('删除书单？', `删除“${list.title}”只会移除书单和关联关系，不会删除书籍。`, [
      { text: '取消', style: 'cancel' },
      { text: '删除书单', style: 'destructive', onPress: async () => {
        setSaving(true);
        try { await deleteBookList(list.id); await load(); }
        catch (error) { Alert.alert('删除书单失败', error instanceof Error ? error.message : '未知错误'); }
        finally { setSaving(false); }
      } },
    ]);
  }, [load]);

  const moveList = useCallback(async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (saving || nextIndex < 0 || nextIndex >= lists.length) return;
    const current = lists[index];
    const target = lists[nextIndex];
    setSaving(true);
    try {
      await Promise.all([
        setBookListSortOrder(current.id, target.sortOrder),
        setBookListSortOrder(target.id, current.sortOrder),
      ]);
      await load();
    } catch (error) {
      Alert.alert('调整排序失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setSaving(false);
    }
  }, [lists, load, saving]);

  const beginEdit = (item: BookListSummary) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}><Text style={styles.back}>‹ 返回</Text></TouchableOpacity>
        <Text style={styles.navTitle}>书单</Text>
        <View style={styles.navSpacer} />
      </View>
      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View>
          <Text style={styles.header}>书单总览</Text>
          <Text style={styles.desc}>创建书单并调整排序；书单详情和批量添加在下一步接入。</Text>
          <View style={styles.createCard}>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="输入新书单名" placeholderTextColor="#8A8F99" returnKeyType="done" onSubmitEditing={createList} />
            <TouchableOpacity style={styles.primaryButton} disabled={saving} onPress={createList}><Text style={styles.primaryButtonText}>创建</Text></TouchableOpacity>
          </View>
          {loading ? <ActivityIndicator style={styles.loading} color="#007AFF" /> : null}
        </View>}
        renderItem={({ item, index }) => {
          const editing = editingId === item.id;
          return <View style={styles.listRow}>
            {editing ? <TextInput style={styles.editInput} value={editingTitle} onChangeText={setEditingTitle} autoFocus returnKeyType="done" onSubmitEditing={saveEditing} /> : <TouchableOpacity style={styles.listInfo} activeOpacity={0.85} onPress={() => navigation.navigate('BookListDetail', { bookListId: item.id })}><Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.listMeta}>{item.bookCount} 本书 · 点击查看详情</Text></TouchableOpacity>}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.smallButton} disabled={saving || index === 0} onPress={() => void moveList(index, -1)}><Text style={styles.smallButtonText}>上移</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} disabled={saving || index === lists.length - 1} onPress={() => void moveList(index, 1)}><Text style={styles.smallButtonText}>下移</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallButton} disabled={saving} onPress={editing ? saveEditing : () => beginEdit(item)}><Text style={styles.smallButtonText}>{editing ? '保存' : '重命名'}</Text></TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} disabled={saving} onPress={() => confirmDelete(item)}><Text style={styles.dangerButtonText}>删除</Text></TouchableOpacity>
            </View>
          </View>;
        }}
        ListEmptyComponent={loading ? null : <View style={styles.empty}><Text style={styles.emptyTitle}>还没有书单</Text><Text style={styles.emptyDesc}>创建一个书单，把不同主题的书放在一起。</Text></View>}
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
  createCard: { flexDirection: 'row', alignItems: 'center', marginTop: 18, marginBottom: 18, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  input: { flex: 1, minHeight: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F5F7FA', color: '#1A1A1A', fontSize: 14 },
  primaryButton: { marginLeft: 10, minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#007AFF' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  loading: { marginBottom: 16 },
  listRow: { padding: 14, marginBottom: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  listInfo: { marginBottom: 10 },
  listTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  listMeta: { marginTop: 4, fontSize: 13, color: '#5A6068' },
  editInput: { minHeight: 40, marginBottom: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F5F7FA', color: '#1A1A1A', fontSize: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  smallButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#EAF3FF', marginRight: 8, marginTop: 6 },
  smallButtonText: { fontSize: 12, fontWeight: '700', color: '#0066CC' },
  dangerButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#FFF0F0', marginTop: 6 },
  dangerButtonText: { fontSize: 12, fontWeight: '700', color: '#C62828' },
  empty: { alignItems: 'center', paddingTop: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#5A6068', textAlign: 'center' },
});
