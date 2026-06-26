export function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function extractSentenceByRange(
  text: string,
  start: number,
  end: number
): string | null {
  if (!text) {
    return null;
  }

  const safeStart = Math.max(0, Math.min(start, text.length - 1));
  const safeEnd = Math.max(safeStart + 1, Math.min(end, text.length));
  const boundaryPattern = /[.!?。！？\n]/;

  let sentenceStart = safeStart;
  while (sentenceStart > 0 && !boundaryPattern.test(text[sentenceStart - 1])) {
    sentenceStart -= 1;
  }

  let sentenceEnd = safeEnd;
  while (sentenceEnd < text.length && !boundaryPattern.test(text[sentenceEnd])) {
    sentenceEnd += 1;
  }
  if (sentenceEnd < text.length) {
    sentenceEnd += 1;
  }

  const sentence = normalizeInlineText(text.slice(sentenceStart, sentenceEnd));
  return sentence.length > 0 ? sentence : null;
}

/**
 * 为批注锚点构建原文快照：选中文本 + 前后各若干字符的上下文。
 * 当原文变化、偏移漂移时，可用 prefix/suffix + selectedText 重新定位。
 */
export function buildAnchorSnapshot(
  text: string,
  start: number,
  end: number,
  contextLength = 24
): { selectedText: string; prefixText: string; suffixText: string } {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  return {
    selectedText: text.slice(safeStart, safeEnd),
    prefixText: text.slice(Math.max(0, safeStart - contextLength), safeStart),
    suffixText: text.slice(safeEnd, Math.min(text.length, safeEnd + contextLength)),
  };
}
