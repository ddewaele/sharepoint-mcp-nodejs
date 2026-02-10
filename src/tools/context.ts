import type { GraphClient } from "../graph/client.js";

export interface SessionContext {
  graphClient: GraphClient;
  siteId: string;
}

const sessions = new Map<string, SessionContext>();

export const STDIO_SESSION_KEY = "__stdio__";

export function setSessionContext(sessionId: string, ctx: SessionContext): void {
  sessions.set(sessionId, ctx);
}

export function getSessionContext(sessionId: string): SessionContext {
  const ctx = sessions.get(sessionId);
  if (!ctx) {
    throw new Error(`No session context found for session: ${sessionId}`);
  }
  return ctx;
}

export function deleteSessionContext(sessionId: string): void {
  sessions.delete(sessionId);
}

export function getDefaultContext(): SessionContext {
  return getSessionContext(STDIO_SESSION_KEY);
}
