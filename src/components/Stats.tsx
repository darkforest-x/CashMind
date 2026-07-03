import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, isWithinInterval, endOfDay, parseISO, startOfMonth, startOfWeek, startOfYear, subDays } from 'date-fns';
import { Activity, AlertTriangle, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import type { Budget, Transaction } from '../types';
import { MOCK_CATEGORIES } from '../data';
import { cn, formatCurrency } from '../lib/utils';

type StatsProps = {
  readonly transactions: readonly Transaction[];
  readonly budgets?: readonly Budget[];
};

type TimeRange = 'week' | 'month' | 'year';

const EXCHANGE_RATES: Record<string, number> = { CNY: 1, USD: 7.23, EUR: 7.75, JPY: 0.047 };

function toCNY(amount: number, currency = 'CNY') {
  return amount * (EXCHANGE_RATES[currency] || 1);
}

export default function Stats({ transactions, budgets = [] }: StatsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const now = new Date();
  const currentMonth = format(now, 'yyyy-MM');
  const currentBudget = budgets.find((budget) => budget.month === currentMonth)?.amount || 0;

  const filteredTransactions = useMemo(() => {
    const start = timeRange === 'week' ? startOfWeek(now) : timeRange === 'year' ? startOfYear(now) : startOfMonth(now);
    return transactions.filter((transaction) => isWithinInterval(parseISO(transaction.date), { start, end: endOfDay(now) }));
  }, [transactions, timeRange]);

  const expenses = filteredTransactions.filter((transaction) => transaction.type === 'expense');
  const totalExpense = expenses.reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
  const categoryData = MOCK_CATEGORIES.map((category) => {
    const value = expenses
      .filter((transaction) => transaction.category === category.id)
      .reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
    return { name: category.name, value, color: category.color };
  }).filter((category) => category.value > 0).sort((left, right) => right.value - left.value);

  const trendData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 12;
    return Array.from({ length: days }, (_, index) => {
      const date = subDays(now, days - 1 - index);
      const keyFormat = timeRange === 'year' ? 'yyyy-MM' : 'yyyy-MM-dd';
      const label = timeRange === 'year' ? format(date, 'MM月') : format(date, 'dd日');
      const amount = transactions
        .filter((transaction) => transaction.type === 'expense' && format(parseISO(transaction.date), keyFormat) === format(date, keyFormat))
        .reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
      return { date: label, amount: Math.round(amount) };
    });
  }, [transactions, timeRange]);

  const monthExpense = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(currentMonth))
    .reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
  const lastMonth = format(subDays(now, 30), 'yyyy-MM');
  const lastMonthExpense = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.date.startsWith(lastMonth))
    .reduce((sum, transaction) => sum + toCNY(transaction.amount, transaction.currency), 0);
  const momChange = lastMonthExpense > 0 ? ((monthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0;
  const dailyAverage = monthExpense / now.getDate();
  const budgetRatio = currentBudget > 0 ? Math.min((monthExpense / currentBudget) * 100, 100) : 0;
  const topCategory = categoryData[0];
  const safeBudgetRatio = Number.isFinite(budgetRatio) ? budgetRatio : 0;
  const budgetLeft = Math.max(currentBudget - monthExpense, 0);

  const insightRows = [
    {
      title: '月度节奏',
      body: momChange > 0 ? `本月支出较上月增加 ${momChange.toFixed(1)}%。` : `本月支出较上月减少 ${Math.abs(momChange).toFixed(1)}%。`,
      icon: momChange > 0 ? AlertTriangle : CheckCircle2,
      tone: momChange > 0 ? 'text-[var(--cm-amber)]' : 'text-[var(--cm-green)]',
    },
    { title: '日均消费', body: `当前日均 ${formatCurrency(dailyAverage, 'CNY')}。`, icon: Activity, tone: 'text-[var(--cm-purple)]' },
    {
      title: '消费大户',
      body: topCategory ? `${topCategory.name} 占本周期支出 ${(topCategory.value / Math.max(totalExpense, 1) * 100).toFixed(1)}%。` : '还没有足够消费记录。',
      icon: TrendingUp,
      tone: 'text-[var(--cm-green)]',
    },
  ];

  return (
    <div className="h-full overflow-y-auto px-7 pb-32 pt-36 text-white cm-scrollbar">
      <section>
        <h1 className="text-[30px] font-black">Featured ›</h1>
        <div className="cm-card mt-5 rounded-[28px] p-6">
          <p className="text-sm font-bold text-[var(--cm-text-soft)]">Budget Market</p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[32px] font-black">{currentBudget ? formatCurrency(budgetLeft, 'CNY') : '未设置'}</p>
              <p className="mt-2 text-sm text-[var(--cm-text-soft)]">本月预算剩余</p>
            </div>
            <Sparkles className="h-10 w-10 text-[var(--cm-purple)]" />
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-black">
            <motion.div className={cn('h-full rounded-full', safeBudgetRatio > 90 ? 'bg-[var(--cm-red)]' : 'bg-[var(--cm-purple)]')} initial={{ width: 0 }} animate={{ width: `${safeBudgetRatio}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center text-sm font-bold text-[var(--cm-text-soft)]">
            <span className="rounded-full bg-black/40 py-3">{Math.round(safeBudgetRatio)}%</span>
            <span className="rounded-full bg-black/40 py-3">{formatCurrency(monthExpense, 'CNY')}</span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[30px] font-black">趋势 ›</h2>
          <div className="flex rounded-full bg-[var(--cm-chip)] p-1">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={cn('h-9 rounded-full px-4 text-sm font-bold', timeRange === range ? 'cm-chip-active' : 'text-[var(--cm-text-soft)]')}
              >
                {range === 'week' ? '1周' : range === 'month' ? '1月' : '1年'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 0, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="cashmindPhantomTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="var(--cm-green)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--cm-green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cm-text-muted)' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--cm-text-muted)' }} />
              <Tooltip contentStyle={{ background: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, color: '#fff' }} formatter={(value: number) => [formatCurrency(value, 'CNY'), '支出']} />
              <Area type="monotone" dataKey="amount" stroke="var(--cm-green)" strokeWidth={4} fill="url(#cashmindPhantomTrend)" activeDot={{ r: 6, fill: 'var(--cm-green)', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[30px] font-black">Upcoming ›</h2>
        <div className="-mx-7 mt-5 flex gap-3 overflow-x-auto px-7 pb-2 cm-scrollbar">
          {categoryData.slice(0, 5).map((category) => (
            <div key={category.name} className="cm-card min-w-[190px] rounded-[24px] p-5">
              <span className="block h-12 w-12 rounded-2xl" style={{ backgroundColor: category.color }} />
              <p className="mt-5 font-bold">{category.name}</p>
              <p className="mt-2 text-sm text-[var(--cm-text-soft)]">{formatCurrency(category.value, 'CNY')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[30px] font-black">World Cash Chat</h2>
          <span className="text-sm text-[var(--cm-green)]">● AI 正在分析</span>
        </div>
        <div className="cm-card space-y-5 rounded-[28px] p-6">
          {insightRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.title} className="flex gap-4">
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', row.tone)} />
                <div>
                  <p className="font-bold">{row.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--cm-text-soft)]">{row.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
