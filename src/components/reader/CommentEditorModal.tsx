import { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { ReaderTheme } from '@/theme/readerTheme';

interface CommentEditorModalProps {
  visible: boolean;
  theme: ReaderTheme;
  /** 编辑已有评论时的初始内容 */
  initialText?: string;
  /** 被批注的原文（展示在编辑器顶部，帮助定位） */
  quotedText?: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

/** 评论编辑弹层：新建或编辑批注评论 */
export default function CommentEditorModal({
  visible,
  theme,
  initialText,
  quotedText,
  onSubmit,
  onCancel,
}: CommentEditorModalProps) {
  const [text, setText] = useState(initialText ?? '');

  useEffect(() => {
    if (visible) setText(initialText ?? '');
  }, [visible, initialText]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        accessible={false}
          testID="reader-comment-editor-overlay"
      >
        <View
          style={[styles.card, { backgroundColor: theme.barBackground, borderColor: theme.border }]}
          accessible={false}
            testID="reader-comment-editor-card"
        >
          <Text style={[styles.title, { color: theme.textColor }]}>
            {initialText ? '编辑评论' : '添加评论'}
          </Text>
          {quotedText ? (
            <Text style={[styles.quote, { color: theme.secondaryText, borderLeftColor: theme.accent }]} numberOfLines={3}>
              {quotedText}
            </Text>
          ) : null}
          <TextInput
            style={[styles.input, { color: theme.textColor, borderColor: theme.border, backgroundColor: theme.contentBackground }]}
            value={text}
            onChangeText={setText}
            placeholder="写下你的想法..."
            placeholderTextColor={theme.secondaryText}
            multiline
            autoFocus
            accessibilityLabel="评论输入框"
              testID="reader-comment-editor-input"
          />
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.actionBtn}
              accessibilityRole="button"
                testID="reader-comment-editor-cancel"
            >
              <Text style={[styles.cancel, { color: theme.secondaryText }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onSubmit(text)}
              style={styles.actionBtn}
              accessibilityRole="button"
                testID="reader-comment-editor-save"
            >
              <Text style={[styles.submit, { color: theme.accent }]}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  quote: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 10,
    borderLeftWidth: 3,
    marginBottom: 12,
  },
  input: {
    minHeight: 96,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 6 },
  cancel: { fontSize: 15 },
  submit: { fontSize: 15, fontWeight: '700' },
});
