import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { getApiUrl } from '../lib/api';
import { copyToClipboard } from '../lib/clipboard';
import { buildShortcutTemplates } from '../lib/shortcutTemplates';
import { useCashMindTokens } from '../hooks/useCashMindTokens';
import { useToast } from './Toast';
import TokenInput from './TokenInput';

type ShortcutAutomationCardProps = {
  readonly onOpenGuide: () => void;
};

type ManualCopyState = {
  readonly title: string;
  readonly value: string;
};

type CaptureResponse = {
  readonly success?: unknown;
  readonly error?: unknown;
};

function isCaptureResponse(value: unknown): value is CaptureResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function ShortcutAutomationCard({ onOpenGuide }: ShortcutAutomationCardProps) {
  const { showToast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [manualCopy, setManualCopy] = useState<ManualCopyState | null>(null);
  const {
    appAccessToken,
    setAppAccessToken,
    appTokenStatusText,
    saveAppAccessToken,
    shortcutToken,
    setShortcutToken,
    shortcutTokenStatusText,
    saveShortcutToken,
  } = useCashMindTokens();
  const captureUrl = getApiUrl('/api/shortcut/capture');
  const templates = useMemo(() => buildShortcutTemplates({ captureUrl, shortcutToken }), [captureUrl, shortcutToken]);

  const copyTemplate = async (title: string, value: string, message: string) => {
    const copied = await copyToClipboard(value);
    if (copied) {
      showToast(message, 'success');
      return;
    }
    setManualCopy({ title, value });
    showToast('系统限制自动复制，已打开手动复制面板', 'info');
  };

  const copyShortcutToken = async () => {
    const normalizedToken = shortcutToken.trim();
    if (!normalizedToken) {
      showToast('请先粘贴并保存快捷指令 Token', 'error');
      return;
    }

    await copyTemplate('快捷指令 Token', normalizedToken, '快捷指令 Token 已复制到剪贴板');
  };

  const testShortcutCapture = async () => {
    const token = shortcutToken.trim();
    if (!captureUrl || !token) {
      showToast('请先保存快捷指令 Token', 'error');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(captureUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          amount: 1.01,
          merchant: 'CashMind 配置自检',
          note: `CashMind 配置自检 ${new Date().toLocaleString('zh-CN')}`,
          currency: 'CNY',
          source: 'shortcut',
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isCaptureResponse(payload) || payload.success !== true) {
        const errorText = isCaptureResponse(payload) && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
        throw new Error(errorText);
      }
      showToast('自检成功，已写入一条测试流水', 'success');
    } catch (error) {
      console.error('Shortcut self-test failed:', error instanceof Error ? error.message : String(error));
      showToast('自检失败，请检查 Token 或 VPS 状态', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const manualCopyDialog = manualCopy ? (
    <div
      className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-copy-title"
      onClick={() => setManualCopy(null)}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_25px_50px_-12px_rgb(0,0,0,0.25)] dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p id="manual-copy-title" className="text-base font-semibold text-gray-900 dark:text-white">
              {manualCopy.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              长按下面内容，选择全选并复制。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setManualCopy(null)}
            aria-label="关闭手动复制面板"
            className="shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>
        <textarea
          readOnly
          value={manualCopy.value}
          className="mt-4 h-56 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-700 outline-none dark:border-white/10 dark:bg-black/30 dark:text-gray-200"
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Icons.Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold">自动化引擎</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">复制配置包，快捷指令里不用再手拼 Header</p>
          </div>
        </div>

        <div className="space-y-4">
          <TokenInput
            label="App 访问 Token"
            value={appAccessToken}
            onChange={setAppAccessToken}
            onSave={saveAppAccessToken}
            placeholder="粘贴 VPS .env 里的 APP_ACCESS_TOKEN"
            statusText={appTokenStatusText}
          />

          <TokenInput
            label="快捷指令 Token"
            value={shortcutToken}
            onChange={setShortcutToken}
            onSave={saveShortcutToken}
            onCopy={copyShortcutToken}
            placeholder="粘贴 VPS .env 里的 SHORTCUT_TOKEN"
            statusText={shortcutTokenStatusText}
          />

          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/80 dark:bg-indigo-950/20 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">万能入口 URL</p>
              <code className="mt-2 block rounded-xl bg-white/70 dark:bg-black/30 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 break-all select-all">
                {templates.captureUrl}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyTemplate('万能入口 URL', templates.captureUrl, '入口 URL 已复制')}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-white/80 dark:bg-white/10 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 border border-white/60 dark:border-white/10"
              >
                <Icons.Link className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">复制 URL</span>
              </button>
              <button
                type="button"
                onClick={testShortcutCapture}
                disabled={isTesting}
                className="flex min-w-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
              >
                {isTesting ? <Icons.Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Icons.CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span className="whitespace-nowrap">自检写入</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => copyTemplate('完整配置包', templates.packageText, '完整配置包已复制')}
              className="w-full flex items-center justify-between p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-2xl font-medium transition-colors hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icons.Package className="w-4 h-4 shrink-0" />
                <span className="truncate">复制完整配置包</span>
              </span>
              <Icons.Copy className="w-4 h-4 shrink-0" />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => copyTemplate('Wallet 模板', templates.walletBody, 'Wallet 模板已复制')}
                className="flex min-w-0 items-center justify-center gap-2 p-3 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-medium"
              >
                <Icons.WalletCards className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Wallet 模板</span>
              </button>
              <button
                type="button"
                onClick={() => copyTemplate('短信模板', templates.textBody, '短信模板已复制')}
                className="flex min-w-0 items-center justify-center gap-2 p-3 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-medium"
              >
                <Icons.MessageSquareText className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">短信模板</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenGuide}
              className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl font-medium transition-colors hover:bg-white/80 dark:hover:bg-white/10"
            >
              <span className="flex items-center gap-2">
                <Icons.BookOpen className="w-4 h-4" />
                三步配置说明
              </span>
              <Icons.ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {manualCopyDialog && typeof document !== 'undefined' ? createPortal(manualCopyDialog, document.body) : null}
    </>
  );
}
