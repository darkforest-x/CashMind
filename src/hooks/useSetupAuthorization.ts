import { useEffect } from 'react';
import { useToast } from '../components/Toast';

const SETUP_QUERY_KEYS = ['setup', 'setupToken', 'cashmind_setup'] as const;

function getSetupTokenFromUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  for (const key of SETUP_QUERY_KEYS) {
    const value = params.get(key)?.trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function clearSetupTokenFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  for (const key of SETUP_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function useSetupAuthorization(onAuthorized?: () => void) {
  const { showToast } = useToast();

  useEffect(() => {
    const setupToken = getSetupTokenFromUrl();
    if (!setupToken) {
      return;
    }

    clearSetupTokenFromUrl();
    showToast('服务端已免配置，已直接进入账本', 'info');
    onAuthorized?.();
  }, [onAuthorized, showToast]);
}
