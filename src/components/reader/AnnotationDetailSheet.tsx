import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReaderTheme } from '@/theme/readerTheme';
import type { Annotation } from '@/types';

interface AnnotationDetailSheetProps {
  annotation: Annotation | null;
  theme: ReaderTheme;
  onEditComment: () => void;
  onDelete: (annotationId: string) => void;
  onDismiss: () => void;
}

const TYPE_LABEL: Record<Annotation['type'], string> = {
  highlight: '高亮',
  underline: '划线',
  comment: '评论',
};

/** 单击批注后弹出的详情底部面板：查看原文/评论，编辑评论或删除 */
export default function AnnotationDetailSheet({
  annotation,
  theme,
  onEditComment,
  onDelete,
  onDismiss,
}: AnnotationDetailSheetProps) {
  if (!annotation) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDismiss}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
        accessible={false}
        testID="reader-annotation-detail-overlay"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.barBackground,
              borderTopColor: theme.border,
            },
          ]}
          accessible={false}
          testID="reader-annotation-detail-sheet"
        >
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.typeBadge,
                { color: theme.accent, borderColor: theme.accent },
              ]}
            >
              {TYPE_LABEL[annotation.type]}
            </Text>
          </View>
          <Text
            style={[
              styles.quote,
              { color: theme.textColor, borderLeftColor: theme.accent },
            ]}
          >
            {annotation.selectedText}
          </Text>
          {annotation.noteText ? (
            <Text style={[styles.note, { color: theme.secondaryText }]}>
              {annotation.noteText}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onEditComment}
              style={styles.actionBtn}
              accessibilityRole="button"
              testID="reader-annotation-edit-comment"
            >
              <Text style={[styles.actionText, { color: theme.accent }]}>
                {annotation.noteText ? '编辑评论' : '添加评论'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(annotation.id)}
              style={styles.actionBtn}
              accessibilityRole="button"
              testID="reader-annotation-delete"
            >
              <Text style={[styles.deleteText, { color: '#FF3B30' }]}>
                删除
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.actionBtn}
              accessibilityRole="button"
              testID="reader-annotation-close"
            >
              <Text style={[styles.cancelText, { color: theme.secondaryText }]}>
                关闭
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: { flexDirection: 'row', marginBottom: 12 },
  typeBadge: {
    fontSize: 12,
    fontWeight: '700',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  quote: {
    fontSize: 15,
    lineHeight: 22,
    paddingLeft: 12,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  note: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { fontSize: 15, fontWeight: '600' },
  deleteText: { fontSize: 15, fontWeight: '600' },
  cancelText: { fontSize: 15 },
});
