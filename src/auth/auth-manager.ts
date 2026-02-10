import type { Config } from "../config.js";
import type { AuthProvider } from "./types.js";
import { ClientCredentialsAuthProvider } from "./client-credentials.js";
import { OnBehalfOfAuthProvider } from "./on-behalf-of.js";

export function createAuthProvider(config: Config, userToken?: string): AuthProvider {
  if (config.authFlow === "on_behalf_of") {
    if (!userToken) {
      throw new Error("OBO auth flow requires a user token");
    }
    return new OnBehalfOfAuthProvider(
      config.azureTenantId,
      config.azureClientId,
      config.azureClientSecret,
      userToken,
    );
  }

  return new ClientCredentialsAuthProvider(
    config.azureTenantId,
    config.azureClientId,
    config.azureClientSecret,
  );
}
