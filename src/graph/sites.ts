import type { GraphClient } from "./client.js";
import type { Site } from "./types.js";

export async function resolveSiteId(
  client: GraphClient,
  hostname: string,
  siteName: string,
): Promise<string> {
  const site = await client.request<Site>(
    `/sites/${hostname}:/sites/${siteName}`,
  );
  return site.id;
}
