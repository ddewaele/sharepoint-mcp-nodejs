import { ConfidentialClientApplication } from "@azure/msal-node";
import type { AuthProvider } from "./types.js";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";

export class ClientCredentialsAuthProvider implements AuthProvider {
  private cca: ConfidentialClientApplication;

  constructor(tenantId: string, clientId: string, clientSecret: string) {
    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  async getAccessToken(): Promise<string> {
    const result = await this.cca.acquireTokenByClientCredential({
      scopes: [GRAPH_SCOPE],
    });
    if (!result?.accessToken) {
      throw new Error("Failed to acquire token via client credentials");
    }
    return result.accessToken;
  }
}
