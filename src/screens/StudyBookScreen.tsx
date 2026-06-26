import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getStudyBook, updateStatus } from '@/services/vocabularyService';
import type { VocabularyItem, VocabularyStatus } from '@/types';
import VocabularyItemCard from '@/components/VocabularyItemCard';

export default function StudyBookScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [filter, setFilter] = useState<VocabularyStatus | 'all'>('all');
  const [query, setQuery] = useState('');

  const refresh = useCallback(async () => {
    const vocab = await getStudyBook();
    setItems(vocab);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const changeStatus = async (id: string, status: VocabularyStatus) => {
    await updateStatus(id, status);
    refresh();
  };

  const filtered = items
    .filter((i) => (filter === 'all' ? true : i.status === filter))
    .filter((i) => (query ? i.content.toLowerCase().includes(query.toLowerCase()) : true));

  const statusLabel: Record<VocabularyStatus, string> = {
    known: '已掌握',
    learning: '学习中',
    unknown: '未掌握',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>学习本</Text>
        <View style={{ width: 40 }} />
      </View>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="搜索词汇..."
        placeholderTextColor="#999"
      />

      <View style={styles.filterBar}>
        {(['all', 'unknown', 'learning', 'known'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? '全部' : statusLabel[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <VocabularyItemCard item={item} onChangeStatus={changeStatus} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  back: { color: '#007AFF', fontSize: 15 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  search: {
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1A1A1A',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
  },
  filterBtnActive: { backgroundColor: '#007AFF' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
});
