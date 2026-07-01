import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { motion } from 'motion/react';
import { getApiUrl } from '../lib/api';
import { buildShortcutTemplates } from '../lib/shortcutTemplates';
import { useCashMindTokens } from '../hooks/useCashMindTokens';
import { useToast } from './Toast';
import TokenInput from './TokenInput';

type ShortcutAutomationCardProps = {
  readonly onOpenGuide: () => void;
};

type CaptureResponse = {
  readonly success?: unknown;
  readonly error?: unknown;
};

function isCaptureResponse(value: unknown): value is CaptureResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export default function ShortcutAutomationCard({ onOpenGuide }: ShortcutAutomationCardProps) {
  const { showToast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const {
    appAccessToken,
    setAppAccessToken,
    appTokenStatusText,
    saveAppAccessToken,
    shortcutToken,
    setShortcutToken,
    shortcutTokenStatusText,
    saveShortcutToken,
    copyShortcutToken,
  } = useCashMindTokens();
  const captureUrl = getApiUrl('/api/shortcut/capture');
  const templates = useMemo(() => buildShortcutTemplates({ captureUrl, shortcutToken }), [captureUrl, shortcutToken]);

  const copyTemplate = async (value: string, message: string) => {
    try {
      await copyText(value);
      showToast(message, 'success');
    } catch (error) {
      console.error('Failed to copy shortcut template:', error instanceof Error ? error.message : String(error));
      showToast('复制失败，请手动长按选择', 'error');
    }
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
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
              onClick={() => copyTemplate(templates.captureUrl, '入口 URL 已复制')}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/80 dark:bg-white/10 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 border border-white/60 dark:border-white/10"
            >
              <Icons.Link className="w-4 h-4" />
              复制 URL
            </button>
            <button
              type="button"
              onClick={testShortcutCapture}
              disabled={isTesting}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
            >
              {isTesting ? <Icons.Loader2 className="w-4 h-4 animate-spin" /> : <Icons.CheckCircle2 className="w-4 h-4" />}
              自检写入
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => copyTemplate(templates.packageText, '完整配置包已复制')}
            className="w-full flex items-center justify-between p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-2xl font-medium transition-colors hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30"
          >
            <span className="flex items-center gap-2">
              <Icons.Package className="w-4 h-4" />
              复制完整配置包
            </span>
            <Icons.Copy className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => copyTemplate(templates.walletBody, 'Wallet 模板已复制')}
              className="flex items-center justify-center gap-2 p-3 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-medium"
            >
              <Icons.WalletCards className="w-4 h-4" />
              Wallet 模板
            </button>
            <button
              type="button"
              onClick={() => copyTemplate(templates.textBody, '文本模板已复制')}
              className="flex items-center justify-center gap-2 p-3 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl text-sm font-medium"
            >
              <Icons.MessageSquareText className="w-4 h-4" />
              短信模板
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
  );
}
