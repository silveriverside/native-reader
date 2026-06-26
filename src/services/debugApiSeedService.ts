import { clearProviderCache } from '@/api/core/providerFactory';
import { getAllConfigs, saveConfig } from '@/services/apiConfigService';
import type { AIProviderType } from '@/types';

declare const process: {
  env: Record<string, string | undefined>;
};

interface DebugApiSeed {
  provider: AIProviderType;
  apiKey: string;
  endpoint: string;
  modelName: string;
}

function readDebugApiSeed(): DebugApiSeed | null {
  if (process.env.EXPO_PUBLIC_DEBUG_API_SEED_ENABLED !== 'true') {
    return null;
  }

  const provider = process.env.EXPO_PUBLIC_DEBUG_API_PROVIDER;
  const apiKey = process.env.EXPO_PUBLIC_DEBUG_API_KEY;
  const endpoint = process.env.EXPO_PUBLIC_DEBUG_API_ENDPOINT;
  const modelName = process.env.EXPO_PUBLIC_DEBUG_API_MODEL;

  if (provider !== 'volcengine' && provider !== 'aliyun' && provider !== 'openai') {
    return null;
  }

  if (!apiKey || !endpoint || !modelName) {
    return null;
  }

  return {
    provider,
    apiKey,
    endpoint,
    modelName,
  };
}

export async function seedDebugApiConfigIfAvailable(): Promise<void> {
  const seed = readDebugApiSeed();
  if (!seed) {
    return;
  }

  const configs = await getAllConfigs();
  if (configs.some((config) => config.isActive)) {
    return;
  }

  await saveConfig({
    provider: seed.provider,
    apiKey: seed.apiKey,
    endpoint: seed.endpoint,
    modelName: seed.modelName,
    isActive: true,
  });
  clearProviderCache();
}
