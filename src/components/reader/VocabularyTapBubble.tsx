import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ReaderTheme } from '@/theme/readerTheme';
import type { VocabularyBubble } from '@/hooks/useReaderPage';

interface VocabularyTapBubbleProps {
  bubble: VocabularyBubble | null;
  theme: ReaderTheme;
  onDismiss: () => void;
}

/**
 * 单击虚线词条后弹出的半透明小译文气泡。
 * 直接展示学习本里已缓存的译文，不发起新的翻译请求。
 */
export default function VocabularyTapBubble({
  bubble,
  theme,
  onDismiss,
}: VocabularyTapBubbleProps) {
  if (!bubble) return null;

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={onDismiss}
    >
      <View style={[styles.bubble, { backgroundColor: theme.selectionBarBackground, borderColor: theme.border }]}>
        <Text style={[styles.word, { color: theme.textColor }]} numberOfLines={1}>
          {bubble.text}
        </Text>
        <Text style={[styles.translation, { color: theme.accent }]}>
          {bubble.translation}
        </Text>
        <Text style={[styles.hint, { color: theme.secondaryText }]}>点击任意处关闭</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 14,
    opacity: 0.96,
  },
  word: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  translation: {
    fontSize: 15,
    lineHeight: 21,
  },
  hint: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'right',
  },
});
