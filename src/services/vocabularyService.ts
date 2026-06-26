import { database } from '@/database';
import { Q } from '@nozbe/watermelondb';
import VocabularyItem from '@/database/models/VocabularyItem';
import type { VocabularyInput, VocabularyStatus } from '@/types';
import { updateLevel, updateStats } from './userProfileService';
import { estimateLevel } from '@/utils/levelUtils';

const vocabularyCollection = database.get<VocabularyItem>('vocabulary_items');

export async function addVocabulary(input: VocabularyInput): Promise<VocabularyItem> {
  return database.write(async () => {
    return vocabularyCollection.create((item) => {
      item.pageId = input.pageId;
      item.content = input.content;
      item.type = input.type;
      item.status = input.status;
      item.translation = input.translation ?? null;
      item.contextSentence = input.contextSentence ?? null;
      item.explanation = input.explanation ?? null;
      item.createdAt = Date.now();
    });
  });
}

export async function updateStatus(
  itemId: string,
  status: VocabularyStatus
): Promise<VocabularyItem> {
  const item = await vocabularyCollection.find(itemId);
  const previousStatus = item.status;
  const updated = await database.write(async () => {
    return item.update(() => {
      item.status = status;
    });
  });

  if (previousStatus !== status) {
    const knownDelta = getKnownWordsDelta(previousStatus, status);
    if (knownDelta !== 0) {
      const profile = await updateStats(knownDelta, 0);
      const estimatedLevel = estimateLevel(profile.totalKnownWords, profile.totalStudiedWords);
      await updateLevel(estimatedLevel);
    }
  }

  return updated;
}

export async function getByPage(pageId: string): Promise<VocabularyItem[]> {
  return vocabularyCollection
    .query(Q.where('page_id', pageId), Q.sortBy('created_at', Q.desc))
    .fetch();
}

export async function getStudyBook(): Promise<VocabularyItem[]> {
  return vocabularyCollection.query(Q.sortBy('created_at', Q.desc)).fetch();
}

export async function deleteVocabulary(itemId: string): Promise<void> {
  const item = await vocabularyCollection.find(itemId);
  await database.write(async () => {
    await item.destroyPermanently();
  });
}

export function getKnownWordsDelta(previous: VocabularyStatus, next: VocabularyStatus): number {
  if (previous !== 'known' && next === 'known') {
    return 1;
  }
  if (previous === 'known' && next !== 'known') {
    return -1;
  }
  return 0;
}
