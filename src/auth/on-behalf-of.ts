import { ConfidentialClientApplication } from "@azure/msal-node";
import type { AuthProvider } from "./types.js";

const GRAPH_SCOPES = ["https://graph.microsoft.com/.default"];

export class OnBehalfOfAuthProvider implements AuthProvider {
  private cca: ConfidentialClientApplication;
  private userToken: string;

  constructor(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    userToken: string,
  ) {
    this.cca = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
    this.userToken = userToken;
  }

  async getAccessToken(): Promise<string> {
    const result = await this.cca.acquireTokenOnBehalfOf({
      oboAssertion: this.userToken,
      scopes: GRAPH_SCOPES,
    });
    if (!result?.accessToken) {
      throw new Error("Failed to acquire token via OBO flow");
    }
    return result.accessToken;
  }
}
