import { database } from '@/database';
import UserProfile from '@/database/models/UserProfile';
import { getOrCreateProfile } from '@/services/userProfileService';
import {
  DEFAULT_READER_THEME,
  READER_THEMES,
  type ReaderThemeKey,
} from '@/theme/readerTheme';

/**
 * 阅读偏好（含阅读页主题）持久化在 user_profiles.preferences_json 中，
 * 走已有的 WatermelonDB 字段，避免额外引入存储依赖。
 */
interface ReaderPreferences {
  readerTheme?: ReaderThemeKey;
}

function isValidThemeKey(value: unknown): value is ReaderThemeKey {
  return typeof value === 'string' && value in READER_THEMES;
}

function parsePreferences(raw: string | null): ReaderPreferences {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ReaderPreferences) : {};
  } catch {
    return {};
  }
}

export async function getReaderTheme(): Promise<ReaderThemeKey> {
  const profile = await getOrCreateProfile();
  const prefs = parsePreferences(profile.preferencesJson);
  return isValidThemeKey(prefs.readerTheme) ? prefs.readerTheme : DEFAULT_READER_THEME;
}

export async function setReaderTheme(theme: ReaderThemeKey): Promise<void> {
  const profile = await getOrCreateProfile();
  const prefs = parsePreferences(profile.preferencesJson);
  const next: ReaderPreferences = { ...prefs, readerTheme: theme };
  await database.write(async () => {
    await profile.update((p: UserProfile) => {
      p.preferencesJson = JSON.stringify(next);
    });
  });
}
