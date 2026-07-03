import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

type TokenStatus = 'checking' | 'configured' | 'missing' | 'unavailable';

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

export function useCashMindTokens() {
  const [shortcutTokenStatus, setShortcutTokenStatus] = useState<TokenStatus>('checking');
  const [shortcutTokenHint, setShortcutTokenHint] = useState('');
  const [shortcutToken, setShortcutToken] = useState(() => getStoredValue(SHORTCUT_TOKEN_STORAGE_KEY));

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
    await loadShortcutTokenStatus();
  }, [loadShortcutTokenStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const shortcutTokenStatusText = useMemo(() => {
    const configuredText = shortcutToken ? '已自动封装到快捷指令模板' : '服务端已自动生成';
    return buildTokenStatusText(shortcutTokenStatus, shortcutTokenHint, {
      configuredText,
      missingText: '服务端启动时会自动生成快捷指令密钥',
    });
  }, [shortcutToken, shortcutTokenHint, shortcutTokenStatus]);

  return {
    appSessionStatusText: '网页直接读写，免手动配置',
    shortcutToken,
    shortcutTokenStatusText,
    isAppSessionAuthorized: true,
    isShortcutTokenReady: Boolean(shortcutToken.trim()),
  };
}
