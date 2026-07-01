import type express from "express";

type TokenStatus = {
  configured: boolean;
  hint?: string;
  token?: string;
};

export function isBearerAuthorized(req: express.Request, expectedToken: string | undefined): boolean {
  const authHeader = req.headers.authorization;
  return Boolean(expectedToken && authHeader === `Bearer ${expectedToken}`);
}

export function getTokenHint(token: string): string {
  return token.length > 4 ? token.slice(-4) : "****";
}

export function buildTokenStatus(token: string | undefined, exposeToken: boolean): TokenStatus {
  if (!token) {
    return { configured: false };
  }

  const payload = {
    configured: true,
    hint: getTokenHint(token),
  };
  return exposeToken ? { ...payload, token } : payload;
}
