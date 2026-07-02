import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_ACCESS_TOKEN_STORAGE_KEY, APP_ACCESS_TOKEN_UPDATED_EVENT, apiFetch } from '../lib/api';

type TokenStatus = 'checking' | 'configured' | 'missing' | 'unavailable';
type SessionStatus = 'checking' | 'authorized' | 'locked' | 'unavailable';

type TokenStatusCopy = {
  readonly configuredText: string;
  readonly missingText: string;
};

type ParsedTokenStatus = {
  readonly configured: boolean;
  readonly hint: string;
  readonly token: string;
};

const SHORTCUT_TOKEN_STORAGE_KEY = 'cashmind_shortcut_token';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function parseTokenStatus(value: unknown): ParsedTokenStatus | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    configured: value.configured === true,
    hint: readString(value, 'hint'),
    token: readString(value, 'token'),
  };
}

function getStoredValue(key: string): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return localStorage.getItem(key)?.trim() || '';
}

function setStoredValue(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, value);
}

function notifyAppAccessChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(APP_ACCESS_TOKEN_UPDATED_EVENT));
}

function buildTokenStatusText(status: TokenStatus, hint: string, copy: TokenStatusCopy): string {
  if (status === 'checking') {
    return '正在检查服务端配置';
  }
  if (status === 'unavailable') {
    return '暂时无法连接服务端';
  }
  if (status === 'missing') {
    return copy.missingText;
  }
  return hint ? `${copy.configuredText}，尾号 ${hint}` : copy.configuredText;
}

function buildSessionStatusText(status: SessionStatus): string {
  if (status === 'checking') {
    return '正在检查浏览器授权';
  }
  if (status === 'authorized') {
    return '已授权，可读取和编辑账单';
  }
  if (status === 'unavailable') {
    return '暂时无法连接服务端';
  }
  return '未授权，新设备打开服务端设置链接即可完成';
}

export function useCashMindTokens() {
  const [appTokenStatus, setAppTokenStatus] = useState<TokenStatus>('checking');
  const [appTokenHint, setAppTokenHint] = useState('');
  const [shortcutTokenStatus, setShortcutTokenStatus] = useState<TokenStatus>('checking');
  const [shortcutTokenHint, setShortcutTokenHint] = useState('');
  const [shortcutToken, setShortcutToken] = useState(() => getStoredValue(SHORTCUT_TOKEN_STORAGE_KEY));
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking');

  const loadAppSession = useCallback(async () => {
    try {
      const response = await apiFetch('/api/app/session');
      const payload = await readJson(response);
      const authorized = response.ok && isRecord(payload) && payload.authorized === true;
      setSessionStatus(authorized ? 'authorized' : 'locked');
    } catch {
      setSessionStatus('unavailable');
    }
  }, []);

  const loadAppTokenStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/api/app/token');
      const parsed = parseTokenStatus(await readJson(response));
      if (!response.ok || !parsed) {
        setAppTokenStatus('missing');
        return;
      }

      setAppTokenHint(parsed.hint);
      setAppTokenStatus(parsed.configured ? 'configured' : 'missing');
      if (parsed.token) {
        setStoredValue(APP_ACCESS_TOKEN_STORAGE_KEY, parsed.token);
        notifyAppAccessChanged();
      }
    } catch {
      setAppTokenStatus('unavailable');
    }
  }, []);

  const loadShortcutTokenStatus = useCallback(async () => {
    try {
      const response = await apiFetch('/api/shortcut/token');
      const parsed = parseTokenStatus(await readJson(response));
      if (!response.ok || !parsed) {
        setShortcutTokenStatus('missing');
        return;
      }

      setShortcutTokenHint(parsed.hint);
      setShortcutTokenStatus(parsed.configured ? 'configured' : 'missing');
      if (parsed.token) {
        setShortcutToken(parsed.token);
        setStoredValue(SHORTCUT_TOKEN_STORAGE_KEY, parsed.token);
      }
    } catch {
      setShortcutTokenStatus('unavailable');
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([
      loadAppSession(),
      loadAppTokenStatus(),
      loadShortcutTokenStatus(),
    ]);
  }, [loadAppSession, loadAppTokenStatus, loadShortcutTokenStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shortcutTokenStatusText = useMemo(() => {
    const configuredText = shortcutToken ? '已自动封装到快捷指令模板' : '服务端已自动生成，授权后自动封装';
    return buildTokenStatusText(shortcutTokenStatus, shortcutTokenHint, {
      configuredText,
      missingText: '服务端启动时会自动生成快捷指令密钥',
    });
  }, [shortcutToken, shortcutTokenHint, shortcutTokenStatus]);

  return {
    appSessionStatusText: buildSessionStatusText(sessionStatus),
    appTokenStatusText: buildTokenStatusText(appTokenStatus, appTokenHint, {
      configuredText: '服务端已自动生成',
      missingText: '服务端启动时会自动生成访问密钥',
    }),
    shortcutToken,
    shortcutTokenStatusText,
    isAppSessionAuthorized: sessionStatus === 'authorized',
    isShortcutTokenReady: Boolean(shortcutToken.trim()),
  };
}
