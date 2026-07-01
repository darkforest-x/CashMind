import { useEffect, useState } from 'react';
import { APP_ACCESS_TOKEN_STORAGE_KEY, APP_ACCESS_TOKEN_UPDATED_EVENT, getApiUrl } from '../lib/api';
import { useToast } from '../components/Toast';

type TokenStatus = 'checking' | 'configured' | 'missing' | 'unavailable';

const SHORTCUT_TOKEN_STORAGE_KEY = 'cashmind_shortcut_token';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTokenStatusText(status: TokenStatus, hint: string, envName: string): string {
  if (status === 'checking') return '正在检查服务端 Token 状态...';
  if (status === 'configured') return hint ? `服务端已配置，尾号 ${hint}` : '服务端已配置';
  if (status === 'missing') return `服务端还没有配置 ${envName}`;
  return '当前环境无法读取服务端状态，请确认 API 地址';
}

export function useCashMindTokens() {
  const { showToast } = useToast();
  const [appAccessToken, setAppAccessToken] = useState(() => localStorage.getItem(APP_ACCESS_TOKEN_STORAGE_KEY) || '');
  const [appTokenStatus, setAppTokenStatus] = useState<TokenStatus>('checking');
  const [appTokenHint, setAppTokenHint] = useState('');
  const [shortcutToken, setShortcutToken] = useState(() => localStorage.getItem(SHORTCUT_TOKEN_STORAGE_KEY) || '');
  const [shortcutTokenStatus, setShortcutTokenStatus] = useState<TokenStatus>('checking');
  const [shortcutTokenHint, setShortcutTokenHint] = useState('');

  useEffect(() => {
    const tokenUrl = getApiUrl('/api/app/token');
    if (!tokenUrl) {
      setAppTokenStatus('unavailable');
      return;
    }

    let didCancel = false;
    fetch(tokenUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (didCancel || !isRecord(data)) return;
        setAppTokenStatus(data.configured === true ? 'configured' : 'missing');
        setAppTokenHint(typeof data.hint === 'string' ? data.hint : '');
        const exposedToken = typeof data.token === 'string' ? data.token : '';
        if (exposedToken && !localStorage.getItem(APP_ACCESS_TOKEN_STORAGE_KEY)) {
          localStorage.setItem(APP_ACCESS_TOKEN_STORAGE_KEY, exposedToken);
          setAppAccessToken(exposedToken);
          window.dispatchEvent(new Event(APP_ACCESS_TOKEN_UPDATED_EVENT));
        }
      })
      .catch((error: unknown) => {
        if (didCancel) return;
        console.error('Failed to read app token status:', error instanceof Error ? error.message : String(error));
        setAppTokenStatus('unavailable');
      });

    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    const tokenUrl = getApiUrl('/api/shortcut/token');
    if (!tokenUrl) {
      setShortcutTokenStatus('unavailable');
      return;
    }

    let didCancel = false;
    fetch(tokenUrl)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (didCancel || !isRecord(data)) return;
        setShortcutTokenStatus(data.configured === true ? 'configured' : 'missing');
        setShortcutTokenHint(typeof data.hint === 'string' ? data.hint : '');
        const exposedToken = typeof data.token === 'string' ? data.token : '';
        if (exposedToken && !localStorage.getItem(SHORTCUT_TOKEN_STORAGE_KEY)) {
          localStorage.setItem(SHORTCUT_TOKEN_STORAGE_KEY, exposedToken);
          setShortcutToken(exposedToken);
        }
      })
      .catch((error: unknown) => {
        if (didCancel) return;
        console.error('Failed to read shortcut token status:', error instanceof Error ? error.message : String(error));
        setShortcutTokenStatus('unavailable');
      });

    return () => {
      didCancel = true;
    };
  }, []);

  const saveAppAccessToken = () => {
    const normalizedToken = appAccessToken.trim();
    if (!normalizedToken) {
      showToast('请先粘贴 VPS 上的 APP_ACCESS_TOKEN', 'error');
      return;
    }
    localStorage.setItem(APP_ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
    setAppAccessToken(normalizedToken);
    window.dispatchEvent(new Event(APP_ACCESS_TOKEN_UPDATED_EVENT));
    showToast('App 访问 Token 已保存在本机', 'success');
  };

  const saveShortcutToken = () => {
    const normalizedToken = shortcutToken.trim();
    if (!normalizedToken) {
      showToast('请先粘贴 VPS 上的 SHORTCUT_TOKEN', 'error');
      return;
    }
    localStorage.setItem(SHORTCUT_TOKEN_STORAGE_KEY, normalizedToken);
    setShortcutToken(normalizedToken);
    showToast('快捷指令 Token 已保存在本机', 'success');
  };

  const copyShortcutToken = async () => {
    const normalizedToken = shortcutToken.trim();
    if (!normalizedToken) {
      showToast('请先粘贴并保存快捷指令 Token', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(normalizedToken);
      showToast('快捷指令 Token 已复制到剪贴板', 'success');
    } catch (error) {
      console.error('Failed to copy token:', error instanceof Error ? error.message : String(error));
      showToast('复制失败，请手动选择 Token', 'error');
    }
  };

  return {
    appAccessToken,
    setAppAccessToken,
    appTokenStatusText: `${getTokenStatusText(appTokenStatus, appTokenHint, 'APP_ACCESS_TOKEN')}。用于保护账单读取、编辑和 AI 分类接口。`,
    saveAppAccessToken,
    shortcutToken,
    setShortcutToken,
    shortcutTokenStatusText: `${getTokenStatusText(shortcutTokenStatus, shortcutTokenHint, 'SHORTCUT_TOKEN')}。用于 iPhone 快捷指令写入账单。`,
    saveShortcutToken,
    copyShortcutToken,
  };
}
