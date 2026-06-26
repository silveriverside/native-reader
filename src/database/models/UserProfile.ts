import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class UserProfile extends Model {
  static table = 'user_profiles';

  @field('current_level') currentLevel!: string;
  @field('target_level') targetLevel!: string;
  @field('total_known_words') totalKnownWords!: number;
  @field('total_studied_words') totalStudiedWords!: number;
  @field('preferences_json') preferencesJson!: string | null;
}
