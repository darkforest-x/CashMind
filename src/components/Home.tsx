import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  CircleHelp,
  CloudOff,
  Coffee,
  Gamepad2,
  HelpCircle,
  Home as HomeCategoryIcon,
  Mail,
  MessageSquareText,
  ReceiptText,
  ScanText,
  ShoppingBag,
  Utensils,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { Budget, Transaction, TransactionSource } from '../types';
import { MOCK_CATEGORIES } from '../data';
import { cn, formatCurrency } from '../lib/utils';
import TransactionActionSheet from './TransactionActionSheet';

type HomeProps = {
  readonly transactions: readonly Transaction[];
  readonly onDelete?: (id: string) => void;
  readonly onEdit?: (transaction: Transaction) => void;
  readonly budgets?: readonly Budget[];
  readonly user?: User | null;
  readonly backendMode?: boolean;
  readonly onLoginRequest?: () => void;
  readonly searchQuery?: string;
};

const EXCHANGE_RATES: Record<string, number> = { CNY: 1, USD: 7.23, EUR: 7.75, JPY: 0.047 };

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Utensils,
  Coffee,
  Car,
  ShoppingBag,
  Gamepad2,
  Home: HomeCategoryIcon,
  Wallet,
  CircleHelp,
};

const SOURCE_META: Record<TransactionSource, { readonly label: string; readonly icon: LucideIcon }> = {
  manual: { label: '手动补记', icon: ReceiptText },
  shortcut: { label: '快捷指令', icon: Zap },
  wallet: { label: 'Wallet 自动', icon: Wallet },
  sms: { label: '短信自动', icon: MessageSquareText },
  email: { label: '邮件自动', icon: Mail },
  ocr: { label: 'OCR 自动', icon: ScanText },
  import: { label: '账单导入', icon: ArrowDownLeft },
};

function toCNY(amount: number, currency = 'CNY') {
  return amount * (EXCHANGE_RATES[currency] || 1);
}

function formatDateLabel(dateText: string) {
  const date = parseISO(dateText);
  if (isToday(date)) return '今天';
  if (isYesterday(date)) return '昨天';
  return format(date, 'MM月dd日', { locale: zhCN });
}

