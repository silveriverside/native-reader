import { database } from '@/database';
import UserProfile from '@/database/models/UserProfile';
import type { CEFRLevel } from '@/types';

const profilesCollection = database.get<UserProfile>('user_profiles');

export async function getOrCreateProfile(): Promise<UserProfile> {
  const profiles = await profilesCollection.query().fetch();
  if (profiles.length > 0) {
    return profiles[0];
  }
  return database.write(async () => {
    return profilesCollection.create((profile) => {
      profile.currentLevel = 'A1';
      profile.targetLevel = 'C1';
      profile.totalKnownWords = 0;
      profile.totalStudiedWords = 0;
      profile.preferencesJson = null;
    });
  });
}

export async function updateLevel(level: CEFRLevel): Promise<UserProfile> {
  const profile = await getOrCreateProfile();
  return database.write(async () => {
    return profile.update(() => {
      profile.currentLevel = level;
    });
  });
}

export async function updateStats(
  knownDelta: number,
  studiedDelta: number
): Promise<UserProfile> {
  const profile = await getOrCreateProfile();
  return database.write(async () => {
    return profile.update(() => {
      profile.totalKnownWords = Math.max(0, profile.totalKnownWords + knownDelta);
      profile.totalStudiedWords = Math.max(0, profile.totalStudiedWords + studiedDelta);
    });
  });
}
