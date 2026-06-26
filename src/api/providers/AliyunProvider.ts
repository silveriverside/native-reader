import type { AIProvider, OCRResult, ChatMessage, LLMOptions } from '@/api/types';
import { AIRequestError } from '@/api/core/httpClient';

interface AliyunConfig {
  apiKey: string;
  endpoint: string;
  modelName?: string | null;
}

export class AliyunProvider implements AIProvider {
  readonly name = 'aliyun';

  constructor(_config: AliyunConfig) {
    // Skeleton implementation
  }

  async ocr(_imageBase64: string): Promise<OCRResult> {
    throw new AIRequestError('Aliyun OCR is not implemented yet');
  }

  async translate(_text: string, _sourceLang: string, _targetLang: string): Promise<string> {
    throw new AIRequestError('Aliyun translate is not implemented yet');
  }

  async chatCompletion(_messages: ChatMessage[], _options?: LLMOptions): Promise<string> {
    throw new AIRequestError('Aliyun chat completion is not implemented yet');
  }
}
