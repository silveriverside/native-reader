import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getBookById } from '@/services/bookService';
import {
  addTagToBook,
  createBookTag,
  getBookTags,
  getTagsByBook,
  removeTagFromBook,
  updateBookTagColor,
} from '@/services/bookTagService';
import type { BookTag } from '@/database/models/LibraryModels';

const TAG_COLORS = ['#007AFF', '#34C7A4', '#F2994A', '#9B6BDF', '#EB5757', '#5A6068'];

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

function toTagItem(tag: BookTag): TagItem {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
  };
}

export default function BookTagManagementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookTags'>>();
  const { bookId } = route.params;

  const [bookTitle, setBookTitle] = useState('');
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedCount = selectedTagIds.size;
  const normalizedNewTagName = useMemo(() => newTagName.trim().replace(/\s+/g, ' '), [newTagName]);

  const load = useCallback(async () => {
    const [book, allTags, bookTags] = await Promise.all([
      getBookById(bookId),
      getBookTags(),
      getTagsByBook(bookId),
    ]);
    setBookTitle(book.title);
    setTags(allTags.map(toTagItem));
    setSelectedTagIds(new Set(bookTags.map((tag) => tag.id)));
  }, [bookId]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      load()
        .catch((error) => {
          Alert.alert('加载标签失败', error instanceof Error ? error.message : '未知错误');
        })
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

  const toggleTag = useCallback(
    async (tag: TagItem) => {
      if (saving) return;
      const selected = selectedTagIds.has(tag.id);
      setSaving(true);
      try {
        if (selected) {
          await removeTagFromBook(bookId, tag.id);
          setSelectedTagIds((prev) => {
            const next = new Set(prev);
            next.delete(tag.id);
            return next;
          });
        } else {
          await addTagToBook(bookId, tag.id);
          setSelectedTagIds((prev) => new Set(prev).add(tag.id));
        }
      } catch (error) {
        Alert.alert('更新标签失败', error instanceof Error ? error.message : '未知错误');
      } finally {
        setSaving(false);
      }
    },
    [bookId, saving, selectedTagIds]
  );

  const createAndSelectTag = useCallback(async () => {
    if (saving) return;
    if (!normalizedNewTagName) {
      Alert.alert('无法创建标签', '标签名不能为空');
      return;
    }
    setSaving(true);
    try {
      const tag = await createBookTag(normalizedNewTagName);
      await addTagToBook(bookId, tag.id);
      const item = toTagItem(tag);
      setTags((prev) => {
        const exists = prev.some((existing) => existing.id === item.id);
        return exists
          ? prev
          : [...prev, item].sort((a, b) => a.name.localeCompare(b.name));
      });
      setSelectedTagIds((prev) => new Set(prev).add(tag.id));
      setNewTagName('');
    } catch (error) {
      Alert.alert('创建标签失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setSaving(false);
    }
  }, [bookId, normalizedNewTagName, saving]);

  const updateTagColor = useCallback(
    async (tag: TagItem, color: string) => {
      if (saving || tag.color === color) return;
      setSaving(true);
      try {
        const updated = await updateBookTagColor(tag.id, color);
        setTags((prev) =>
          prev.map((item) => (item.id === updated.id ? { ...item, color: updated.color } : item))
        );
      } catch (error) {
        Alert.alert('更新标签颜色失败', error instanceof Error ? error.message : '未知错误');
      } finally {
        setSaving(false);
      }
    },
    [saving]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          管理标签
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text style={styles.bookTitle} numberOfLines={2}>
              {bookTitle || '书籍'}
            </Text>
            <Text style={styles.summaryText}>
              已选择 {selectedCount} 个标签，点击标签可添加或移除。
            </Text>
            <View style={styles.createCard}>
              <TextInput
                style={styles.input}
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="输入新标签名"
                placeholderTextColor="#8A8F99"
                returnKeyType="done"
                onSubmitEditing={createAndSelectTag}
              />
              <TouchableOpacity
                style={[styles.createButton, saving ? styles.buttonDisabled : null]}
                activeOpacity={0.85}
                disabled={saving}
                onPress={createAndSelectTag}
              >
                <Text style={styles.createButtonText}>创建并添加</Text>
              </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator style={styles.loading} color="#007AFF" /> : null}
          </View>
        }
        renderItem={({ item }) => {
          const selected = selectedTagIds.has(item.id);
          return (
            <View style={[styles.tagCard, selected ? styles.tagCardSelected : null]}>
              <TouchableOpacity
                style={styles.tagRow}
                activeOpacity={0.85}
                disabled={saving}
                onPress={() => void toggleTag(item)}
              >
                <View style={[styles.tagDot, { backgroundColor: item.color ?? '#007AFF' }]} />
                <Text style={[styles.tagName, selected ? styles.tagNameSelected : null]}>
                  {item.name}
                </Text>
                <Text style={[styles.tagState, selected ? styles.tagStateSelected : null]}>
                  {selected ? '已添加' : '添加'}
                </Text>
              </TouchableOpacity>
              <View style={styles.colorRow}>
                {TAG_COLORS.map((color) => {
                  const active = (item.color ?? '#007AFF').toUpperCase() === color.toUpperCase();
                  return (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorButton, active ? styles.colorButtonActive : null]}
                      activeOpacity={0.85}
                      disabled={saving}
                      onPress={() => void updateTagColor(item, color)}
                    >
                      <View style={[styles.colorDot, { backgroundColor: color }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>还没有标签</Text>
              <Text style={styles.emptyDesc}>先创建一个标签，再把它添加到这本书。</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  back: {
    fontSize: 17,
    color: '#007AFF',
    width: 64,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  navSpacer: {
    width: 64,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bookTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  summaryText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#5A6068',
  },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    color: '#1A1A1A',
    fontSize: 14,
  },
  createButton: {
    marginLeft: 10,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loading: {
    marginBottom: 16,
  },
  tagCard: {
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  tagCardSelected: {
    backgroundColor: '#EAF3FF',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  tagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  tagName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tagNameSelected: {
    color: '#005DBA',
  },
  tagState: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8F99',
  },
  tagStateSelected: {
    color: '#0066CC',
  },
  colorRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  colorButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  colorButtonActive: {
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#5A6068',
    textAlign: 'center',
  },
});
