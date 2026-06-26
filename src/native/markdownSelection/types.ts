export type SelectionAction =
  | 'selectionChanged'
  | 'translate'
  | 'addToVocabulary'
  | 'tapVocabulary';

export interface MarkdownSelection {
  selectedText: string;
  start: number;
  end: number;
  paragraphIndex: number;
  source: 'ios' | 'android';
  action: SelectionAction;
}

export interface VocabularyHighlight {
  /** 词条原文文本，原生端在渲染后的纯文本里查找并对所有命中处画虚线 */
  text: string;
  status: 'known' | 'unknown' | 'learning';
}

/** 单击虚线词条时原生回调的事件 payload */
export interface VocabularyTap {
  text: string;
  source: 'ios' | 'android';
}

/**
 * 批注绘制区间，锚点采用「原文 markdown 偏移」。
 * 原生端按 startOffset/endOffset 正查渲染区间后绘制高亮/划线。
 */
export interface AnnotationRange {
  id?: string;
  type: 'highlight' | 'underline' | 'comment';
  startOffset: number;
  endOffset: number;
  color?: string | null;
}

/** 单击原文上的批注时原生回调的事件 payload */
export interface AnnotationTap {
  annotationId: string;
  source: 'ios' | 'android';
}
