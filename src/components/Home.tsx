import React, { useState } from 'react';
import { Transaction, Category, Budget } from '../types';
import { MOCK_CATEGORIES } from '../data';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Car,
  CircleHelp,
  CloudOff,
  Coffee,
  Edit2,
  Gamepad2,
  HelpCircle,
  Home as HomeCategoryIcon,
  LogOut,
  Search,
  ShoppingBag,
  Trash2,
  User as UserIcon,
  UserCircle,
  Utensils,
  Wallet,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn, formatCurrency, getCurrencySymbol } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import type { User } from 'firebase/auth';

interface HomeProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
  onEdit?: (t: Transaction) => void;
  budgets?: Budget[];
  user?: User | null;
  backendMode?: boolean;
  onLogout?: () => void;
  onLoginRequest?: () => void;
}

const EXCHANGE_RATES: Record<string, number> = {
  CNY: 1,
  USD: 7.23,
  EUR: 7.75,
  JPY: 0.047,
};

function getSourceLabel(source: Transaction['source']) {
  if (source === 'manual') return '手动补记';
  if (source === 'wallet') return 'Wallet 自动';
  if (source === 'sms') return '短信自动';
  if (source === 'email') return '邮件自动';
  if (source === 'ocr') return 'OCR 自动';
  if (source === 'import') return '账单导入';
  return '快捷指令';
}

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

