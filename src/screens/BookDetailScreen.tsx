import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type { DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { getBookById, updateBookCover } from '@/services/bookService';
import { archiveBook, pinBook, restoreBook, unpinBook } from '@/services/bookOrganizationService';
import { getPagesByBook } from '@/services/pageService';
import { persistCover } from '@/utils/coverUtils';
import type Page from '@/database/models/Page';

interface BookMeta {
  id: string;
  title: string;
  sourceLang: string;
  targetLang: string;
  coverUri: string | null;
  isbn: string | null;
  publisher: string | null;
  publishedDate: string | null;
  description: string | null;
  totalPages: number | null;
  pinnedAt: number | null;
  archivedAt: number | null;
}

export default function BookDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookDetail'>>();
  const { bookId } = route.params;

  const [book, setBook] = useState<BookMeta | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingCover, setUpdatingCover] = useState(false);
  const [operationBusy, setOperationBusy] = useState(false);

  const load = useCallback(async () => {
    const [b, ps] = await Promise.all([getBookById(bookId), getPagesByBook(bookId)]);
    setBook({
      id: b.id,
      title: b.title,
      sourceLang: b.sourceLang,
      targetLang: b.targetLang,
      coverUri: b.coverUri,
      isbn: b.isbn,
      publisher: b.publisher,
      publishedDate: b.publishedDate,
      description: b.description,
      totalPages: b.totalPages,
      pinnedAt: b.pinnedAt,
      archivedAt: b.archivedAt,
    });
    setPages(ps);
  }, [bookId]);

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

  const applyCover = useCallback(
    async (sourceUri: string) => {
      setUpdatingCover(true);
      try {
        const persisted = await persistCover(sourceUri, bookId);
        await updateBookCover(bookId, persisted);
        setBook((prev) => (prev ? { ...prev, coverUri: persisted } : prev));
      } catch (error) {
        Alert.alert('更新封面失败', error instanceof Error ? error.message : '未知错误');
      } finally {
        setUpdatingCover(false);
      }
    },
    [bookId]
  );

  const pickCoverFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await applyCover(result.assets[0].uri);
    }
  }, [applyCover]);

  const takeCoverPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('提示', '需要相机权限才能拍摄封面');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await applyCover(result.assets[0].uri);
    }
  }, [applyCover]);

  const onChangeCover = useCallback(() => {
    Alert.alert('设置封面', '选择封面来源', [
      { text: '拍照', onPress: () => void takeCoverPhoto() },
      { text: '从相册选择', onPress: () => void pickCoverFromLibrary() },
      { text: '取消', style: 'cancel' },
    ]);
  }, [takeCoverPhoto, pickCoverFromLibrary]);

  const handleTogglePin = useCallback(async () => {
    if (!book || operationBusy) return;
    setOperationBusy(true);
    try {
      const updated = book.pinnedAt ? await unpinBook(bookId) : await pinBook(bookId);
      setBook((prev) => (prev ? { ...prev, pinnedAt: updated.pinnedAt } : prev));
    } catch (error) {
      Alert.alert('更新置顶状态失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setOperationBusy(false);
    }
  }, [book, bookId, operationBusy]);

  const performArchiveToggle = useCallback(async () => {
    if (!book || operationBusy) return;
    setOperationBusy(true);
    try {
      const updated = book.archivedAt ? await restoreBook(bookId) : await archiveBook(bookId);
      setBook((prev) => (prev ? { ...prev, archivedAt: updated.archivedAt } : prev));
    } catch (error) {
      Alert.alert('更新归档状态失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setOperationBusy(false);
    }
  }, [book, bookId, operationBusy]);

  const handleToggleArchive = useCallback(() => {
    if (!book || operationBusy) return;
    if (book.archivedAt) {
      void performArchiveToggle();
      return;
    }
    Alert.alert('归档这本书？', '归档后默认会从书架隐藏，可在书架选择“显示归档”后恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '归档书籍', style: 'destructive', onPress: () => void performArchiveToggle() },
    ]);
  }, [book, operationBusy, performArchiveToggle]);

  const openTagManagement = useCallback(() => {
    navigation.navigate('BookTags', { bookId });
  }, [bookId, navigation]);

  const renderHeader = () => {
    if (!book) {
      return null;
    }
    const initial = book.title.trim().charAt(0).toUpperCase() || '书';
    const progressRatio =
      book.totalPages && book.totalPages > 0
        ? Math.min(pages.length, book.totalPages) / book.totalPages
        : null;
    const progressPercent = progressRatio != null ? Math.round(progressRatio * 100) : null;
    const progressWidth: DimensionValue = `${Math.max(0, Math.min(progressRatio ?? 0, 1)) * 100}%`;
    const pageCountText =
      book.totalPages && book.totalPages > 0
        ? `已拍 ${pages.length}/${book.totalPages} 页`
        : `已拍 ${pages.length} 页`;

    return (
      <View>
        <View style={styles.headerCard}>
          <TouchableOpacity activeOpacity={0.85} onPress={onChangeCover} style={styles.coverWrap}>
            {book.coverUri ? (
              <Image source={{ uri: book.coverUri }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Text style={styles.coverInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.coverBadge}>
              {updatingCover ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.coverBadgeText}>{book.coverUri ? '更换封面' : '添加封面'}</Text>
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.meta}>
            <View style={styles.titleLine}>
              <Text style={styles.bookTitle} numberOfLines={3}>
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
            <Text style={styles.bookLang}>
              {book.sourceLang.toUpperCase()} → {book.targetLang.toUpperCase()}
            </Text>
            <Text style={styles.bookPageCount}>{pageCountText}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.progressText}>
              {progressPercent != null ? `阅读进度 ${progressPercent}%` : '录入总页数后显示阅读进度'}
            </Text>
          </View>
        </View>

        <View style={styles.manageCard}>
          <Text style={styles.manageTitle}>书籍管理</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, operationBusy ? styles.actionButtonDisabled : null]}
              activeOpacity={0.85}
              disabled={operationBusy}
              onPress={handleTogglePin}
            >
              <Text style={styles.actionButtonText}>
                {book.pinnedAt ? '取消置顶' : '置顶书籍'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryActionButton,
                operationBusy ? styles.actionButtonDisabled : null,
              ]}
              activeOpacity={0.85}
              disabled={operationBusy}
              onPress={handleToggleArchive}
            >
              <Text style={styles.secondaryActionButtonText}>
                {book.archivedAt ? '恢复书籍' : '归档书籍'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.manageHint}>
            {book.archivedAt
              ? '已归档书籍默认从书架隐藏，恢复后会重新进入最近阅读。'
              : '归档不会删除页面、笔记或词汇，只会从默认书架视图隐藏。'}
          </Text>
          <TouchableOpacity
            style={styles.tagManageButton}
            activeOpacity={0.85}
            onPress={openTagManagement}
          >
            <Text style={styles.tagManageButtonText}>管理标签</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metadataCard}>
          <Text style={styles.metadataTitle}>书籍信息</Text>
          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>ISBN</Text>
              <Text style={styles.metadataValue} numberOfLines={1}>
                {book.isbn ?? '未录入'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>出版社</Text>
              <Text style={styles.metadataValue} numberOfLines={1}>
                {book.publisher ?? '未录入'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>出版日期</Text>
              <Text style={styles.metadataValue} numberOfLines={1}>
                {book.publishedDate ?? '未录入'}
              </Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>总页数</Text>
              <Text style={styles.metadataValue} numberOfLines={1}>
                {book.totalPages ? `${book.totalPages} 页` : '未录入'}
              </Text>
            </View>
          </View>
          {book.description ? (
            <Text style={styles.description} numberOfLines={4}>
              {book.description}
            </Text>
          ) : (
            <Text style={styles.descriptionMuted}>暂无简介，下一步可通过 ISBN 补全元信息。</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {book?.title ?? '书籍详情'}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            {pages.length > 0 ? <Text style={styles.sectionTitle}>全部页面</Text> : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.pageRow}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Reader', { pageId: item.id })}
          >
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.pageThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.pageThumb, styles.pageThumbPlaceholder]} />
            )}
            <View style={styles.pageInfo}>
              <Text style={styles.pageTitle}>
                {item.pageNumber != null ? `第 ${item.pageNumber} 页` : `无页码 · 第 ${index + 1} 条`}
              </Text>
              <Text style={styles.pagePreview} numberOfLines={2}>
                {item.markdownContent?.replace(/[#*`>\-\n]/g, ' ').trim() || '（无文本内容）'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#007AFF" />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>这本书还没有页面</Text>
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
  headerCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  coverWrap: {
    alignItems: 'center',
  },
  cover: {
    width: 96,
    height: 132,
    borderRadius: 12,
    backgroundColor: '#EEF1F5',
  },
  coverPlaceholder: {
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInitial: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '700',
  },
  coverBadge: {
    marginTop: 10,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    minWidth: 84,
    alignItems: 'center',
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    flex: 1,
    marginLeft: 18,
    justifyContent: 'center',
  },
  bookTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  bookLang: {
    fontSize: 14,
    color: '#5A6068',
    marginBottom: 4,
  },
  bookPageCount: {
    fontSize: 14,
    color: '#8A8F99',
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E7EBF0',
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#007AFF',
  },
  progressText: {
    marginTop: 6,
    fontSize: 12,
    color: '#5A6068',
  },
  manageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionButton: {
    marginLeft: 10,
    backgroundColor: '#EEF1F5',
  },
  secondaryActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5A6068',
  },
  manageHint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: '#5A6068',
  },
  tagManageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#EAF3FF',
  },
  tagManageButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066CC',
  },
  metadataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metadataItem: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#8A8F99',
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: '#5A6068',
  },
  descriptionMuted: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A8F99',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5A6068',
    marginBottom: 14,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  pageThumb: {
    width: 48,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#EEF1F5',
  },
  pageThumbPlaceholder: {
    backgroundColor: '#E1E5EA',
  },
  pageInfo: {
    flex: 1,
    marginLeft: 14,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  pagePreview: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8A8F99',
  },
  chevron: {
    fontSize: 24,
    color: '#C4C9D1',
    fontWeight: '300',
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    color: '#8A8F99',
  },
});
