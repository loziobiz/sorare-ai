/**
 * Sorare API Client
 *
 * Lightweight GraphQL client for Sorare API.
 * Designed to work in CLI environments and sandboxes.
 */

export interface SorareConfig {
  apiKey?: string;
  jwtToken?: string;
  baseUrl?: string;
}

export class SorareClient {
  private apiKey: string | undefined;
  private jwtToken: string | undefined;
  private baseUrl: string;

  constructor(config: SorareConfig = {}) {
    this.apiKey = config.apiKey || process.env.SORARE_API_KEY;
    this.jwtToken = config.jwtToken || process.env.SORARE_JWT_TOKEN;
    this.baseUrl =
      config.baseUrl || "https://api.sorare.com/graphql";
  }

  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "JWT-AUD": process.env.JWT_AUD || "sorare-ai",
    };

    if (this.apiKey) {
      headers["API-KEY"] = this.apiKey;
    }

    if (this.jwtToken) {
      headers["Authorization"] = `Bearer ${this.jwtToken}`;
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(
        `GraphQL errors: ${data.errors.map((e: { message: string }) => e.message).join(", ")}`
      );
    }

    return data.data as T;
  }
}
