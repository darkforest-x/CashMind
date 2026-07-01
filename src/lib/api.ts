import { Capacitor } from '@capacitor/core';

export const APP_ACCESS_TOKEN_STORAGE_KEY = 'cashmind_app_access_token';
export const APP_ACCESS_TOKEN_UPDATED_EVENT = 'cashmind-app-access-token-updated';

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getConfiguredApiBase(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envBase) {
    return stripTrailingSlash(envBase);
  }

  if (typeof window === 'undefined') {
    return '';
  }

  if (Capacitor.isNativePlatform() || window.location.origin === 'null' || window.location.origin.startsWith('file://')) {
    return '';
  }

  return stripTrailingSlash(window.location.origin);
}

export const getApiBaseUrl = () => getConfiguredApiBase();

export function getApiUrl(path: string): string | null {
  const apiBase = getConfiguredApiBase();
  if (!apiBase) {
    return null;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBase}${normalizedPath}`;
}

export function hasApiBackend(): boolean {
  return Boolean(getConfiguredApiBase());
}

function getAppAccessToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return localStorage.getItem(APP_ACCESS_TOKEN_STORAGE_KEY)?.trim() || '';
}

function withAppAuthorization(init?: RequestInit): RequestInit {
  const token = getAppAccessToken();
  if (!token) {
    return init || {};
  }

  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return { ...init, headers };
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(path);
  if (!url) {
    throw new Error('API base URL not configured for native runtime');
  }
  return fetch(url, withAppAuthorization(init));
}
