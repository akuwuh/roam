/**
 * HTTP Client wrapper with error handling
 * PRD Phase 4 - Network infrastructure
 */

export interface HttpResponse<T> {
  data: T;
  status: number;
  ok: boolean;
}

export interface HttpError {
  message: string;
  status?: number;
}

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
    };
  }

  async get<T>(path: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, undefined, headers);
  }

  async post<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, body, headers);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const url = this.baseUrl ? `${this.baseUrl}${path}` : path;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      return {
        data,
        status: response.status,
        ok: response.ok,
      };
    } catch (error) {
      throw {
        message: error instanceof Error ? error.message : 'Network request failed',
        status: undefined,
      } as HttpError;
    }
  }
}

export const httpClient = new HttpClient();

