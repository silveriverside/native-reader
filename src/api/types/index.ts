export interface OCRBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OCRResult {
  text: string;
  blocks: OCRBlock[];
  markdown: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AIProvider {
  readonly name: string;

  ocr(imageBase64: string): Promise<OCRResult>;

  translate(
    text: string,
    sourceLang: string,
    targetLang: string
  ): Promise<string>;

  chatCompletion(
    messages: ChatMessage[],
    options?: LLMOptions
  ): Promise<string>;
}
