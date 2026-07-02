import { useEffect } from 'react';
import { APP_ACCESS_TOKEN_UPDATED_EVENT, getApiUrl } from '../lib/api';
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

function notifyAppAccessChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(APP_ACCESS_TOKEN_UPDATED_EVENT));
}

async function authorizeSetupToken(setupToken: string): Promise<boolean> {
  const url = getApiUrl('/api/app/session');
  if (!url) {
    return false;
  }

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setupToken }),
  });
  return response.ok;
}

export function useSetupAuthorization(onAuthorized?: () => void) {
  const { showToast } = useToast();

  useEffect(() => {
    const setupToken = getSetupTokenFromUrl();
    if (!setupToken) {
      return;
    }

    let isCancelled = false;
    void authorizeSetupToken(setupToken)
      .then((authorized) => {
        if (isCancelled) {
          return;
        }
        clearSetupTokenFromUrl();
        if (!authorized) {
          showToast('设置链接无效或已失效', 'error');
          return;
        }
        notifyAppAccessChanged();
        showToast('浏览器已完成服务端授权', 'success');
        onAuthorized?.();
      })
      .catch(() => {
        if (!isCancelled) {
          clearSetupTokenFromUrl();
          showToast('设置链接授权失败，请检查服务端状态', 'error');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [onAuthorized, showToast]);
}
