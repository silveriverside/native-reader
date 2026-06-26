export interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
}

export class AIRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AIRequestError';
  }
}

export async function postJSON<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs = 60000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new AIRequestError(
        `HTTP ${response.status}: ${errorText}`,
        response.status
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof AIRequestError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIRequestError('Request timeout');
    }
    throw new AIRequestError(
      error instanceof Error ? error.message : 'Network error'
    );
  }
}
