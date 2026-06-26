import { database } from '@/database';
import ApiConfig from '@/database/models/ApiConfig';
import type { ApiConfigInput } from '@/types';

const configsCollection = database.get<ApiConfig>('api_configs');

export async function getActiveConfig(): Promise<ApiConfig | null> {
  const configs = await configsCollection.query().fetch();
  return configs.find((c) => c.isActive) ?? configs[0] ?? null;
}

export async function saveConfig(input: ApiConfigInput): Promise<ApiConfig> {
  const existing = await configsCollection.query().fetch();
  const sameProvider = existing.find((c) => c.provider === input.provider);

  return database.write(async () => {
    if (input.isActive) {
      await Promise.all(
        existing
          .filter((config) => config.provider !== input.provider && config.isActive)
          .map((config) =>
            config.update(() => {
              config.isActive = false;
            })
          )
      );
    }

    if (sameProvider) {
      return sameProvider.update(() => {
        sameProvider.apiKey = input.apiKey;
        sameProvider.apiSecret = input.apiSecret ?? null;
        sameProvider.endpoint = input.endpoint ?? null;
        sameProvider.modelName = input.modelName ?? null;
        sameProvider.isActive = input.isActive;
      });
    }

    return configsCollection.create((config) => {
      config.provider = input.provider;
      config.apiKey = input.apiKey;
      config.apiSecret = input.apiSecret ?? null;
      config.endpoint = input.endpoint ?? null;
      config.modelName = input.modelName ?? null;
      config.isActive = input.isActive;
    });
  });
}

export async function getAllConfigs(): Promise<ApiConfig[]> {
  return configsCollection.query().fetch();
}
