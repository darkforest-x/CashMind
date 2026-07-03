import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { formatISO } from 'date-fns';
import type { Currency, Transaction } from '../types';
import { MOCK_CATEGORIES } from '../data';
import { cn, getCurrencySymbol } from '../lib/utils';
import { apiFetch, hasApiBackend } from '../lib/api';
import { parseAiSuggestions, type AiSuggestion } from '../lib/aiSuggestions';
import { useToast } from './Toast';
import Numpad from './Numpad';

type AddProps = {
  readonly onAdd: (transaction: Transaction) => void;
  readonly onUpdate?: (transaction: Transaction) => void;
  readonly initialData?: Transaction | null;
  readonly onCancelEdit?: () => void;
};

const CURRENCIES: readonly Currency[] = ['CNY', 'USD', 'EUR', 'JPY'];

function readDefaultCurrency(): Currency {
  const saved = localStorage.getItem('gqh_default_currency');
  return CURRENCIES.find((currency) => currency === saved) || 'CNY';
}

export default function Add({ onAdd, onUpdate, initialData, onCancelEdit }: AddProps) {
  const [amount, setAmount] = useState(initialData ? String(initialData.amount) : '0');
  const [type, setType] = useState<'expense' | 'income'>(initialData ? initialData.type : 'expense');
  const [category, setCategory] = useState(initialData ? initialData.category : 'food');
  const [currency, setCurrency] = useState<Currency>(initialData ? initialData.currency : readDefaultCurrency());
  const [note, setNote] = useState(initialData?.note || '');
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<readonly AiSuggestion[]>([{ cat: 'food', prob: 100, label: '餐饮美食' }]);
  const [isClassifying, setIsClassifying] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const numAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0 || !note.trim()) return;

    const classify = async () => {
      setIsClassifying(true);
      try {
        if (!hasApiBackend()) return;
        const response = await apiFetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numAmount, note }),
        });
        if (!response.ok) {
          showToast('AI 分类失败，请稍后重试', 'error');
          return;
        }
        const suggestions = parseAiSuggestions(await response.json());
        if (suggestions.length > 0) {
          setAiSuggestions(suggestions);
          setCategory(suggestions[0].cat);
        }
      } catch (error) {
        console.error('Failed to classify:', error instanceof Error ? error.message : String(error));
        showToast('AI 分类失败，请检查网络', 'error');
      } finally {
        setIsClassifying(false);
      }
    };

    const timer = window.setTimeout(classify, 800);
    return () => window.clearTimeout(timer);
  }, [amount, note, showToast]);

  const handleNumpad = (value: string) => {
    if (value === 'C') {
      setAmount('0');
      return;
    }
    if (value === 'DEL') {
      setAmount((current) => (current.length > 1 ? current.slice(0, -1) : '0'));
      return;
    }
    if (value === '.') {
      setAmount((current) => (current.includes('.') ? current : `${current}.`));
      return;
    }
    setAmount((current) => (current === '0' ? value : `${current}${value}`));
  };

  const handleSave = () => {
    const numAmount = Number.parseFloat(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) return;
    const transaction: Transaction = initialData
      ? { ...initialData, amount: numAmount, type, category, note, currency }
      : { id: Math.random().toString(36).substring(7), amount: numAmount, type, category, date: formatISO(new Date()), note, source: 'manual', currency };
    if (initialData) {
      onUpdate?.(transaction);
    } else {
      onAdd(transaction);
    }
    setAmount('0');
    setNote('');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden px-7 pt-36 text-white">
      <div className="min-h-0 flex-1 overflow-y-auto pb-5 cm-scrollbar">
      <section>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[17px] text-[var(--cm-text-soft)]">{initialData ? '编辑记录' : '新建记录'}</p>
            <h1 className="text-[30px] font-black">AI 辅助补记</h1>
          </div>
          {initialData && (
            <button type="button" onClick={onCancelEdit} className="cm-chip grid h-11 w-11 place-items-center rounded-full" aria-label="取消编辑">
              <Icons.X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="mt-7 flex justify-center rounded-full bg-[var(--cm-chip)] p-1">
          {(['expense', 'income'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setType(item)}
              className={cn('h-11 flex-1 rounded-full text-[15px] font-bold transition-colors', type === item ? 'cm-chip-active' : 'text-[var(--cm-text-soft)]')}
            >
              {item === 'expense' ? '支出' : '收入'}
            </button>
          ))}
        </div>

        <div className="relative mt-8 text-center">
          <button type="button" onClick={() => setCurrencyMenuOpen(true)} className="text-4xl font-black text-[var(--cm-purple)]">
            {getCurrencySymbol(currency)}
          </button>
          <span className="ml-2 align-baseline text-[clamp(48px,16vw,64px)] font-black leading-none">{amount}</span>
        </div>

        <div className="cm-action-row mt-7 flex items-center justify-between rounded-[24px] p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black text-[var(--cm-purple)]">
              <Icons.Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold">AI 草稿</p>
              <p className="mt-1 text-sm text-[var(--cm-text-soft)]">{note.trim() ? '正在根据备注推测分类' : '输入备注后自动推测'}</p>
            </div>
          </div>
          <span className={cn('cm-status-pill rounded-full px-3 py-1 text-xs font-bold', isClassifying ? 'text-[var(--cm-amber)]' : 'text-[var(--cm-green)]')}>
            {isClassifying ? '分析中' : '就绪'}
          </span>
        </div>
      </section>

      <section className="mt-4">
        <input
          type="text"
          placeholder="添加商户、备注或交易来源"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="cm-input h-14 w-full rounded-[22px] px-5 text-[16px]"
        />
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--cm-purple)]">
          <Icons.Sparkles className="h-4 w-4" />
          <span>AI 智能推测分类</span>
          {isClassifying && <Icons.Loader2 className="h-3 w-3 animate-spin" />}
        </div>
        <div className="-mx-7 flex gap-2 overflow-x-auto px-7 pb-2 cm-scrollbar">
          {MOCK_CATEGORIES.map((item) => {
            const suggestion = aiSuggestions.find((entry) => entry.cat === item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={cn('cm-press shrink-0 rounded-full px-4 py-2 text-sm font-bold', category === item.id ? 'cm-chip-active' : 'cm-chip')}
              >
                {item.name}{suggestion ? ` ${suggestion.prob}%` : ''}
              </button>
            );
          })}
        </div>
      </section>

      </div>

      <div className="shrink-0 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2">
        <Numpad onInput={handleNumpad} onSave={handleSave} />
      </div>

      {currencyMenuOpen && typeof document !== 'undefined' ? createPortal(
      <AnimatePresence>
        {currencyMenuOpen && (
          <>
            <motion.button className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" aria-label="关闭币种选择" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCurrencyMenuOpen(false)} />
            <motion.div className="cm-sheet fixed bottom-0 left-1/2 z-[91] w-full max-w-md -translate-x-1/2 rounded-t-[36px] p-7 pb-[calc(env(safe-area-inset-bottom)+28px)]" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
              <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-white/25" />
              <h2 className="text-2xl font-black">选择币种</h2>
              <div className="mt-5 space-y-2">
                {CURRENCIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setCurrency(item);
                      setCurrencyMenuOpen(false);
                    }}
                    className={cn('cm-press cm-action-row flex h-14 w-full items-center justify-between rounded-[22px] px-5 font-bold', currency === item && 'bg-[var(--cm-purple)] text-black')}
                  >
                    <span>{item}</span>
                    <span>{getCurrencySymbol(item)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body) : null}
    </div>
  );
}
