import type { AIProvider, OCRResult, ChatMessage, LLMOptions } from '@/api/types';
import { postJSON } from '@/api/core/httpClient';

interface VolcengineConfig {
  apiKey: string;
  endpoint: string;
  modelName?: string | null;
}

/**
 * OCR 结构化结果：在普通 OCRResult 之外，额外携带 AI 识别出的页码。
 * 仅在 provider 内部定义并 export，避免改动已定稿的 @/api/types。
 * pageNumber 为 null 表示「书页上未出现可识别的页码」，严禁伪造。
 */
export interface OCRStructuredResult {
  markdown: string;
  pageNumber: number | null;
}

/** OCR 时要求模型返回的 JSON 结构。 */
interface OCRJsonPayload {
  markdown?: unknown;
  pageNumber?: unknown;
}

export class VolcengineProvider implements AIProvider {
  readonly name = 'volcengine';

  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly defaultModel: string;
  private readonly visionModel: string;

  constructor(config: VolcengineConfig) {
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.defaultModel = config.modelName ?? 'doubao-1.5-pro-32k';
    this.visionModel = config.modelName ?? 'doubao-1.5-vision-pro-32k';
  }

  async ocr(imageBase64: string): Promise<OCRResult> {
    const { markdown } = await this.ocrStructured(imageBase64);
    return {
      text: markdown,
      blocks: [], // Vision model doesn't return coordinates; we keep blocks empty
      markdown,
    };
  }

  /**
   * 结构化 OCR：返回 Markdown 正文（公式为 LaTeX）以及 AI 识别出的页码。
   * 识别不到页码时 pageNumber 为 null。OCR 失败会抛错，绝不返回假数据。
   */
  async ocrStructured(imageBase64: string): Promise<OCRStructuredResult> {
    const url = `${this.endpoint}/chat/completions`;
    const body = {
      model: this.visionModel,
      messages: [
        {
          role: 'system',
          content:
            '你是一个专业的 OCR 助手。请从图片中提取所有文字，保持原始排版和段落结构。' +
            '正文输出 Markdown 格式；遇到数学公式、化学式、物理公式等，请转写为标准 LaTeX：' +
            '行内公式用 $...$ 包裹，独立成行的块级公式用 $$...$$ 包裹。' +
            '同时识别书页页眉/页脚处的页码（通常是孤立的阿拉伯数字或罗马数字）。' +
            '只返回一个 JSON 对象，格式为 {"markdown": string, "pageNumber": number | null}，' +
            '其中 markdown 是提取的正文，pageNumber 是识别到的页码数字；' +
            '如果页面上没有可识别的页码，pageNumber 必须为 null，严禁猜测或编造页码。' +
            '不要输出 JSON 以外的任何解释或 Markdown 代码块围栏。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                '请提取这张图片中的所有文字，保持原始排版，公式转为 LaTeX，' +
                '并识别页码。按系统要求只返回 JSON 对象。',
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
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 4096,
    };

    const response = await postJSON<OpenAIChatResponse>(
      url,
      { Authorization: `Bearer ${this.apiKey}` },
      body,
      120000
    );

    const content = response.choices[0]?.message?.content ?? '';
    return parseOCRContent(content);
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

/** 把页码值规整为合法正整数，无法识别则返回 null（绝不伪造）。 */
function normalizePageNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.trunc(value);
    return n > 0 ? n : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed, 10);
      return n > 0 ? n : null;
    }
  }
  return null;
}

/**
 * 解析模型返回的 OCR JSON。
 * - 优先按 JSON 解析；容忍被 ```json 围栏包裹的情况。
 * - 若无法解析为预期 JSON，则把整段内容当作 Markdown 正文、页码记为 null，
 *   这样仍能拿到正文（OCR 不算失败），但不会伪造页码。
 */
export function parseOCRContent(content: string): OCRStructuredResult {
  const raw = content.trim();
  if (!raw) {
    return { markdown: '', pageNumber: null };
  }

  // 去除可能的 ```json ... ``` 围栏
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1].trim() : raw;

  try {
    const parsed = JSON.parse(jsonText) as OCRJsonPayload;
    if (parsed && typeof parsed === 'object') {
      const markdown =
        typeof parsed.markdown === 'string' ? parsed.markdown : '';
      return {
        markdown,
        pageNumber: normalizePageNumber(parsed.pageNumber),
      };
    }
  } catch {
    // 非 JSON：降级为纯文本正文，页码保持 null
  }

  return { markdown: content, pageNumber: null };
}
