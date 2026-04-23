import React, { useState, useMemo } from 'react';
import { Transaction, Budget } from '../types';
import { MOCK_CATEGORIES } from '../data';
import * as Icons from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, isWithinInterval, parseISO, endOfDay } from 'date-fns';
import { cn, formatCurrency } from '../lib/utils';

interface StatsProps {
  transactions: Transaction[];
  budgets?: Budget[];
}

const EXCHANGE_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.23,
  EUR: 7.75,
  JPY: 0.047,
};

type TimeRange = 'week' | 'month' | 'year';

export default function Stats({ transactions, budgets = [] }: StatsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const toCNY = (amount: number, currency: string = 'CNY') => {
    return amount * (EXCHANGE_RATES[currency] || 1);
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date;
    switch (timeRange) {
      case 'week': start = startOfWeek(now); break;
      case 'month': start = startOfMonth(now); break;
      case 'year': start = startOfYear(now); break;
      default: start = startOfMonth(now);
    }
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end: endOfDay(now) });
    });
  }, [transactions, timeRange]);

  const expenses = filteredTransactions.filter((t) => t.type === 'expense');
  const totalExpense = expenses.reduce((sum, t) => sum + toCNY(t.amount, t.currency), 0);
  
  const categoryData = expenses.reduce((acc, t) => {
    const cat = MOCK_CATEGORIES.find((c) => c.id === t.category);
    if (!cat) return acc;
    const existing = acc.find((item) => item.name === cat.name);
    const amountInCNY = toCNY(t.amount, t.currency);
    if (existing) {
      existing.value += amountInCNY;
    } else {
      acc.push({ name: cat.name, value: amountInCNY, color: cat.color });
    }
    return acc;
  }, [] as { name: string; value: number; color: string }[]).sort((a, b) => b.value - a.value);

  // Daily Trend
  const trendData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : (timeRange === 'month' ? 30 : 12);
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const dateStr = timeRange === 'year' ? format(d, 'MM月') : format(d, 'dd日');
      const dayTotal = transactions
        .filter(t => t.type === 'expense' && format(parseISO(t.date), timeRange === 'year' ? 'yyyy-MM' : 'yyyy-MM-dd') === format(d, timeRange === 'year' ? 'yyyy-MM' : 'yyyy-MM-dd'))
        .reduce((sum, t) => sum + toCNY(t.amount, t.currency), 0);
      data.push({ date: dateStr, amount: Math.round(dayTotal) });
    }
    return data;
  }, [transactions, timeRange]);

  // Insights Data
  const currentMonth = format(new Date(), 'yyyy-MM');
  const lastMonth = format(subDays(new Date(), 30), 'yyyy-MM');
  const thisMonthExpense = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + toCNY(t.amount, t.currency), 0);
  const lastMonthExpense = transactions
    .filter(t => t.type === 'expense' && t.date.startsWith(lastMonth))
    .reduce((sum, t) => sum + toCNY(t.amount, t.currency), 0);
  
  const momChange = lastMonthExpense > 0 ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 : 0;
  const daysInMonth = new Date().getDate();
  const dailyAverage = thisMonthExpense / daysInMonth;

  const currentBudget = budgets.find(b => b.month === currentMonth)?.amount || 0;
  const budgetRemaining = Math.max(currentBudget - thisMonthExpense, 0);

  const insights = [
    {
      id: 1,
      title: '月度收支对比',
      desc: momChange > 0 
        ? `本月支出较上月增加 ${momChange.toFixed(1)}%，要注意控制开支哦。` 
        : `太棒了！本月支出较上月减少了 ${Math.abs(momChange).toFixed(1)}%。`,
      icon: momChange > 0 ? 'AlertTriangle' : 'CheckCircle',
      color: momChange > 0 ? 'text-amber-500' : 'text-green-500',
      bg: momChange > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20',
    },
    {
      id: 2,
      title: '日均消费水平',
      desc: `本月截止目前，你的日均消费为 ${formatCurrency(dailyAverage, 'CNY')}。`,
      icon: 'Activity',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      id: 3,
      title: '消费大户',
      desc: categoryData.length > 0 
        ? `「${categoryData[0].name}」是你的最大开销，占比 ${(categoryData[0].value / totalExpense * 100).toFixed(1)}%。`
        : '还没有产生消费记录，快开始记账吧！',
      icon: 'TrendingUp',
      color: 'text-purple-500',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-white pb-24 overflow-y-auto">
      <div className="sticky top-0 px-6 pt-12 pb-4 bg-white/40 dark:bg-black/40 backdrop-blur-3xl saturate-200 border-b border-white/40 dark:border-white/10 z-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">统计与洞察</h1>
          <div className="flex bg-black/5 dark:bg-white/10 rounded-xl p-1 p-0.5">
            {(['week', 'month', 'year'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  timeRange === r ? "bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500"
                )}
              >
                {r === 'week' ? '周' : r === 'month' ? '月' : '年'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 pb-6 relative z-10">
        {/* AI Insights */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Icons.Sparkles className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-medium">AI 财务洞察</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            {insights.map((insight, i) => {
              const Icon = (Icons as any)[insight.icon] || Icons.Info;
              return (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  key={insight.id}
                  className={cn(
                    "min-w-[260px] p-5 rounded-3xl backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
                    insight.bg
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-black/20 mb-3", insight.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {insight.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Category Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
        >
          <h2 className="text-base font-medium mb-6">支出构成</h2>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${formatCurrency(value, 'CNY')}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500">总支出</span>
              <span className="text-lg font-semibold">
                {formatCurrency(totalExpense, 'CNY')}
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {categoryData.slice(0, 4).map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-gray-600 dark:text-gray-300">{cat.name}</span>
                </div>
                <span className="font-medium text-xs opacity-70">¥{cat.value.toFixed(0)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trend Area Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
        >
          <h2 className="text-base font-medium mb-6">
            {timeRange === 'week' ? '本周' : timeRange === 'month' ? '本月' : '年度'}消费趋势
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Tooltip 
                  formatter={(value: number) => [`¥${value}`, '支出']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Budget Progress */}
        {currentBudget > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
          >
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-base font-medium">本月预算进度</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                剩余 {formatCurrency(budgetRemaining, 'CNY')}
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{formatCurrency(thisMonthExpense, 'CNY')}</span>
                <span className="text-gray-500 dark:text-gray-400">{formatCurrency(currentBudget, 'CNY')}</span>
              </div>
              <div className="h-3 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((thisMonthExpense / currentBudget) * 100, 100)}%` }}
                  className={cn(
                    "h-full rounded-full",
                    thisMonthExpense > currentBudget ? "bg-red-500" : "bg-indigo-500"
                  )}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                {thisMonthExpense > currentBudget ? '已超支，请及时核查' : `已使用 ${Math.round((thisMonthExpense / currentBudget) * 100)}%，消费节奏良好`}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
