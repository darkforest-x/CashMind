import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Clock3, HelpCircle, Server, ShieldCheck, User, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import type { DrawerAction } from './AppChrome';

type DrawerInfoPanel = Exclude<DrawerAction, 'settings'>;

type DrawerInfoSheetProps = {
  readonly panel: DrawerInfoPanel | null;
  readonly transactions: readonly Transaction[];
  readonly isApiBackend: boolean;
  readonly onClose: () => void;
};

function formatTransactionTime(dateText: string): string {
  try {
    return format(parseISO(dateText), 'MM-dd HH:mm');
  } catch {
    return dateText;
  }
}

function getPanelTitle(panel: DrawerInfoPanel): string {
  if (panel === 'profile') return '个人资料';
  if (panel === 'history') return '历史记录';
  return '帮助与支持';
}

function getPanelIcon(panel: DrawerInfoPanel) {
  if (panel === 'profile') return User;
  if (panel === 'history') return Clock3;
  return HelpCircle;
}

export default function DrawerInfoSheet({ panel, transactions, isApiBackend, onClose }: DrawerInfoSheetProps) {
  if (!panel || typeof document === 'undefined') return null;

  const Icon = getPanelIcon(panel);
  const recentTransactions = transactions.slice(0, 6);
  const serviceStatus = isApiBackend ? '已连接' : 'Firebase 云端';

  return createPortal(
    <AnimatePresence>
      <motion.button className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm" aria-label="关闭账户信息" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="cm-sheet fixed bottom-0 left-1/2 z-[91] max-h-[82vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-[36px] p-7 pb-[calc(env(safe-area-inset-bottom)+28px)] cm-scrollbar" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
        <div className="mb-6 flex items-center justify-between">
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
          <button type="button" onClick={onClose} className="cm-chip cm-press grid h-11 w-11 place-items-center rounded-full" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--cm-purple)] text-black">
            <Icon className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--cm-text-soft)]">@cashmind</p>
            <h2 className="text-2xl font-black">{getPanelTitle(panel)}</h2>
          </div>
        </div>

        {panel === 'profile' && (
          <div className="mt-6 space-y-3">
            <div className="cm-action-row flex items-center gap-4 rounded-[24px] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black text-[var(--cm-purple)]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-bold">服务状态</span>
                <span className="mt-1 block text-sm text-[var(--cm-text-soft)]">{serviceStatus}</span>
              </span>
            </div>
            <div className="cm-action-row flex items-center gap-4 rounded-[24px] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-black text-[var(--cm-purple)]">
                <Server className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-bold">数据位置</span>
                <span className="mt-1 block text-sm text-[var(--cm-text-soft)]">{isApiBackend ? '个人 VPS 自托管' : '云端同步'}</span>
              </span>
            </div>
          </div>
        )}

        {panel === 'history' && (
          <div className="mt-6 space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="cm-action-row rounded-[24px] p-5 text-sm text-[var(--cm-text-soft)]">暂无历史流水。</div>
            ) : recentTransactions.map((transaction) => (
              <div key={transaction.id} className="cm-action-row flex items-center justify-between gap-4 rounded-[22px] p-4">
                <span className="min-w-0">
                  <span className="block truncate font-bold">{transaction.note || transaction.category}</span>
                  <span className="mt-1 block text-sm text-[var(--cm-text-soft)]">{formatTransactionTime(transaction.date)}</span>
                </span>
                <span className={transaction.type === 'income' ? 'text-[var(--cm-green)]' : 'text-[var(--cm-red)]'}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                </span>
              </div>
            ))}
          </div>
        )}

        {panel === 'help' && (
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-[var(--cm-text-soft)]">
            <p className="cm-action-row rounded-[22px] p-4">网页端已经去掉授权码，打开个人 VPS 地址即可读取、编辑和设置预算。</p>
            <p className="cm-action-row rounded-[22px] p-4">快捷指令只负责写入流水；配置包会自动带上写入密钥。</p>
            <p className="cm-action-row rounded-[22px] p-4">所有账单数据保存在你的个人服务中。</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
