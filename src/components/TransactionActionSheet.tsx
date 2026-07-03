import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarClock, Edit2, Radio, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Transaction } from '../types';
import { formatCurrency } from '../lib/utils';

type TransactionActionSheetProps = {
  readonly transaction: Transaction | null;
  readonly title: string;
  readonly onClose: () => void;
  readonly onEdit?: (transaction: Transaction) => void;
  readonly onDelete?: (id: string) => void;
};

const SOURCE_LABELS: Record<Transaction['source'], string> = {
  manual: '手动补记',
  shortcut: '快捷指令',
  wallet: 'Wallet 自动',
  sms: '短信自动',
  email: '邮件自动',
  ocr: 'OCR 自动',
  import: '账单导入',
};

export default function TransactionActionSheet({ transaction, title, onClose, onEdit, onDelete }: TransactionActionSheetProps) {
  if (!transaction || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.button className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" aria-label="关闭账单操作" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="cm-sheet fixed bottom-0 left-1/2 z-[91] w-full max-w-md -translate-x-1/2 rounded-t-[36px] p-7 pb-[calc(env(safe-area-inset-bottom)+28px)]" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
        <div className="mb-5 flex items-center justify-between">
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
          <button type="button" onClick={onClose} className="cm-chip cm-press grid h-10 w-10 place-items-center rounded-full" aria-label="关闭">
            <X className="h-5 w-5" />
          </button>
        </div>
        <h3 className="text-2xl font-black">{title}</h3>
        <p className={transaction.type === 'income' ? 'mt-2 text-[var(--cm-green)]' : 'mt-2 text-[var(--cm-red)]'}>{transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="cm-action-row rounded-[20px] p-4">
            <Radio className="h-5 w-5 text-[var(--cm-purple)]" />
            <p className="mt-3 text-xs text-[var(--cm-text-soft)]">来源</p>
            <p className="mt-1 text-sm font-bold">{SOURCE_LABELS[transaction.source]}</p>
          </div>
          <div className="cm-action-row rounded-[20px] p-4">
            <CalendarClock className="h-5 w-5 text-[var(--cm-purple)]" />
            <p className="mt-3 text-xs text-[var(--cm-text-soft)]">时间</p>
            <p className="mt-1 text-sm font-bold">{format(parseISO(transaction.date), 'MM-dd HH:mm')}</p>
          </div>
        </div>
        <div className="mt-7 space-y-3">
          <button type="button" className="cm-card-raised cm-press flex h-14 w-full items-center justify-center gap-2 rounded-[22px] font-bold" onClick={() => { onEdit?.(transaction); onClose(); }}>
            <Edit2 className="h-4 w-4" /> 编辑记录
          </button>
          <button type="button" className="cm-press flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-red-500/15 font-bold text-[var(--cm-red)]" onClick={() => { onDelete?.(transaction.id); onClose(); }}>
            <Trash2 className="h-4 w-4" /> 删除记录
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
