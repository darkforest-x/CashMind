import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Transaction } from '../types';
import { formatCurrency } from '../lib/utils';

type TransactionActionSheetProps = {
  readonly transaction: Transaction | null;
  readonly title: string;
  readonly onClose: () => void;
  readonly onEdit?: (transaction: Transaction) => void;
  readonly onDelete?: (id: string) => void;
};

export default function TransactionActionSheet({ transaction, title, onClose, onEdit, onDelete }: TransactionActionSheetProps) {
  if (!transaction || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.button className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" aria-label="关闭账单操作" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="cm-sheet fixed bottom-0 left-1/2 z-[91] w-full max-w-md -translate-x-1/2 rounded-t-[36px] p-7 pb-[calc(env(safe-area-inset-bottom)+28px)]" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-white/25" />
        <h3 className="text-2xl font-black">{title}</h3>
        <p className="mt-2 text-[var(--cm-text-soft)]">{transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}</p>
        <div className="mt-7 space-y-3">
          <button type="button" className="cm-card-raised flex h-14 w-full items-center justify-center gap-2 rounded-[22px] font-bold" onClick={() => { onEdit?.(transaction); onClose(); }}>
            <Edit2 className="h-4 w-4" /> 编辑记录
          </button>
          <button type="button" className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-red-500/15 font-bold text-[var(--cm-red)]" onClick={() => { onDelete?.(transaction.id); onClose(); }}>
            <Trash2 className="h-4 w-4" /> 删除记录
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
