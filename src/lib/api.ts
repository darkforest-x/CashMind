import { Capacitor } from '@capacitor/core';

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

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = getApiUrl(path);
  if (!url) {
    throw new Error('API base URL not configured for native runtime');
  }
  return fetch(url, init);
}

