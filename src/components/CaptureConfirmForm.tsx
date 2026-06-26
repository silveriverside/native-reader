import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BookSummary } from '@/types';

export interface CaptureItem {
  uri: string;
  /** 用户手动输入的页码（字符串，便于受控输入）；空串表示未填，交给 AI 识别。 */
  manualPage: string;
}

export type BookMode = 'existing' | 'new';

interface Props {
  captures: CaptureItem[];
  recentBooks: BookSummary[];
  mode: BookMode;
  selectedBookId: string | null;
  bookTitle: string;
  sourceLang: string;
  targetLang: string;
  isProcessing: boolean;
  onSetMode: (mode: BookMode) => void;
  onSelectBook: (bookId: string) => void;
  onChangeTitle: (title: string) => void;
  onChangeSourceLang: (lang: string) => void;
  onChangeTargetLang: (lang: string) => void;
  onChangePageNumber: (index: number, value: string) => void;
  onRemoveImage: (index: number) => void;
  onContinueShooting: () => void;
  onSubmit: () => void;
}

export default function CaptureConfirmForm({
  captures,
  recentBooks,
  mode,
  selectedBookId,
  bookTitle,
  sourceLang,
  targetLang,
  isProcessing,
  onSetMode,
  onSelectBook,
  onChangeTitle,
  onChangeSourceLang,
  onChangeTargetLang,
  onChangePageNumber,
  onRemoveImage,
  onContinueShooting,
  onSubmit,
}: Props) {
  const hasBooks = recentBooks.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>确认书籍信息</Text>

        {/* 书籍归属：选择已有 / 新建 */}
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentItem, mode === 'existing' && styles.segmentItemActive]}
            onPress={() => onSetMode('existing')}
            disabled={!hasBooks}
          >
            <Text
              style={[
                styles.segmentText,
                mode === 'existing' && styles.segmentTextActive,
                !hasBooks && styles.segmentTextDisabled,
              ]}
            >
              选择已有书籍
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentItem, mode === 'new' && styles.segmentItemActive]}
            onPress={() => onSetMode('new')}
          >
            <Text style={[styles.segmentText, mode === 'new' && styles.segmentTextActive]}>
              新建书籍
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'existing' ? (
          hasBooks ? (
            <View style={styles.bookList}>
              {recentBooks.map((book) => {
                const active = book.id === selectedBookId;
                return (
                  <TouchableOpacity
                    key={book.id}
                    style={[styles.bookItem, active && styles.bookItemActive]}
                    onPress={() => onSelectBook(book.id)}
                  >
                    <View style={styles.bookItemMain}>
                      <Text
                        style={[styles.bookItemTitle, active && styles.bookItemTitleActive]}
                        numberOfLines={1}
                      >
                        {book.title}
                      </Text>
                      <Text style={styles.bookItemMeta}>
                        {book.sourceLang} → {book.targetLang} · {book.pageCount} 页
                      </Text>
                    </View>
                    {active && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyHint}>暂无书籍，请新建。</Text>
          )
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>书名</Text>
            <TextInput
              style={styles.input}
              value={bookTitle}
              onChangeText={onChangeTitle}
              placeholder="输入书名"
              placeholderTextColor="#999"
            />
            <Text style={styles.label}>源语言 (如 en)</Text>
            <TextInput
              style={styles.input}
              value={sourceLang}
              onChangeText={onChangeSourceLang}
              placeholder="en"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
            <Text style={styles.label}>目标语言 (如 zh)</Text>
            <TextInput
              style={styles.input}
              value={targetLang}
              onChangeText={onChangeTargetLang}
              placeholder="zh"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>
        )}

        {/* 已拍图片 + 可选页码 */}
        <Text style={styles.sectionTitle}>已选 {captures.length} 张（页码可不填，留空则自动识别）</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
          {captures.map((item, index) => (
            <View key={`${item.uri}-${index}`} style={styles.thumbWrap}>
              <Image source={{ uri: item.uri }} style={styles.thumb} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemoveImage(index)}>
                <Text style={styles.removeText}>X</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.pageInput}
                value={item.manualPage}
                onChangeText={(v) => onChangePageNumber(index, v)}
                placeholder="页码"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
              />
            </View>
          ))}
        </ScrollView>
      </ScrollView>

      <TouchableOpacity style={styles.secondaryBtn} onPress={onContinueShooting}>
        <Text style={styles.secondaryBtnText}>继续拍照</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isProcessing && { opacity: 0.6 }]}
        onPress={onSubmit}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>开始识别</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', margin: 16 },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F0F2F5',
    borderRadius: 10,
    padding: 4,
  },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 14, color: '#666', fontWeight: '600' },
  segmentTextActive: { color: '#007AFF' },
  segmentTextDisabled: { color: '#C0C4CC' },
  bookList: { marginHorizontal: 16, marginTop: 12 },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bookItemActive: { borderColor: '#007AFF', backgroundColor: '#EAF3FF' },
  bookItemMain: { flex: 1 },
  bookItemTitle: { fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
  bookItemTitleActive: { color: '#007AFF' },
  bookItemMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  checkMark: { color: '#007AFF', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  emptyHint: { color: '#888', fontSize: 14, marginHorizontal: 16, marginTop: 12 },
  form: { paddingHorizontal: 16, marginTop: 4 },
  label: { fontSize: 14, color: '#666', marginBottom: 4, marginTop: 12 },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A1A',
  },
  sectionTitle: { fontSize: 14, color: '#666', marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  thumbRow: { paddingHorizontal: 16 },
  thumbWrap: { marginRight: 12, position: 'relative' },
  thumb: { width: 100, height: 140, borderRadius: 8, backgroundColor: '#eee' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  pageInput: {
    marginTop: 6,
    backgroundColor: '#F5F7FA',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 13,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  button: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
