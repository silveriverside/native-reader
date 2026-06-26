import { database } from '@/database';
import { Q } from '@nozbe/watermelondb';
import { Annotation as AnnotationModel } from '@/database/models/LibraryModels';
import type { Annotation, AnnotationInput, AnnotationType } from '@/types';

const annotationsCollection = database.get<AnnotationModel>('annotations');

function toAnnotation(model: AnnotationModel): Annotation {
  return {
    id: model.id,
    bookId: model.bookId,
    pageId: model.pageId,
    type: model.type,
    startOffset: model.startOffset,
    endOffset: model.endOffset,
    selectedText: model.selectedText,
    prefixText: model.prefixText,
    suffixText: model.suffixText,
    noteText: model.noteText,
    color: model.color,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

/**
 * 创建批注。锚点统一使用【原文 markdown 偏移】（startOffset/endOffset），
 * 并保存 selectedText 与 prefix/suffix 原文快照，原文变化时可用于兜底重定位。
 */
export async function createAnnotation(input: AnnotationInput): Promise<Annotation> {
  const text = input.selectedText.trim();
  if (!text) {
    throw new Error('批注必须包含选中文本，这是需要修复的异常输入。');
  }
  if (input.endOffset <= input.startOffset) {
    throw new Error('批注区间无效（endOffset 必须大于 startOffset）。');
  }
  const now = Date.now();
  const model = await database.write(async () =>
    annotationsCollection.create((item) => {
      item.bookId = input.bookId;
      item.pageId = input.pageId;
      item.type = input.type;
      item.startOffset = input.startOffset;
      item.endOffset = input.endOffset;
      item.selectedText = input.selectedText;
      item.prefixText = input.prefixText ?? null;
      item.suffixText = input.suffixText ?? null;
      item.noteText = input.noteText ?? null;
      item.color = input.color ?? null;
      item.createdAt = now;
      item.updatedAt = now;
    })
  );
  return toAnnotation(model);
}

export async function getAnnotationsByPage(pageId: string): Promise<Annotation[]> {
  const models = await annotationsCollection
    .query(Q.where('page_id', pageId), Q.sortBy('start_offset', Q.asc))
    .fetch();
  return models.map(toAnnotation);
}

export async function updateAnnotation(
  annotationId: string,
  changes: { type?: AnnotationType; noteText?: string | null; color?: string | null }
): Promise<Annotation> {
  const model = await annotationsCollection.find(annotationId);
  const updated = await database.write(async () =>
    model.update(() => {
      if (changes.type !== undefined) model.type = changes.type;
      if (changes.noteText !== undefined) model.noteText = changes.noteText;
      if (changes.color !== undefined) model.color = changes.color;
      model.updatedAt = Date.now();
    })
  );
  return toAnnotation(updated);
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  const model = await annotationsCollection.find(annotationId);
  await database.write(async () => {
    await model.destroyPermanently();
  });
}
