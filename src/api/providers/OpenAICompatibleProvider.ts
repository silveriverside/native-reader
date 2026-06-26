import type { AIProvider, OCRResult, ChatMessage, LLMOptions } from '@/api/types';
import { postJSON } from '@/api/core/httpClient';
import { AIRequestError } from '@/api/core/httpClient';

interface OpenAIConfig {
  apiKey: string;
  endpoint: string;
  modelName?: string | null;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'openai';

  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly defaultModel: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.defaultModel = config.modelName ?? 'gpt-4o';
  }

  async ocr(imageBase64: string): Promise<OCRResult> {
    const url = `${this.endpoint}/chat/completions`;
    const body = {
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content:
            'You are an OCR assistant. Extract all text from the image, preserve original layout and paragraph structure, output in Markdown format. No explanations.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image and output as Markdown.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    const response = await postJSON<OpenAIChatResponse>(
      url,
      { Authorization: `Bearer ${this.apiKey}` },
      body,
      120000
    );

    const text = response.choices[0]?.message?.content ?? '';
    return { text, blocks: [], markdown: text };
  }

  async translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a professional translator. Translate from ${sourceLang} to ${targetLang}. Output only the translated text, no explanations.`,
      },
      { role: 'user', content: text },
    ];
    return this.chatCompletion(messages, { temperature: 0.1, maxTokens: 2048 });
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<string> {
    const url = `${this.endpoint}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.defaultModel,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await postJSON<OpenAIChatResponse>(
      url,
      { Authorization: `Bearer ${this.apiKey}` },
      body,
      120000
    );

    return response.choices[0]?.message?.content ?? '';
  }
}

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
