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
  fn: () => Promise<ToolResult>,
): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof GraphApiError) {
      return errorResult(
        `Graph API error (${err.statusCode}): ${err.message}${err.graphCode ? ` [${err.graphCode}]` : ""}`,
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResult(`Error: ${message}`);
  }
}
