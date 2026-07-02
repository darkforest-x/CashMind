import type express from "express";

export const APP_SESSION_COOKIE_NAME = "cashmind_app_session";

type TokenStatus = {
  configured: boolean;
  hint?: string;
  token?: string;
};

export function isBearerAuthorized(req: express.Request, expectedToken: string | undefined): boolean {
  const authHeader = req.headers.authorization;
  return Boolean(expectedToken && authHeader === `Bearer ${expectedToken}`);
}

function getCookieValue(req: express.Request, name: string): string {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return "";
  }

  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return "";
}

export function isAppSessionAuthorized(req: express.Request, expectedToken: string | undefined): boolean {
  return Boolean(expectedToken && getCookieValue(req, APP_SESSION_COOKIE_NAME) === expectedToken);
}

export function setAppSessionCookie(res: express.Response, token: string, secure: boolean): void {
  res.cookie(APP_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 365,
  });
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
