import type { AIProvider } from '@/api/types';
import { VolcengineProvider } from '@/api/providers/VolcengineProvider';
import { OpenAICompatibleProvider } from '@/api/providers/OpenAICompatibleProvider';
import { AliyunProvider } from '@/api/providers/AliyunProvider';
import { getActiveConfig } from '@/services/apiConfigService';

let cachedProvider: AIProvider | null = null;
let cachedConfigKey = '';

export async function getActiveAIProvider(): Promise<AIProvider> {
  const config = await getActiveConfig();
  if (!config) {
    throw new Error('No active AI provider configured. Please set up in Settings.');
  }

  const configKey = `${config.provider}-${config.apiKey}-${config.endpoint}-${config.modelName}`;
  if (cachedProvider && cachedConfigKey === configKey) {
    return cachedProvider;
  }

  switch (config.provider) {
    case 'volcengine':
      cachedProvider = new VolcengineProvider({
        apiKey: config.apiKey,
        endpoint: config.endpoint ?? 'https://ark.cn-beijing.volces.com/api/v3',
        modelName: config.modelName,
      });
      break;
    case 'openai':
      cachedProvider = new OpenAICompatibleProvider({
        apiKey: config.apiKey,
        endpoint: config.endpoint ?? 'https://api.openai.com/v1',
        modelName: config.modelName ?? 'gpt-4o',
      });
      break;
    case 'aliyun':
      cachedProvider = new AliyunProvider({
        apiKey: config.apiKey,
        endpoint: config.endpoint ?? '',
        modelName: config.modelName,
      });
      break;
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }

  cachedConfigKey = configKey;
  return cachedProvider;
}

export function clearProviderCache(): void {
  cachedProvider = null;
  cachedConfigKey = '';
}
