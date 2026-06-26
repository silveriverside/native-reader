import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { ReaderMode } from '@/types';
import MathMarkdownView from '@/components/MathMarkdownView';
import VocabularyTapBubble from '@/components/reader/VocabularyTapBubble';
import CommentEditorModal from '@/components/reader/CommentEditorModal';
import AnnotationDetailSheet from '@/components/reader/AnnotationDetailSheet';
import { READER_THEMES } from '@/theme/readerTheme';
import { useReaderPage } from '@/hooks/useReaderPage';

const READER_MODE_OPTIONS: Array<{ key: ReaderMode; label: string }> = [
  { key: 'original', label: '原文' },
  { key: 'translation', label: '译文' },
  { key: 'bilingual', label: '双语' },
];

export default function ReaderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Reader'>>();
  const { pageId } = route.params;
  const reader = useReaderPage(pageId);
  const theme = READER_THEMES[reader.themeKey];

  if (!reader.page) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const { page, navigation } = reader;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.barBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: theme.accent }]}>返回</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>
          {page.pageNumber != null ? `第${page.pageNumber}页` : '阅读'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={reader.cycleTheme} style={styles.themeBtn}>
            <Text style={[styles.back, { color: theme.accent }]}>{theme.label}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('LearningGuide', { pageId })}>
            <Text style={[styles.back, { color: theme.accent }]}>学习指导</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={{ padding: 16 }}
      >
        <View style={styles.modeTabs}>
          {READER_MODE_OPTIONS.map((option) => {
            const active = reader.readerMode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: active ? theme.accent : theme.selectionBarBackground,
                    borderColor: active ? theme.accent : theme.border,
                  },
                ]}
                activeOpacity={0.85}
                disabled={reader.isPageTranslating}
                onPress={() => void reader.requestReaderMode(option.key)}
              >
                <Text style={[styles.modeTabText, { color: active ? '#FFFFFF' : theme.textColor }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {reader.isPageTranslating ? (
          <View style={[styles.translationLoading, { backgroundColor: theme.contentBackground }]}>
            <ActivityIndicator color={theme.accent} />
            <Text style={[styles.translationLoadingText, { color: theme.secondaryText }]}>
              正在生成并缓存当前页译文...
            </Text>
          </View>
        ) : null}
        {reader.readerMode === 'original' ? (
          <MathMarkdownView
            markdown={page.markdownContent}
            style={styles.markdownReader}
            textColor={theme.textColor}
            backgroundColor={theme.contentBackground}
            highlights={reader.highlights}
            annotations={reader.annotations}
            onSelection={reader.handleMarkdownSelection}
            onVocabularyTap={reader.handleVocabularyTap}
            onAnnotationTap={reader.handleAnnotationTap}
          />
        ) : null}
        {reader.readerMode === 'translation' ? (
          <MathMarkdownView
            markdown={reader.pageTranslation}
            style={styles.markdownReader}
            textColor={theme.textColor}
            backgroundColor={theme.contentBackground}
          />
        ) : null}
        {reader.readerMode === 'bilingual' ? (
          <View>
            <Text style={[styles.bilingualTitle, { color: theme.secondaryText }]}>原文</Text>
            <MathMarkdownView
              markdown={page.markdownContent}
              style={styles.markdownReader}
              textColor={theme.textColor}
              backgroundColor={theme.contentBackground}
              highlights={reader.highlights}
              annotations={reader.annotations}
              onSelection={reader.handleMarkdownSelection}
              onVocabularyTap={reader.handleVocabularyTap}
              onAnnotationTap={reader.handleAnnotationTap}
            />
            <Text style={[styles.bilingualTitle, { color: theme.secondaryText }]}>译文</Text>
            <MathMarkdownView
              markdown={reader.pageTranslation}
              style={styles.markdownReader}
              textColor={theme.textColor}
              backgroundColor={theme.contentBackground}
            />
          </View>
        ) : null}
      </ScrollView>

      <VocabularyTapBubble bubble={reader.tapBubble} theme={theme} onDismiss={reader.dismissBubble} />

      {reader.selectedText.length > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: theme.selectionBarBackground, borderTopColor: theme.border }]}>
          <Text style={[styles.selectedText, { color: theme.textColor }]} numberOfLines={1}>
            选中: {reader.selectedText}
          </Text>
          {reader.translated ? (
            <Text style={[styles.translatedText, { color: theme.accent }]}>{reader.translated}</Text>
          ) : (
            <TouchableOpacity onPress={() => reader.handleTranslateSelection()} disabled={reader.isTranslating}>
              <Text style={[styles.actionText, { color: theme.accent }]}>
                {reader.isTranslating ? '翻译中...' : '翻译'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => reader.addToVocabulary()}>
            <Text style={[styles.actionText, { color: theme.accent }]}>加入未掌握</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reader.highlightSelection}>
            <Text style={[styles.actionText, { color: theme.accent }]}>高亮</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reader.underlineSelection}>
            <Text style={[styles.actionText, { color: theme.accent }]}>划线</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reader.commentSelection}>
            <Text style={[styles.actionText, { color: theme.accent }]}>评论</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reader.clearSelection}>
            <Text style={[styles.cancelText, { color: theme.secondaryText }]}>取消</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.bottomBar, { backgroundColor: theme.barBackground, borderTopColor: theme.border }]}>
        <Text style={[styles.vocabCount, { color: theme.secondaryText }]}>本页词汇: {reader.vocabulary.length}</Text>
        <TouchableOpacity
          style={[styles.vocabBtn, { backgroundColor: theme.accent }]}
          onPress={() => navigation.navigate('Vocabulary', { pageId })}
        >
          <Text style={styles.vocabBtnText}>查看词汇</Text>
        </TouchableOpacity>
      </View>

      <AnnotationDetailSheet
        annotation={reader.isCommentEditorOpen ? null : reader.activeAnnotation}
        theme={theme}
        onEditComment={reader.editActiveComment}
        onDelete={reader.removeAnnotation}
        onDismiss={reader.dismissActiveAnnotation}
      />

      <CommentEditorModal
        visible={reader.isCommentEditorOpen}
        theme={theme}
        initialText={reader.activeAnnotation?.noteText ?? undefined}
        quotedText={reader.activeAnnotation?.selectedText}
        onSubmit={reader.submitComment}
        onCancel={reader.closeCommentEditor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  themeBtn: { marginRight: 16 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  scroll: { flex: 1 },
  modeTabs: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  translationLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 12,
  },
  translationLoadingText: {
    marginTop: 8,
    fontSize: 13,
  },
  bilingualTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  markdownReader: {
    minHeight: 640,
  },
  selectionBar: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  selectedText: { fontSize: 14, color: '#333', marginBottom: 8 },
  translatedText: { fontSize: 14, color: '#007AFF', marginBottom: 8 },
  actionText: { color: '#007AFF', fontSize: 15, fontWeight: '600', marginVertical: 4 },
  cancelText: { color: '#999', fontSize: 14, marginTop: 4 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  vocabCount: { fontSize: 14, color: '#666' },
  vocabBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  vocabBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
