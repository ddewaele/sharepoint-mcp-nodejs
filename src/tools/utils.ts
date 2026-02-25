import { GraphApiError } from "../graph/errors.js";

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function toolResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function errorResult(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

export async function handleToolError(
  toolName: string,
  fn: () => Promise<ToolResult>,
): Promise<ToolResult> {
  console.error(`[tool] ${toolName} called`);
  try {
    const result = await fn();
    if (result.isError) {
      console.error(`[tool] ${toolName} returned error: ${result.content[0]?.text}`);
    } else {
      console.error(`[tool] ${toolName} succeeded`);
    }
    return result;
  } catch (err) {
    if (err instanceof GraphApiError) {
      const msg = `Graph API error (${err.statusCode}): ${err.message}${err.graphCode ? ` [${err.graphCode}]` : ""}`;
      console.error(`[tool] ${toolName} failed: ${msg}`);
      return errorResult(msg);
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[tool] ${toolName} failed: ${message}`);
    return errorResult(`Error: ${message}`);
  }
}
