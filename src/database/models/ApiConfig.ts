import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class ApiConfig extends Model {
  static table = 'api_configs';

  @field('provider') provider!: string;
  @field('api_key') apiKey!: string;
  @field('api_secret') apiSecret!: string | null;
  @field('endpoint') endpoint!: string | null;
  @field('model_name') modelName!: string | null;
  @field('is_active') isActive!: boolean;
}
