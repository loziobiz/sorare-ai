/**
 * Sorare API Client per Cloudflare Workers
 * 
 * Versione adattata per l'ambiente Worker:
 * - Usa env.SORARE_API_KEY invece di process.env
 * - Usa fetch nativo del runtime Worker
 * - Include retry logic con exponential backoff
 */

export interface SorareWorkerConfig {
  apiKey?: string;
  jwtToken?: string;
  baseUrl?: string;
  jwtAud?: string;
}

export class SorareWorkerClient {
  private apiKey: string | undefined;
  private jwtToken: string | undefined;
  private baseUrl: string;
  private jwtAud: string;

  constructor(config: SorareWorkerConfig = {}) {
    this.apiKey = config.apiKey;
    this.jwtToken = config.jwtToken;
    this.baseUrl = config.baseUrl || "https://api.sorare.com/graphql";
    this.jwtAud = config.jwtAud || "sorare-ai";
  }

  /**
   * Esegue una query GraphQL con retry logic
   */
  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    options: { retries?: number; retryDelay?: number } = {}
  ): Promise<T> {
    const { retries = 3, retryDelay = 1000 } = options;
    
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.executeQuery<T>(query, variables);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Non retry su errori 4xx (client errors)
        if (lastError.message.includes("401") || 
            lastError.message.includes("403") ||
            lastError.message.includes("404")) {
          throw lastError;
        }
        
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          console.log(`Retry ${attempt + 1}/${retries} after ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  private async executeQuery<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "JWT-AUD": this.jwtAud,
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

    const data = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (data.errors) {
      throw new Error(
        `GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!data.data) {
      throw new Error("No data returned from GraphQL");
    }

    return data.data;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Crea un client configurato dall'ambiente Worker
 */
export function createSorareClient(env: {
  SORARE_API_KEY?: string;
}): SorareWorkerClient {
  return new SorareWorkerClient({
    jwtToken: env.SORARE_API_KEY,  // Usa come JWT (Authorization: Bearer)
    jwtAud: "sorare-ai",
  });
}
