import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
// 强制使用 SVG fallback 渲染器（MathJax→SVG→react-native-svg）：
// 纯 JS，不依赖旧架构原生组件 RNMathView，因此可在本项目的新架构（Fabric）下
// iOS / Android 两端一致工作。直接走默认入口时 Android 会落到旧架构原生组件，
// 在新架构下会渲染失败，故显式指向 fallback。
import MathView from 'react-native-math-view/src/fallback';
import SelectableMarkdownView from '@/components/SelectableMarkdownView';
import type {
  MarkdownSelection,
  VocabularyHighlight,
  VocabularyTap,
  AnnotationRange,
  AnnotationTap,
} from '@/native/markdownSelection/types';
import { parseLatexSegments } from '@/utils/latexSegments';

interface MathMarkdownViewProps {
  markdown: string;
  style?: StyleProp<ViewStyle>;
  /** 正文文字颜色（主题驱动），同时用于公式颜色 */
  textColor?: string;
  /** 正文背景色（主题驱动） */
  backgroundColor?: string;
  /**
   * 选区回调。start/end 始终是相对于「完整 markdown 原文」的全局字符偏移，
   * 与未分段时保持一致，因此上层的选词/翻译/加入学习本逻辑无需改动。
   */
  onSelection?: (selection: MarkdownSelection) => void;
  /** 学习本词条高亮列表，透传给原生视图画虚线 */
  highlights?: VocabularyHighlight[];
  /** 批注区间（原文偏移），透传给原生视图画高亮/划线 */
  annotations?: AnnotationRange[];
  /** 单击虚线词条时回调 */
  onVocabularyTap?: (tap: VocabularyTap) => void;
  /** 单击批注时回调 */
  onAnnotationTap?: (tap: AnnotationTap) => void;
}

/**
 * 把全局原文偏移的 annotations 裁剪到某个文本段 [segStart, segEnd) 内，
 * 并把偏移转换为相对该段的局部偏移，使每个 SelectableMarkdownView 自洽。
 */
function sliceAnnotationsForSegment(
  annotations: AnnotationRange[] | undefined,
  segStart: number,
  segEnd: number
): AnnotationRange[] | undefined {
  if (!annotations || annotations.length === 0) return annotations;
  const result: AnnotationRange[] = [];
  for (const ann of annotations) {
    const start = Math.max(ann.startOffset, segStart);
    const end = Math.min(ann.endOffset, segEnd);
    if (end <= start) continue;
    result.push({
      ...ann,
      startOffset: start - segStart,
      endOffset: end - segStart,
    });
  }
  return result;
}

/**
 * 同时渲染 Markdown 正文与 LaTeX 公式的阅读视图。
 *
 * - 纯文本段：继续使用原生 SelectableMarkdownView，保留选词/翻译/加入学习本能力。
 * - 公式段（$...$ / $$...$$）：使用 react-native-math-view 渲染，本身不可选中。
 *
 * 关键点：文本段在原文里的起始偏移 segment.offset 会叠加到原生回调的局部
 * 偏移上，从而把选区映射回全局偏移，保证 extractSentenceByRange 等定位正确。
 */
export default function MathMarkdownView({
  markdown,
  style,
  textColor,
  backgroundColor,
  onSelection,
  highlights,
  annotations,
  onVocabularyTap,
  onAnnotationTap,
}: MathMarkdownViewProps) {
  const segments = parseLatexSegments(markdown);

  const hasMath = segments.some((s) => s.type !== 'text');

  // 无公式时直接整段渲染，行为与改造前完全一致
  if (!hasMath) {
    return (
      <SelectableMarkdownView
        markdown={markdown}
        style={style}
        textColor={textColor}
        backgroundColor={backgroundColor}
        highlights={highlights}
        annotations={annotations}
        onSelection={onSelection}
        onVocabularyTap={onVocabularyTap}
        onAnnotationTap={onAnnotationTap}
      />
    );
  }

  return (
    <View style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          const baseOffset = segment.offset;
          const segmentEnd = baseOffset + segment.content.length;
          return (
            <SelectableMarkdownView
              key={`text-${index}`}
              markdown={segment.content}
              style={styles.textSegment}
              textColor={textColor}
              backgroundColor={backgroundColor}
              highlights={highlights}
              annotations={sliceAnnotationsForSegment(annotations, baseOffset, segmentEnd)}
              onVocabularyTap={onVocabularyTap}
              onAnnotationTap={onAnnotationTap}
              onSelection={(selection) =>
                onSelection?.({
                  ...selection,
                  start: selection.start + baseOffset,
                  end: selection.end + baseOffset,
                })
              }
            />
          );
        }

        const isBlock = segment.type === 'block-math';
        return (
          <View
            key={`math-${index}`}
            style={isBlock ? styles.blockMath : styles.inlineMath}
          >
            <MathView
              math={segment.latex}
              resizeMode="contain"
              color={textColor}
              style={isBlock ? styles.blockMathView : styles.inlineMathView}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  textSegment: {
    minHeight: 0,
  },
  inlineMath: {
    alignSelf: 'flex-start',
    marginVertical: 2,
  },
  blockMath: {
    alignItems: 'center',
    marginVertical: 12,
  },
  inlineMathView: {
    minHeight: 0,
  },
  blockMathView: {
    minHeight: 0,
  },
});
