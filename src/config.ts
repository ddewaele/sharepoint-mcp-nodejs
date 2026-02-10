import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  azureTenantId: z.string().min(1),
  azureClientId: z.string().min(1),
  azureClientSecret: z.string().min(1),
  sharepointHostname: z.string().min(1),
  sharepointSiteName: z.string().min(1),
  authFlow: z.enum(["client_credentials", "on_behalf_of"]).default("client_credentials"),
  httpPort: z.coerce.number().default(3000),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    azureTenantId: process.env.AZURE_TENANT_ID,
    azureClientId: process.env.AZURE_CLIENT_ID,
    azureClientSecret: process.env.AZURE_CLIENT_SECRET,
    sharepointHostname: process.env.SHAREPOINT_HOSTNAME,
    sharepointSiteName: process.env.SHAREPOINT_SITE_NAME,
    authFlow: process.env.AUTH_FLOW,
    httpPort: process.env.HTTP_PORT,
  });
}