export default function Home({
  transactions,
  onDelete,
  onEdit,
  budgets = [],
  user,
  backendMode = false,
  onLoginRequest,
  searchQuery = '',
}: HomeProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const query = searchQuery.trim().toLowerCase();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentBudget = budgets.find((budget) => budget.month === currentMonth)?.amount || 0;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (!query) return true;
      const category = MOCK_CATEGORIES.find((item) => item.id === transaction.category);
      return (
        transaction.note?.toLowerCase().includes(query) ||
        category?.name.toLowerCase().includes(query) ||
        SOURCE_META[transaction.source].label.toLowerCase().includes(query)
      );
    });
  }, [transactions, query]);

  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(currentMonth));
  const totalIncome = monthTransactions.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
  const totalExpense = monthTransactions.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
  const netBalance = totalIncome - totalExpense;
  const budgetProgress = currentBudget > 0 ? Math.min((totalExpense / currentBudget) * 100, 100) : 0;
  const budgetRemaining = currentBudget > 0 ? Math.max(currentBudget - totalExpense, 0) : 0;
  const autoCount = monthTransactions.filter((transaction) => transaction.source !== 'manual').length;
  const autoRatio = monthTransactions.length > 0 ? Math.round((autoCount / monthTransactions.length) * 100) : 0;
  const grouped = filteredTransactions.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    const dateKey = transaction.date.split('T')[0] || transaction.date;
    acc[dateKey] = [...(acc[dateKey] || []), transaction];
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((left, right) => right.localeCompare(left));
  const sourceCards = Object.entries(SOURCE_META).map(([source, meta]) => {
    const rows = monthTransactions.filter((transaction) => transaction.source === source);
    const amount = rows.reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
    return { source, ...meta, amount, count: rows.length };
  }).filter((card) => card.count > 0).slice(0, 6);

  const getCategory = (id: string) => MOCK_CATEGORIES.find((category) => category.id === id) || MOCK_CATEGORIES[0];
  const summaryCards = [
    { label: '收入', caption: '本月进账', value: formatCurrency(totalIncome, 'CNY'), delta: `${monthTransactions.filter((transaction) => transaction.type === 'income').length} 笔收入`, icon: ArrowDownLeft, tone: 'text-[var(--cm-green)]' },
    { label: '支出', caption: '本月消费', value: formatCurrency(totalExpense, 'CNY'), delta: `${monthTransactions.filter((transaction) => transaction.type === 'expense').length} 笔支出`, icon: ArrowUpRight, tone: 'text-[var(--cm-red)]' },
    { label: '预算', caption: currentBudget ? '剩余额度' : '尚未设置', value: currentBudget ? formatCurrency(budgetRemaining, 'CNY') : '未设', delta: currentBudget ? `${Math.round(budgetProgress)}% 已使用` : '点击底部 + 设置', icon: Wallet, tone: 'text-[var(--cm-purple)]' },
    { label: '自动化', caption: '无感同步率', value: `${autoRatio}%`, delta: `${autoCount}/${monthTransactions.length || 0} 笔自动入账`, icon: Zap, tone: 'text-[var(--cm-amber)]' },
  ];

  return (
    <div className="h-full overflow-y-auto px-7 pb-32 pt-36 text-white cm-scrollbar">
      <section>
        <button type="button" className="text-left text-[17px] text-[var(--cm-text-soft)]">
          自动账本 1⌄
        </button>
        <h1 className="mt-1 text-[56px] font-black leading-none">
          {netBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(netBalance), 'CNY')}
        </h1>
        <p className="mt-3 text-[17px] text-[var(--cm-text-soft)]">本月支出 {formatCurrency(totalExpense, 'CNY')}，自动同步 {backendMode ? '已连接' : user ? '云端已连接' : '未连接'}。</p>
        <button type="button" onClick={onLoginRequest} className="cm-primary cm-press mt-7 h-[66px] w-full rounded-full text-[17px] font-bold">
          {backendMode || user ? '查看自动化状态' : '连接个人服务'}
        </button>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-[27px] font-black">对于您的自动记账</h2>
          <span className="text-[26px] text-[var(--cm-text-soft)]">›</span>
        </div>
        <div className="-mx-7 mt-5 flex gap-3 overflow-x-auto px-7 pb-2 cm-scrollbar">
          {summaryCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="cm-card min-w-[220px] rounded-[28px] bg-[linear-gradient(180deg,var(--cm-card-raised),var(--cm-card))] p-5">
                <div className="flex items-start justify-between">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-black">
                    <Icon className={cn('h-7 w-7', item.tone)} />
                  </span>
                  <span className={cn('rounded-full bg-black/45 px-3 py-1 text-xs font-bold', item.tone)}>{item.delta}</span>
                </div>
                <p className="mt-6 text-xl font-black">{item.label}</p>
                <p className="mt-1 text-sm text-[var(--cm-text-soft)]">{item.caption}</p>
                <p className="mt-5 text-[26px] font-black leading-none">{item.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[27px] font-black">自动来源</h2>
        <div className="-mx-7 mt-5 flex gap-3 overflow-x-auto px-7 pb-2 cm-scrollbar">
          {(sourceCards.length ? sourceCards : [{ source: 'shortcut', ...SOURCE_META.shortcut, amount: 0, count: 0 }]).map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.source} className="cm-card min-w-[210px] rounded-[24px] p-5">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-black">
                  <Icon className="h-6 w-6 text-[var(--cm-purple)]" />
                </div>
                <p className="mt-4 text-lg font-bold">{card.label}</p>
                <p className="mt-1 text-sm text-[var(--cm-text-soft)]">{card.count} 笔</p>
                <p className="mt-4 text-[var(--cm-green)]">+{formatCurrency(card.amount, 'CNY')}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[27px] font-black">近期流水</h2>
          <span className="text-sm text-[var(--cm-text-muted)]">{backendMode ? '自托管' : user ? '已同步' : '未连接'}</span>
        </div>
        {!backendMode && !user && transactions.length === 0 ? (
          <button type="button" onClick={onLoginRequest} className="cm-card w-full rounded-[28px] p-8 text-center">
            <CloudOff className="mx-auto h-10 w-10 text-[var(--cm-text-muted)]" />
            <p className="mt-4 font-bold">未连接个人服务</p>
            <p className="mt-2 text-sm text-[var(--cm-text-soft)]">连接后自动账单会同步到这里。</p>
          </button>
        ) : sortedDates.length === 0 ? (
          <div className="py-10 text-center text-[var(--cm-text-soft)]">{query ? '没有找到相关记录' : '暂无流水'}</div>
        ) : (
          <div className="space-y-7">
            {sortedDates.map((dateKey) => {
              const dayRows = grouped[dateKey] || [];
              const dayTotal = dayRows.reduce((sum, transaction) => sum + toCNY(transaction.type === 'expense' ? -transaction.amount : transaction.amount, transaction.currency), 0);
              return (
                <div key={dateKey}>
                  <div className="mb-3 flex items-center justify-between text-sm text-[var(--cm-text-soft)]">
                    <span>{formatDateLabel(dateKey)}</span>
                    <span>{dayTotal < 0 ? '-' : '+'}{formatCurrency(Math.abs(dayTotal), 'CNY')}</span>
                  </div>
                  <div>
                    {dayRows.map((transaction, index) => {
                      const category = getCategory(transaction.category);
                      const Icon = CATEGORY_ICONS[category.icon] || HelpCircle;
                      const source = SOURCE_META[transaction.source];
                      return (
                        <button key={transaction.id} type="button" onClick={() => setSelectedTx(transaction)} className="cm-press flex w-full items-center gap-4 border-b border-[var(--cm-border)] py-3 text-left transition-colors last:border-b-0 hover:bg-white/5">
                          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ backgroundColor: category.color }}>
                            <Icon className="h-6 w-6 text-white" />
                            <span className="absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--cm-amber)] px-1 text-[10px] font-black text-black">{index + 1}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-bold">{transaction.note || category.name}</span>
                            <span className="mt-1 block truncate text-sm text-[var(--cm-text-soft)]">
                              {category.name} · {source.label}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[17px] font-bold">{transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount, transaction.currency)}</span>
                            <span className={cn('mt-1 block text-sm font-bold', transaction.type === 'income' ? 'text-[var(--cm-green)]' : 'text-[var(--cm-red)]')}>
                              {format(parseISO(transaction.date), 'HH:mm')} · {transaction.type === 'income' ? '收入' : '支出'}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TransactionActionSheet
        transaction={selectedTx}
        title={selectedTx ? selectedTx.note || getCategory(selectedTx.category).name : ''}
        onClose={() => setSelectedTx(null)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
