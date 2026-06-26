import { getActiveAIProvider } from '@/api/core/providerFactory';
import { database } from '@/database';
import Page from '@/database/models/Page';
import { addVocabulary } from './vocabularyService';
import { getOrCreateProfile, updateStats } from './userProfileService';
import type { LearningGuide, CEFRLevel } from '@/types';

const pagesCollection = database.get<Page>('pages');

export async function generateGuide(pageId: string): Promise<LearningGuide> {
  const page = await pagesCollection.find(pageId);
  const provider = await getActiveAIProvider();
  const profile = await getOrCreateProfile();
  const userLevel = profile.currentLevel as CEFRLevel;

  const systemPrompt = `You are a language learning assistant. Analyze the given text and identify vocabulary, phrases, and idioms that would be challenging for a CEFR ${userLevel} reader.

CEFR means Common European Framework of Reference. Use the user's level to avoid items that are clearly too easy or too advanced for this reading stage.

Respond ONLY in valid JSON with this exact structure:
{
  "difficultWords": [{"word": "...", "translation": "...", "explanation": "...", "context": "..."}],
  "phrases": [{"phrase": "...", "translation": "...", "explanation": "...", "context": "..."}],
  "idioms": [{"idiom": "...", "translation": "...", "explanation": "...", "context": "..."}],
  "previewQuestions": ["..."],
  "summary": "..."
}`;

  const userPrompt = `User CEFR level: ${userLevel}

Please analyze the following text and generate a pre-reading learning guide. Focus on words, phrases, and idioms that may slow down a CEFR ${userLevel} reader who wants to read closer to native speed.

Text:
${page.markdownContent}`;

  const response = await provider.chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { jsonMode: true, temperature: 0.3, maxTokens: 4096 }
  );

  let guide: LearningGuide;
  try {
    const parsed = JSON.parse(response) as LearningGuide;
    guide = {
      difficultWords: parsed.difficultWords ?? [],
      phrases: parsed.phrases ?? [],
      idioms: parsed.idioms ?? [],
      previewQuestions: parsed.previewQuestions ?? [],
      summary: parsed.summary ?? '',
    };
  } catch (error) {
    throw new Error(
      `学习指导 JSON 解析失败，需要修复 Prompt 或模型输出格式。原始错误: ${
        error instanceof Error ? error.message : '未知错误'
      }`
    );
  }

  // Pre-load vocabulary items as 'learning'
  for (const item of guide.difficultWords) {
    await addVocabulary({
      pageId,
      content: item.word,
      type: 'word',
      status: 'learning',
      translation: item.translation,
      contextSentence: item.context,
      explanation: item.explanation,
    });
  }
  for (const item of guide.phrases) {
    await addVocabulary({
      pageId,
      content: item.phrase,
      type: 'phrase',
      status: 'learning',
      translation: item.translation,
      contextSentence: item.context,
      explanation: item.explanation,
    });
  }
  for (const item of guide.idioms) {
    await addVocabulary({
      pageId,
      content: item.idiom,
      type: 'idiom',
      status: 'learning',
      translation: item.translation,
      contextSentence: item.context,
      explanation: item.explanation,
    });
  }

  await updateStats(0, guide.difficultWords.length + guide.phrases.length + guide.idioms.length);

  return guide;
}

export async function analyzeDifficulty(
  text: string,
  userLevel: CEFRLevel
): Promise<string[]> {
  const provider = await getActiveAIProvider();
  const response = await provider.chatCompletion(
    [
      {
        role: 'system',
        content: `You are a language learning expert. Given a text and a user's CEFR level, list the top 20 most difficult words or phrases for that level. Respond with one item per line, no numbering, no explanations.`,
      },
      {
        role: 'user',
        content: `User level: ${userLevel}\n\nText:\n${text}`,
      },
    ],
    { temperature: 0.3, maxTokens: 2048 }
  );

  return response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