export default function Home({ transactions, onDelete, onEdit, budgets = [], user, backendMode = false, onLogout, onLoginRequest }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const currentMonth = format(new Date(), 'yyyy-MM');

  const handleUserClick = () => {
    if (user || backendMode) {
      setIsUserMenuOpen(!isUserMenuOpen);
    } else if (onLoginRequest) {
      onLoginRequest();
    }
  };
  const currentBudget = budgets.find(b => b.month === currentMonth)?.amount || 0;

  const toCNY = (amount: number, currency: string = 'CNY') => {
    return amount * (EXCHANGE_RATES[currency] || 1);
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + toCNY(t.amount, t.currency), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + toCNY(t.amount, t.currency), 0);
  const netBalance = totalIncome - totalExpense;

  const budgetProgress = currentBudget > 0 ? Math.min((totalExpense / currentBudget) * 100, 100) : 0;
  const isOverBudget = currentBudget > 0 && totalExpense > currentBudget;

  const getCategory = (id: string) => MOCK_CATEGORIES.find((c) => c.id === id) || MOCK_CATEGORIES[0];

  const filteredTransactions = transactions.filter((t) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const noteMatch = t.note?.toLowerCase().includes(query);
    const categoryMatch = getCategory(t.category).name.toLowerCase().includes(query);
    return noteMatch || categoryMatch;
  });

  const groupedTransactions = filteredTransactions.reduce((acc, t) => {
    const dateStr = t.date.split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-white pb-24 overflow-y-auto">
      {/* Header / Dashboard */}
      <div className="sticky top-0 px-6 pt-12 pb-8 bg-white/40 dark:bg-black/40 backdrop-blur-3xl saturate-200 rounded-b-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-b border-white/40 dark:border-white/10 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">本月收支</h1>
          <div className="relative">
            <button 
              onClick={handleUserClick}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center transition-transform active:scale-95 overflow-hidden border-2 border-white/20 dark:border-white/5"
            >
              {user?.photoURL && !backendMode ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
              ) : backendMode ? (
                <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            
            <AnimatePresence>
              {isUserMenuOpen && (user || backendMode) && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white/50 dark:bg-black/50 backdrop-blur-3xl saturate-200 border border-white/40 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] z-50 overflow-hidden"
                  >
                    <div className="py-2">
                      <div className="px-4 py-2 mb-1">
                        <p className="text-xs font-semibold truncate dark:text-white">{backendMode ? '自托管模式' : user?.displayName || '用户'}</p>
                        <p className="text-[10px] text-gray-500 truncate">{backendMode ? '个人服务数据源' : user?.email}</p>
                      </div>
                      <div className="h-px bg-black/5 dark:bg-white/10 mx-2 mb-1"></div>
                      <button className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm">
                        <UserCircle className="w-4 h-4" />
                        {backendMode ? '本机与 VPS 同步' : '个人中心'}
                      </button>
                      <div className="h-px bg-black/5 dark:bg-white/10 my-1 mx-2"></div>
                      <button 
                        onClick={onLogout}
                        className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm text-red-600 dark:text-red-400"
                      >
                        {backendMode ? <CloudOff className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                        {backendMode ? '自托管已连接' : '退出登录'}
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-8">
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">净结余 (¥)</span>
          <span className="text-5xl font-bold tracking-tighter">
            {netBalance >= 0 ? '+' : '-'}{Math.abs(netBalance).toFixed(2)}
          </span>
        </div>

        {currentBudget > 0 && (
          <div className="mb-8 px-2">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-500 dark:text-gray-400">本月预算</span>
              <span className={cn("font-medium", isOverBudget ? "text-red-500" : "text-gray-700 dark:text-gray-300")}>
                ¥{totalExpense.toFixed(2)} / ¥{currentBudget.toFixed(2)}
              </span>
            </div>
            <div className="h-2 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${budgetProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  isOverBudget ? "bg-red-500" : "bg-indigo-500 dark:bg-indigo-400"
                )}
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-white/30 dark:bg-white/5 backdrop-blur-xl saturate-200 rounded-2xl p-4 border border-white/40 dark:border-white/10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">总收入</div>
              <div className="font-semibold text-lg">{totalIncome.toFixed(2)}</div>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-200 dark:bg-zinc-700"></div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">总支出</div>
              <div className="font-semibold text-lg">{totalExpense.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 pt-6 pb-2 relative z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="搜索备注或分类..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 pt-4 relative z-10">
        <h2 className="text-lg font-semibold mb-4">近期流水</h2>
        <div className="space-y-6">
          {!backendMode && !user && transactions.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-12 px-8 bg-white/40 dark:bg-black/40 rounded-3xl border border-white/40 dark:border-white/10"
            >
              <CloudOff className="w-10 h-10 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-medium mb-1">未登录</h3>
              <p className="text-xs text-gray-500 mb-6">您的数据将同步到云端，登录后即可查看</p>
              <button 
                onClick={onLoginRequest}
                className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold"
              >
                立即登录
              </button>
            </motion.div>
          ) : sortedDates.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center text-gray-500 dark:text-gray-400 py-8"
            >
              {searchQuery.trim() ? '没有找到相关记录' : '暂无流水，下一笔交易会自动出现在这里'}
            </motion.div>
          ) : (
            sortedDates.map((dateStr, dateIndex) => {
              const date = parseISO(dateStr);
            const isTodayDate = isToday(date);
            const isYesterdayDate = isYesterday(date);
            const dateLabel = isTodayDate
              ? '今天'
              : isYesterdayDate
              ? '昨天'
              : format(date, 'MM月dd日', { locale: zhCN });

            const dayTotal = groupedTransactions[dateStr].reduce(
              (sum, t) => sum + toCNY(t.type === 'expense' ? -t.amount : t.amount, t.currency),
              0
            );

            return (
              <motion.div 
                key={dateStr} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dateIndex * 0.1, duration: 0.3 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{dateLabel}</span>
                  <span>{dayTotal < 0 ? '-' : '+'}{formatCurrency(Math.abs(dayTotal), 'CNY')}</span>
                </div>
                <div className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                  {groupedTransactions[dateStr].map((t, i) => {
                    const category = getCategory(t.category);
                    const IconComponent = CATEGORY_ICONS[category.icon] || HelpCircle;
                    const isLast = i === groupedTransactions[dateStr].length - 1;

                    return (
                      <motion.div 
                        key={t.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (dateIndex * 0.1) + (i * 0.05), duration: 0.2 }}
                        className="relative"
                      >
                        <div 
                          className="flex items-center p-3 gap-4 hover:bg-white/50 dark:hover:bg-white/10 rounded-2xl transition-colors cursor-pointer"
                          onClick={() => setSelectedTx(t)}
                        >
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: category.color }}
                          >
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-medium truncate">{t.note || category.name}</span>
                              <span
                                className={cn(
                                  "font-semibold whitespace-nowrap ml-2",
                                  t.type === 'expense' ? 'text-gray-900 dark:text-white' : 'text-green-600 dark:text-green-400'
                                )}
                              >
                                {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount, t.currency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{format(parseISO(t.date), 'HH:mm')}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                              <span className="flex items-center gap-1">
                                {t.source === 'manual' ? (
                                  <><Edit2 className="w-3 h-3" /> 手动补记</>
                                ) : (
                                  <><Zap className="w-3 h-3" /> {getSourceLabel(t.source)}</>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        {!isLast && (
                          <div className="absolute bottom-0 right-0 left-16 h-px bg-black/5 dark:bg-white/10"></div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          }))}
        </div>
      </div>

      {/* Transaction Bottom Sheet Menu */}
      <AnimatePresence>
        {selectedTx && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
              onClick={() => setSelectedTx(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 bg-white/50 dark:bg-black/50 backdrop-blur-3xl saturate-200 rounded-t-[2.5rem] border-t border-white/40 dark:border-white/10 z-50 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.1)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.4)]"
            >
              <div className="p-6 pb-10">
                <div className="w-12 h-1.5 bg-black/10 dark:bg-white/20 rounded-full mx-auto mb-6"></div>
                <h3 className="text-xl font-semibold text-center mb-6">
                  {selectedTx.note || getCategory(selectedTx.category).name}
                  <span className="block text-sm font-normal text-gray-500 mt-1">
                    {selectedTx.type === 'expense' ? '-' : '+'}{formatCurrency(selectedTx.amount, selectedTx.currency)}
                  </span>
                </h3>
                <div className="space-y-3">
                  <button 
                    className="w-full py-3.5 bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 border border-white/40 dark:border-white/5 shadow-sm"
                    onClick={() => {
                      if (onEdit) onEdit(selectedTx);
                      setSelectedTx(null);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                    编辑记录
                  </button>
                  <button 
                    className="w-full py-3.5 bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 border border-red-500/20 shadow-sm"
                    onClick={() => {
                      if (onDelete) onDelete(selectedTx.id);
                      setSelectedTx(null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    删除记录
                  </button>
                  <button 
                    className="w-full py-3.5 bg-transparent text-gray-600 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-2xl font-medium transition-colors"
                    onClick={() => setSelectedTx(null)}
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
