import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import type { Annotation, AnnotationType } from '@/types';
import type { AnnotationRange } from '@/native/markdownSelection/types';
import {
  createAnnotation,
  getAnnotationsByPage,
  updateAnnotation,
  deleteAnnotation,
} from '@/services/annotationService';
import { buildAnchorSnapshot } from '@/utils/textUtils';

const DEFAULT_HIGHLIGHT_COLOR = '#FFEB3B';
const DEFAULT_UNDERLINE_COLOR = '#FF5252';

interface PageRef {
  id: string;
  bookId: string;
  markdownContent: string;
}

/**
 * 阅读页批注（高亮/划线/评论）状态与交互，锚点采用原文偏移 + 原文快照。
 * 从 annotations 表加载，落库后驱动原生绘制。
 */
export function useReaderAnnotations(
  page: PageRef | null,
  selectionRange: { start: number; end: number } | null,
  onAfterMutate?: () => void
) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const annotationsRef = useRef<Annotation[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [isCommentEditorOpen, setIsCommentEditorOpen] = useState(false);

  const pageId = page?.id ?? null;

  const reload = useCallback(async () => {
    if (!pageId) return;
    const list = await getAnnotationsByPage(pageId);
    setAnnotations(list);
  }, [pageId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // 传给原生绘制的精简区间（原文偏移）
  const annotationRanges = useMemo<AnnotationRange[]>(
    () =>
      annotations.map((item) => ({
        id: item.id,
        type: item.type,
        startOffset: item.startOffset,
        endOffset: item.endOffset,
        color: item.color,
      })),
    [annotations]
  );

  const persistAnnotation = useCallback(
    async (type: AnnotationType, options?: { noteText?: string; color?: string }) => {
      if (!page || !selectionRange) return;
      const snapshot = buildAnchorSnapshot(
        page.markdownContent,
        selectionRange.start,
        selectionRange.end
      );
      if (!snapshot.selectedText.trim()) {
        Alert.alert('无法创建批注', '未能获取选中文本，这是需要修复的异常。');
        return;
      }
      try {
        await createAnnotation({
          bookId: page.bookId,
          pageId: page.id,
          type,
          startOffset: selectionRange.start,
          endOffset: selectionRange.end,
          selectedText: snapshot.selectedText,
          prefixText: snapshot.prefixText,
          suffixText: snapshot.suffixText,
          noteText: options?.noteText,
          color:
            options?.color ??
            (type === 'underline' ? DEFAULT_UNDERLINE_COLOR : DEFAULT_HIGHLIGHT_COLOR),
        });
        await reload();
        onAfterMutate?.();
      } catch (error) {
        Alert.alert('创建批注失败', error instanceof Error ? error.message : '未知错误');
      }
    },
    [page, selectionRange, reload, onAfterMutate]
  );

  const highlightSelection = useCallback(() => persistAnnotation('highlight'), [persistAnnotation]);
  const underlineSelection = useCallback(() => persistAnnotation('underline'), [persistAnnotation]);

  // 评论：先记录选区快照，打开评论编辑面板，确认后落库
  const [pendingComment, setPendingComment] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const startCommentForSelection = useCallback(() => {
    if (!selectionRange) return;
    setPendingComment({ ...selectionRange });
    setIsCommentEditorOpen(true);
  }, [selectionRange]);

  const submitComment = useCallback(
    async (noteText: string) => {
      const trimmed = noteText.trim();
      if (!trimmed) {
        Alert.alert('评论为空', '请输入评论内容。');
        return;
      }
      // 编辑已有评论
      if (activeAnnotation) {
        try {
          await updateAnnotation(activeAnnotation.id, { noteText: trimmed });
          await reload();
          setActiveAnnotation(null);
          setIsCommentEditorOpen(false);
        } catch (error) {
          Alert.alert('保存评论失败', error instanceof Error ? error.message : '未知错误');
        }
        return;
      }
      // 新建评论：用 pendingComment 的选区
      if (!page || !pendingComment) return;
      const snapshot = buildAnchorSnapshot(
        page.markdownContent,
        pendingComment.start,
        pendingComment.end
      );
      try {
        await createAnnotation({
          bookId: page.bookId,
          pageId: page.id,
          type: 'comment',
          startOffset: pendingComment.start,
          endOffset: pendingComment.end,
          selectedText: snapshot.selectedText,
          prefixText: snapshot.prefixText,
          suffixText: snapshot.suffixText,
          noteText: trimmed,
          color: DEFAULT_HIGHLIGHT_COLOR,
        });
        await reload();
        setPendingComment(null);
        setIsCommentEditorOpen(false);
        onAfterMutate?.();
      } catch (error) {
        Alert.alert('创建评论失败', error instanceof Error ? error.message : '未知错误');
      }
    },
    [activeAnnotation, page, pendingComment, reload, onAfterMutate]
  );

  const openAnnotation = useCallback((annotationId: string) => {
    const found = annotationsRef.current.find((item) => item.id === annotationId);
    if (found) setActiveAnnotation(found);
  }, []);

  const editActiveComment = useCallback(() => {
    if (activeAnnotation) setIsCommentEditorOpen(true);
  }, [activeAnnotation]);

  const removeAnnotation = useCallback(
    async (annotationId: string) => {
      try {
        await deleteAnnotation(annotationId);
        await reload();
        setActiveAnnotation(null);
      } catch (error) {
        Alert.alert('删除批注失败', error instanceof Error ? error.message : '未知错误');
      }
    },
    [reload]
  );

  const closeCommentEditor = useCallback(() => {
    setIsCommentEditorOpen(false);
    setPendingComment(null);
  }, []);

  const dismissActiveAnnotation = useCallback(() => setActiveAnnotation(null), []);

  return {
    annotations,
    annotationRanges,
    activeAnnotation,
    isCommentEditorOpen,
    reload,
    highlightSelection,
    underlineSelection,
    startCommentForSelection,
    submitComment,
    openAnnotation,
    editActiveComment,
    removeAnnotation,
    closeCommentEditor,
    dismissActiveAnnotation,
  };
}
