import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { getApiUrl } from '../lib/api';
import { copyToClipboard } from '../lib/clipboard';
import { buildShortcutTemplates } from '../lib/shortcutTemplates';
import { useCashMindTokens } from '../hooks/useCashMindTokens';
import { useToast } from './Toast';

type ShortcutAutomationCardProps = {
  readonly onOpenGuide: () => void;
  readonly onAuthorizeRequest: () => void;
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

const AUTOMATION_STEPS = [
  { title: '1. iPhone 捕获', detail: 'Wallet、短信、邮件或 OCR 触发快捷指令。', icon: Icons.Smartphone },
  { title: '2. 发送到 VPS', detail: '获取 URL 内容，用 POST 把文本或金额发到入口。', icon: Icons.Send },
  { title: '3. AI 自动入账', detail: '服务端识别金额、时间、分类，并同步到流水。', icon: Icons.Sparkles },
] satisfies readonly { readonly title: string; readonly detail: string; readonly icon: LucideIcon }[];

export default function ShortcutAutomationCard({ onOpenGuide, onAuthorizeRequest }: ShortcutAutomationCardProps) {
  const { showToast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [manualCopy, setManualCopy] = useState<ManualCopyState | null>(null);
  const { appSessionStatusText, shortcutToken, shortcutTokenStatusText, isAppSessionAuthorized, isShortcutTokenReady } = useCashMindTokens();
  const captureUrl = getApiUrl('/api/shortcut/capture');
  const templates = useMemo(() => buildShortcutTemplates({ captureUrl, shortcutToken }), [captureUrl, shortcutToken]);

  const requestAuthorization = () => {
    showToast('先授权当前浏览器，配置包会自动生成', 'info');
    onAuthorizeRequest();
  };

  const copyTemplate = async (title: string, value: string, message: string) => {
    if (!isShortcutTokenReady) {
      requestAuthorization();
      return;
    }
    const copied = await copyToClipboard(value);
    if (copied) {
      showToast(message, 'success');
      return;
    }
    setManualCopy({ title, value });
    showToast('系统限制自动复制，已打开手动复制面板', 'info');
  };

  const testShortcutCapture = async () => {
    const token = shortcutToken.trim();
    if (!captureUrl || !token) {
      requestAuthorization();
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
          dryRun: true,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isCaptureResponse(payload) || payload.success !== true) {
        const errorText = isCaptureResponse(payload) && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
        throw new Error(errorText);
      }
      showToast('自检成功，未写入真实流水', 'success');
    } catch (error) {
      console.error('Shortcut self-test failed:', error instanceof Error ? error.message : String(error));
      showToast('自检失败，请检查快捷指令配置或 VPS 状态', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const dialog = manualCopy ? (
    <div className="fixed inset-0 z-[999] flex items-end bg-black/70 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md" role="dialog" aria-modal="true" onClick={() => setManualCopy(null)}>
      <div className="cm-sheet w-full rounded-[30px] p-5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">{manualCopy.title}</h3>
          <button type="button" onClick={() => setManualCopy(null)} className="cm-chip grid h-10 w-10 place-items-center rounded-full" aria-label="关闭手动复制面板">
            <Icons.X className="h-5 w-5" />
          </button>
        </div>
        <textarea readOnly value={manualCopy.value} className="cm-input mt-4 h-56 w-full resize-none rounded-[22px] p-4 font-mono text-xs leading-relaxed" onFocus={(event) => event.currentTarget.select()} />
      </div>
    </div>
  ) : null;

  return (
    <>
      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="cm-card rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--cm-purple)]">Automation Engine</p>
            <h2 className="mt-1 text-2xl font-black">无感自动记账流程</h2>
            <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-[var(--cm-text-soft)]">
              授权一次浏览器后，复制配置包到 iPhone 快捷指令即可。
            </p>
          </div>
          <div className="text-right">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--cm-purple)] text-black">
              <Icons.Zap className="h-6 w-6" />
            </span>
            <span className="cm-status-pill mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold text-[var(--cm-green)]">Live</span>
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          {AUTOMATION_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="cm-action-row flex items-start gap-3 rounded-[20px] p-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black text-[var(--cm-purple)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black">{step.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[var(--cm-text-soft)]">{step.detail}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          {[
            { label: '浏览器授权', value: `${appSessionStatusText}。只保护网页读取和编辑。`, icon: Icons.ShieldCheck },
            { label: '快捷指令密钥', value: `${shortcutTokenStatusText}。只允许手机写入流水。`, icon: Icons.KeyRound },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="cm-action-row rounded-[22px] p-4">
                <div className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black">
                    <Icon className="h-5 w-5 text-[var(--cm-purple)]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold">{item.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--cm-text-soft)]">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isAppSessionAuthorized && (
          <button type="button" onClick={onAuthorizeRequest} className="cm-primary cm-press mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[20px] text-sm font-black">
            <Icons.LockKeyhole className="h-4 w-4" /> 授权当前浏览器
          </button>
        )}

        <div className="mt-5 rounded-[24px] bg-black/45 p-4">
          <p className="text-sm font-bold">万能入口 URL</p>
          <code className="mt-3 block break-all rounded-[18px] bg-[var(--cm-card-raised)] p-3 font-mono text-xs text-[var(--cm-text-soft)]">
            {isShortcutTokenReady ? templates.captureUrl : '授权当前浏览器后自动生成'}
          </code>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copyTemplate('万能入口 URL', templates.captureUrl, '入口 URL 已复制')} className="cm-card-raised cm-press flex h-12 items-center justify-center gap-2 rounded-[18px] text-sm font-bold">
              <Icons.Link className="h-4 w-4" /> 复制 URL
            </button>
            <button type="button" disabled={isTesting} onClick={testShortcutCapture} className="cm-primary cm-press flex h-12 items-center justify-center gap-2 rounded-[18px] text-sm font-bold disabled:opacity-50">
              {isTesting ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.CheckCircle2 className="h-4 w-4" />} {isTesting ? '自检中' : '自检写入'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <button type="button" onClick={() => copyTemplate('完整配置包', templates.packageText, '完整配置包已复制')} className="cm-primary cm-press flex h-[52px] items-center justify-center gap-2 rounded-[20px] text-sm font-black">
            <Icons.PackageCheck className="h-4 w-4" /> 复制完整配置包
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copyTemplate('Wallet 模板', templates.walletBody, 'Wallet 模板已复制')} className="cm-card-raised cm-press h-12 rounded-[18px] text-sm font-bold">
              Wallet 模板
            </button>
            <button type="button" onClick={() => copyTemplate('短信模板', templates.textBody, '短信模板已复制')} className="cm-card-raised cm-press h-12 rounded-[18px] text-sm font-bold">
              短信模板
            </button>
          </div>
          <button type="button" onClick={onOpenGuide} className="cm-card-raised cm-press flex h-12 items-center justify-center gap-2 rounded-[18px] text-sm font-bold">
            <Icons.BookOpen className="h-4 w-4" /> 三步配置说明
          </button>
        </div>
      </motion.section>
      {dialog && typeof document !== 'undefined' ? createPortal(dialog, document.body) : null}
    </>
  );
}
