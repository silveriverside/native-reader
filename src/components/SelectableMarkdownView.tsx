import {
  NativeSyntheticEvent,
  requireNativeComponent,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import type {
  MarkdownSelection,
  VocabularyHighlight,
  VocabularyTap,
  AnnotationRange,
  AnnotationTap,
} from '@/native/markdownSelection/types';

interface NativeSelectableMarkdownProps {
  markdown: string;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  readerBackgroundColor?: string;
  highlights?: VocabularyHighlight[];
  annotations?: AnnotationRange[];
  onSelection?: (event: NativeSyntheticEvent<MarkdownSelection>) => void;
  onVocabularyTap?: (event: NativeSyntheticEvent<VocabularyTap>) => void;
  onAnnotationTap?: (event: NativeSyntheticEvent<AnnotationTap>) => void;
}

interface SelectableMarkdownViewProps {
  markdown: string;
  style?: StyleProp<ViewStyle>;
  /** 正文文字颜色（主题驱动），透传给原生视图 */
  textColor?: string;
  /** 正文背景色（主题驱动），透传给原生视图 */
  backgroundColor?: string;
  /** 学习本词条高亮列表，原生端据此画虚线下划线 */
  highlights?: VocabularyHighlight[];
  /** 批注区间（原文偏移），原生端据此画高亮/划线 */
  annotations?: AnnotationRange[];
  onSelection?: (selection: MarkdownSelection) => void;
  /** 单击虚线词条时回调 */
  onVocabularyTap?: (tap: VocabularyTap) => void;
  /** 单击批注时回调 */
  onAnnotationTap?: (tap: AnnotationTap) => void;
}

const NativeSelectableMarkdownView =
  requireNativeComponent<NativeSelectableMarkdownProps>('SelectableMarkdownView');

export default function SelectableMarkdownView({
  markdown,
  style,
  textColor,
  backgroundColor,
  highlights,
  annotations,
  onSelection,
  onVocabularyTap,
  onAnnotationTap,
}: SelectableMarkdownViewProps) {
  return (
    <NativeSelectableMarkdownView
      markdown={markdown}
      style={[styles.nativeView, style]}
      textColor={textColor}
      readerBackgroundColor={backgroundColor}
      highlights={highlights}
      annotations={annotations}
      onSelection={(event) => onSelection?.(event.nativeEvent)}
      onVocabularyTap={(event) => onVocabularyTap?.(event.nativeEvent)}
      onAnnotationTap={(event) => onAnnotationTap?.(event.nativeEvent)}
    />
  );
}

const styles = StyleSheet.create({
  nativeView: {
    minHeight: 600,
  },
});
