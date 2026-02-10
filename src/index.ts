import { loadConfig } from "./config.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const useHttp = process.argv.includes("--http");

  if (useHttp) {
    const { startHttpTransport } = await import("./transport/http.js");
    await startHttpTransport(config);
  } else {
    const { createServer } = await import("./server.js");
    const server = createServer();
    const { startStdioTransport } = await import("./transport/stdio.js");
    await startStdioTransport(server, config);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
