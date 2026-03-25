import React from 'react';
import { Transaction } from '../types';
import { MOCK_CATEGORIES } from '../data';
import * as Icons from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { motion } from 'motion/react';

interface StatsProps {
  transactions: Transaction[];
}

export default function Stats({ transactions }: StatsProps) {
  const expenses = transactions.filter((t) => t.type === 'expense');
  
  const categoryData = expenses.reduce((acc, t) => {
    const cat = MOCK_CATEGORIES.find((c) => c.id === t.category);
    if (!cat) return acc;
    const existing = acc.find((item) => item.name === cat.name);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: cat.name, value: t.amount, color: cat.color });
    }
    return acc;
  }, [] as { name: string; value: number; color: string }[]).sort((a, b) => b.value - a.value);

  const trendData = [
    { date: '1日', amount: 120 },
    { date: '2日', amount: 45 },
    { date: '3日', amount: 230 },
    { date: '4日', amount: 15 },
    { date: '5日', amount: 80 },
    { date: '6日', amount: 320 },
    { date: '7日', amount: 65 },
  ];

  const insights = [
    {
      id: 1,
      title: '外卖支出预警',
      desc: '本周外卖支出已达 ¥320，超过上周 45%，建议适当自己做饭哦。',
      icon: 'AlertTriangle',
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      id: 2,
      title: '咖啡爱好者',
      desc: '你已经连续 5 天购买咖啡，占总支出的 12%，是个不折不扣的咖啡星人。',
      icon: 'Coffee',
      color: 'text-brown-500',
      bg: 'bg-[#A2845E]/10',
    },
    {
      id: 3,
      title: '周末消费激增',
      desc: '上周末消费是工作日平均的 3 倍，主要集中在「休闲娱乐」。',
      icon: 'TrendingUp',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-white pb-24 overflow-y-auto">
      <div className="sticky top-0 px-6 pt-12 pb-6 bg-white/40 dark:bg-black/40 backdrop-blur-3xl saturate-200 border-b border-white/40 dark:border-white/10 z-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <h1 className="text-2xl font-semibold tracking-tight">统计与洞察</h1>
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
                  className={`min-w-[260px] p-5 rounded-3xl ${insight.bg} backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white/50 dark:bg-black/20 mb-3 ${insight.color}`}>
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
                  formatter={(value: number) => `¥${value.toFixed(2)}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-gray-500">总支出</span>
              <span className="text-lg font-semibold">
                ¥{expenses.reduce((sum, t) => sum + t.amount, 0).toFixed(0)}
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
                <span className="font-medium">¥{cat.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trend Area Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <h2 className="text-base font-medium mb-6">近7日趋势</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  formatter={(value: number) => [`¥${value}`, '支出']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Budget Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
        >
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-base font-medium">本月预算进度</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">剩余 ¥1,240.00</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-semibold">¥3,760.00</span>
              <span className="text-gray-500 dark:text-gray-400">¥5,000.00</span>
            </div>
            <div className="h-3 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">已使用 75%，当前消费节奏良好</p>
          </div>
        </motion.div>

        {/* Consumption Profile */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <h2 className="text-base font-medium mb-4">消费画像</h2>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl text-sm font-medium flex items-center gap-2">
              <Icons.Coffee className="w-4 h-4" />
              咖啡星人
            </div>
            <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl text-sm font-medium flex items-center gap-2">
              <Icons.Moon className="w-4 h-4" />
              夜间活跃
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl text-sm font-medium flex items-center gap-2">
              <Icons.Leaf className="w-4 h-4" />
              低碳出行
            </div>
            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-2xl text-sm font-medium flex items-center gap-2">
              <Icons.Utensils className="w-4 h-4" />
              美食家
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            本月你在<span className="font-semibold text-gray-900 dark:text-white">餐饮美食</span>上的支出占比最高，且多在夜间产生消费。建议适当控制夜宵支出哦。
          </p>
        </motion.div>
      </div>
    </div>
  );
}
