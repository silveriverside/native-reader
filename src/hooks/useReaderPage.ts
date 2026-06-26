import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { database } from '@/database';
import Page from '@/database/models/Page';
import { getByPage, addVocabulary } from '@/services/vocabularyService';
import { translatePageWithCache } from '@/services/pageTranslationService';
import { getActiveAIProvider } from '@/api/core/providerFactory';
import type { ReaderMode, VocabularyItem } from '@/types';
import type {
  MarkdownSelection,
  VocabularyHighlight,
  VocabularyTap,
} from '@/native/markdownSelection/types';
import { extractSentenceByRange } from '@/utils/textUtils';
import { useReaderAnnotations } from '@/hooks/useReaderAnnotations';
import {
  READER_THEME_ORDER,
  DEFAULT_READER_THEME,
  type ReaderThemeKey,
} from '@/theme/readerTheme';
import { getReaderTheme, setReaderTheme } from '@/services/readerPreferenceService';
import { shouldAcceptMarkdownSelection } from '@/hooks/readerSelectionSuppression';

const PAGE_TRANSLATION_LANGUAGE = 'zh';

export interface VocabularyBubble {
  text: string;
  translation: string;
}

/** 阅读页全部状态与交互逻辑，便于 ReaderScreen 只负责渲染 */
export function useReaderPage(pageId: string) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [page, setPage] = useState<Page | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] =
    useState<{ start: number; end: number } | null>(null);
  const [translated, setTranslated] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [themeKey, setThemeKey] = useState<ReaderThemeKey>(DEFAULT_READER_THEME);
  const [readerMode, setReaderMode] = useState<ReaderMode>('original');
  const [pageTranslation, setPageTranslation] = useState('');
  const [isPageTranslating, setIsPageTranslating] = useState(false);
  const [tapBubble, setTapBubble] = useState<VocabularyBubble | null>(null);
  const selectionClearedAtRef = useRef(0);

  const annotationApi = useReaderAnnotations(
    page ? { id: page.id, bookId: page.bookId, markdownContent: page.markdownContent } : null,
    selectionRange
  );

  useEffect(() => {
    getReaderTheme().then(setThemeKey).catch(() => {});
  }, []);

  useEffect(() => {
    const pagesCollection = database.get<Page>('pages');
    pagesCollection.find(pageId).then(setPage).catch(() => {
      Alert.alert('错误', '页面不存在');
      navigation.goBack();
    });
    getByPage(pageId).then(setVocabulary);
  }, [pageId, navigation]);

  const highlights = useMemo<VocabularyHighlight[]>(
    () =>
      vocabulary.map((item) => ({
        text: item.content,
        status: item.status,
      })),
    [vocabulary]
  );

  const cycleTheme = useCallback(() => {
    setThemeKey((current) => {
      const currentIndex = READER_THEME_ORDER.indexOf(current);
      const nextKey = READER_THEME_ORDER[(currentIndex + 1) % READER_THEME_ORDER.length];
      setReaderTheme(nextKey).catch(() => {});
      return nextKey;
    });
  }, []);

  const translateText = async (text: string): Promise<string> => {
    const provider = await getActiveAIProvider();
    return provider.translate(text, 'en', 'zh');
  };

  const ensurePageTranslation = async (): Promise<string> => {
    if (pageTranslation.trim()) return pageTranslation;
    setIsPageTranslating(true);
    try {
      const result = await translatePageWithCache(pageId, PAGE_TRANSLATION_LANGUAGE);
      setPageTranslation(result.content);
      return result.content;
    } finally {
      setIsPageTranslating(false);
    }
  };

  const requestReaderMode = async (mode: ReaderMode) => {
    if (mode === 'original') {
      setReaderMode(mode);
      return;
    }
    try {
      await ensurePageTranslation();
      setReaderMode(mode);
    } catch (error) {
      Alert.alert('加载译文失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleTranslateSelection = async (text = selectedText) => {
    const textToTranslate = text.trim();
    if (!textToTranslate) return;
    setIsTranslating(true);
    try {
      const result = await translateText(textToTranslate);
      setTranslated(result);
    } catch (error) {
      Alert.alert('翻译失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsTranslating(false);
    }
  };

  const addToVocabulary = async (
    text = selectedText,
    explicitRange?: { start: number; end: number }
  ) => {
    const textToAdd = text.trim();
    const activeRange = explicitRange ?? selectionRange;
    if (!textToAdd || !page || !activeRange) return;

    setIsTranslating(true);
    try {
      const translation = translated.trim() || (await translateText(textToAdd));
      const contextSentence = extractSentenceByRange(
        page.markdownContent,
        activeRange.start,
        activeRange.end
      );

      if (!contextSentence) {
        throw new Error('未能定位选中内容对应的原句，这是需要继续修复的 bug。');
      }

      await addVocabulary({
        pageId: page.id,
        content: textToAdd,
        type: /\s/.test(textToAdd) ? 'phrase' : 'word',
        status: 'unknown',
        translation,
        contextSentence,
      });
      clearSelection();
      const updated = await getByPage(pageId);
      setVocabulary(updated);
      Alert.alert('已加入学习本');
    } catch (error) {
      Alert.alert('加入失败', error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleMarkdownSelection = (selection: MarkdownSelection) => {
    if (
      !shouldAcceptMarkdownSelection({
        action: selection.action,
        selectionClearedAt: selectionClearedAtRef.current,
        now: Date.now(),
      })
    ) {
      return;
    }
    setSelectedText(selection.selectedText);
    setSelectionRange({ start: selection.start, end: selection.end });
    setTranslated('');
    if (selection.action === 'translate') {
      handleTranslateSelection(selection.selectedText);
    }
    if (selection.action === 'addToVocabulary') {
      addToVocabulary(selection.selectedText, { start: selection.start, end: selection.end });
    }
  };

  // 单击虚线词条：直接展示已缓存的译文小气泡，不再发起翻译请求
  const handleVocabularyTap = (tap: VocabularyTap) => {
    const matched = vocabulary.find((item) => item.content === tap.text);
    const translation = matched?.translation?.trim();
    setTapBubble({
      text: tap.text,
      translation: translation && translation.length > 0 ? translation : '该词条暂无译文',
    });
  };

  const dismissBubble = () => setTapBubble(null);

  // 选词栏批注操作：落库后清除选区
  const highlightSelection = () => {
    annotationApi.highlightSelection();
    clearSelection();
  };
  const underlineSelection = () => {
    annotationApi.underlineSelection();
    clearSelection();
  };
  const commentSelection = () => {
    annotationApi.startCommentForSelection();
    clearSelection();
  };

  // 单击原文上的批注：打开该批注详情
  const handleAnnotationTap = (tap: { annotationId: string }) => {
    annotationApi.openAnnotation(tap.annotationId);
  };

  const clearSelection = () => {
    selectionClearedAtRef.current = Date.now();
    setSelectedText('');
    setSelectionRange(null);
    setTranslated('');
  };

  return {
    navigation,
    page,
    vocabulary,
    highlights,
    annotations: annotationApi.annotationRanges,
    annotationList: annotationApi.annotations,
    activeAnnotation: annotationApi.activeAnnotation,
    isCommentEditorOpen: annotationApi.isCommentEditorOpen,
    selectedText,
    translated,
    isTranslating,
    themeKey,
    readerMode,
    pageTranslation,
    isPageTranslating,
    tapBubble,
    cycleTheme,
    requestReaderMode,
    handleTranslateSelection,
    addToVocabulary,
    handleMarkdownSelection,
    handleVocabularyTap,
    handleAnnotationTap,
    highlightSelection,
    underlineSelection,
    commentSelection,
    submitComment: annotationApi.submitComment,
    editActiveComment: annotationApi.editActiveComment,
    removeAnnotation: annotationApi.removeAnnotation,
    closeCommentEditor: annotationApi.closeCommentEditor,
    dismissActiveAnnotation: annotationApi.dismissActiveAnnotation,
    dismissBubble,
    clearSelection,
  };
}
