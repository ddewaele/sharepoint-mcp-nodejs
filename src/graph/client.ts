import type { AuthProvider } from "../auth/types.js";
import { GraphApiError } from "./errors.js";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export class GraphClient {
  constructor(private auth: AuthProvider) {}

  async request<T = unknown>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await this.auth.getAccessToken();
    const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      let graphCode: string | undefined;
      let message = response.statusText;
      try {
        const body = await response.json() as { error?: { code?: string; message?: string } };
        graphCode = body.error?.code;
        message = body.error?.message ?? message;
      } catch {
        // ignore parse errors
      }
      throw new GraphApiError(message, response.status, graphCode);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.arrayBuffer()) as T;
  }

  async requestRaw(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.auth.getAccessToken();
    const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let graphCode: string | undefined;
      let message = response.statusText;
      try {
        const body = await response.json() as { error?: { code?: string; message?: string } };
        graphCode = body.error?.code;
        message = body.error?.message ?? message;
      } catch {
        // ignore
      }
      throw new GraphApiError(message, response.status, graphCode);
    }

    return response;
  }
}
