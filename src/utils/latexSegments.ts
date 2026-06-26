/**
 * LaTeX 分段工具（pure function）
 *
 * 把一段同时包含 Markdown 正文与 LaTeX 公式的字符串，拆分成有序的段落数组：
 * - text       纯文本段（仍交给 Markdown 渲染）
 * - inline-math 行内公式（$...$）
 * - block-math  块级公式（$$...$$）
 *
 * 每个段都记录其在「原始字符串」中的起始下标 offset，
 * 以便 UI 层把局部选区偏移映射回全局偏移，保持选词/翻译/加入学习本功能。
 *
 * 设计约束：
 * - 未闭合的 $ / $$ 一律按纯文本处理（不丢弃、不报错）。
 * - 反斜杠转义的 \$ 不作为公式分隔符。
 * - 空公式（$$$$ 或 $$ 之间只有空白）按纯文本处理，避免渲染空 MathView。
 */

export type LatexSegment =
  | { type: 'text'; content: string; offset: number }
  | { type: 'inline-math'; latex: string; raw: string; offset: number }
  | { type: 'block-math'; latex: string; raw: string; offset: number };

/** 判断 source[index] 处的 `$` 是否被反斜杠转义。 */
function isEscaped(source: string, index: number): boolean {
  let backslashes = 0;
  let i = index - 1;
  while (i >= 0 && source[i] === '\\') {
    backslashes += 1;
    i -= 1;
  }
  return backslashes % 2 === 1;
}

/** 从 fromIndex 起查找下一个「未转义」的分隔符（'$$' 或 '$'）。 */
function findDelimiter(
  source: string,
  fromIndex: number,
  delimiter: '$' | '$$'
): number {
  let i = fromIndex;
  while (i < source.length) {
    if (source[i] === '$' && !isEscaped(source, i)) {
      const isDouble = source[i + 1] === '$';
      if (delimiter === '$$' && isDouble) return i;
      // 行内分隔符不能是 '$$' 的一部分
      if (delimiter === '$' && !isDouble) return i;
      // 命中的是 '$$'，但我们要找单 '$'：跳过这两个字符
      if (delimiter === '$' && isDouble) {
        i += 2;
        continue;
      }
    }
    i += 1;
  }
  return -1;
}

export function parseLatexSegments(input: string): LatexSegment[] {
  const segments: LatexSegment[] = [];
  if (!input) return segments;

  let textStart = 0;
  let i = 0;

  const flushText = (end: number) => {
    if (end > textStart) {
      segments.push({
        type: 'text',
        content: input.slice(textStart, end),
        offset: textStart,
      });
    }
  };

  while (i < input.length) {
    const ch = input[i];

    if (ch !== '$' || isEscaped(input, i)) {
      i += 1;
      continue;
    }

    const isBlock = input[i + 1] === '$';

    if (isBlock) {
      const close = findDelimiter(input, i + 2, '$$');
      if (close === -1) {
        // 未闭合块级公式 → 剩余全部按文本处理
        break;
      }
      const latex = input.slice(i + 2, close).trim();
      if (latex === '') {
        // 空公式：当作普通文本，继续扫描
        i = close + 2;
        continue;
      }
      flushText(i);
      segments.push({
        type: 'block-math',
        latex,
        raw: input.slice(i, close + 2),
        offset: i,
      });
      i = close + 2;
      textStart = i;
      continue;
    }

    // 行内公式
    const close = findDelimiter(input, i + 1, '$');
    if (close === -1) {
      // 未闭合行内公式 → 剩余全部按文本处理
      break;
    }
    const latex = input.slice(i + 1, close).trim();
    if (latex === '') {
      i = close + 1;
      continue;
    }
    flushText(i);
    segments.push({
      type: 'inline-math',
      latex,
      raw: input.slice(i, close + 1),
      offset: i,
    });
    i = close + 1;
    textStart = i;
  }

  // flush 尾部剩余文本
  flushText(input.length);
  return segments;
}
