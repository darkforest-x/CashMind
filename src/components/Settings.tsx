import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Budget, Currency, Transaction } from '../types';
import { useToast } from './Toast';
import { format } from 'date-fns';
import { getApiUrl } from '../lib/api';
import { useCashMindTokens } from '../hooks/useCashMindTokens';
import TokenInput from './TokenInput';

interface SettingsProps {
  transactions?: Transaction[];
  budgets?: Budget[];
  onUpdateBudgets?: (budgets: Budget[]) => Promise<void> | void;
}

function getSourceLabel(source: Transaction['source']) {
  if (source === 'manual') return '手动';
  if (source === 'wallet') return 'Wallet';
  if (source === 'sms') return '短信';
  if (source === 'email') return '邮件';
  if (source === 'ocr') return 'OCR';
  if (source === 'import') return '导入';
  return '快捷指令';
}

export default function Settings({ transactions = [], budgets = [], onUpdateBudgets }: SettingsProps) {
  const [activeModal, setActiveModal] = useState<'tutorial' | 'privacy' | 'appstore' | 'budget' | 'currency' | null>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { showToast } = useToast();
  const {
    appAccessToken,
    setAppAccessToken,
    appTokenStatusText,
    saveAppAccessToken,
    shortcutToken,
    setShortcutToken,
    shortcutTokenStatusText,
    saveShortcutToken,
    copyShortcutToken,
  } = useCashMindTokens();
  const walletIngestUrl = getApiUrl('/api/ingest/wallet');
  const textIngestUrl = getApiUrl('/api/ingest/text');

  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(() => {
    return (localStorage.getItem('gqh_default_currency') as Currency) || 'CNY';
  });

  useEffect(() => {
    localStorage.setItem('gqh_default_currency', defaultCurrency);
  }, [defaultCurrency]);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('gqh_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('gqh_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleExport = async () => {
    try {
      const data = transactions.filter((t) => t.date.startsWith(exportMonth));
      
      if (data.length === 0) {
        showToast(`${exportMonth} 没有账单数据可导出`, 'info');
        return;
      }

      const headers = ['ID', '金额', '币种', '类型', '分类', '日期', '备注', '来源'];
      const csvRows = [headers.join(',')];
      
      for (const t of data) {
        const row = [
          t.id,
          t.amount,
          t.currency || 'CNY',
          t.type === 'expense' ? '支出' : '收入',
          t.category,
          t.date,
          `"${(t.note || '').replace(/"/g, '""')}"`,
          getSourceLabel(t.source)
        ];
        csvRows.push(row.join(','));
      }
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `管钱花账单_${exportMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('导出成功', 'success');
    } catch (err) {
      console.error('导出失败:', err);
      showToast('导出失败，请重试', 'error');
    }
  };

  const handleSaveBudget = async () => {
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('请输入有效的预算金额', 'error');
      return;
    }

    const currentMonth = format(new Date(), 'yyyy-MM');
    try {
      if (!onUpdateBudgets) {
        showToast('预算同步尚未就绪', 'error');
        return;
      }
      const currentBudget = budgets.find(b => b.month === currentMonth);
      const newBudget: Budget = {
        id: currentBudget?.id || currentMonth,
        amount,
        month: currentMonth,
      };
      const updatedBudgets = [newBudget, ...budgets.filter(b => b.month !== currentMonth)];
      await onUpdateBudgets(updatedBudgets);
      showToast('预算设置成功', 'success');
      setActiveModal(null);
    } catch (error) {
      console.error('Failed to save budget:', error);
      showToast('预算设置失败，请检查登录或网络状态', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-white pb-24 overflow-y-auto">
      <div className="sticky top-0 px-6 pt-12 pb-6 bg-white/40 dark:bg-black/40 backdrop-blur-3xl saturate-200 border-b border-white/40 dark:border-white/10 z-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <h1 className="text-2xl font-semibold tracking-tight">设置</h1>
      </div>

      <div className="px-6 pt-6 pb-6 relative z-10">
        {/* Shortcuts Integration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Icons.Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold">自动化引擎</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">配置 iOS 快捷指令实现无感记账</p>
            </div>
          </div>

          <div className="space-y-4">
            <TokenInput
              label="App 访问 Token"
              value={appAccessToken}
              onChange={setAppAccessToken}
              onSave={saveAppAccessToken}
              placeholder="粘贴 VPS .env 里的 APP_ACCESS_TOKEN"
              statusText={appTokenStatusText}
            />

            <TokenInput
              label="快捷指令 Token"
              value={shortcutToken}
              onChange={setShortcutToken}
              onSave={saveShortcutToken}
              onCopy={copyShortcutToken}
              placeholder="粘贴 VPS .env 里的 SHORTCUT_TOKEN"
              statusText={shortcutTokenStatusText}
            />

            <div className="pt-4 border-t border-black/5 dark:border-white/10">
              <button 
                onClick={() => setActiveModal('tutorial')}
                className="w-full flex items-center justify-between p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-2xl font-medium transition-colors hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30"
              >
                <span className="flex items-center gap-2">
                  <Icons.Download className="w-4 h-4" />
                  配置无感记账
                </span>
                <Icons.ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div>
              <button 
                onClick={() => setActiveModal('tutorial')}
                className="w-full flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-2xl font-medium transition-colors hover:bg-white/80 dark:hover:bg-white/10 mt-2"
              >
                <span className="flex items-center gap-2">
                  <Icons.BookOpen className="w-4 h-4" />
                  查看配置教程
                </span>
                <Icons.ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* General Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
        >
          <button
            onClick={() => {
              const currentMonth = format(new Date(), 'yyyy-MM');
              const currentBudget = budgets.find(b => b.month === currentMonth);
              setBudgetAmount(currentBudget ? currentBudget.amount.toString() : '');
              setActiveModal('budget');
            }}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/50 dark:hover:bg-white/10 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center">
                <Icons.Target className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="font-medium">本月预算设置</span>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <div className="h-px bg-black/5 dark:bg-white/10 mx-4"></div>

          <button
            onClick={() => setActiveModal('currency')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/50 dark:hover:bg-white/10 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center">
                <Icons.Coins className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <span className="font-medium">默认币种</span>
                <p className="text-[10px] text-gray-500">{defaultCurrency}</p>
              </div>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          <div className="h-px bg-black/5 dark:bg-white/10 mx-4"></div>

          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center">
                <Icons.Moon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="font-medium">深色模式</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                darkMode ? "bg-indigo-500" : "bg-gray-200 dark:bg-zinc-700"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
                  darkMode ? "translate-x-6" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="h-px bg-black/5 dark:bg-white/10 mx-4"></div>

          <div className="p-4 bg-white/10 dark:bg-black/20 rounded-2xl mx-4 mb-4 border border-white/20 dark:border-white/5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">导出月份</label>
            <input 
              type="month" 
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 p-0 w-full"
            />
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/50 dark:hover:bg-white/10 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center">
                <Icons.FileSpreadsheet className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="font-medium">导出 CSV 账单</span>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </motion.div>

        {/* About App */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] mt-6"
        >
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Icons.Wallet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-lg font-semibold">管钱花</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Version 1.0.0</p>
          </div>
          
          <div className="h-px bg-black/5 dark:bg-white/10 mx-4"></div>

          <button 
            onClick={() => setActiveModal('appstore')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/50 dark:hover:bg-white/10 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center">
                <Icons.Star className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="font-medium">去 App Store 评分</span>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          
          <div className="h-px bg-black/5 dark:bg-white/10 mx-4"></div>

          <button 
            onClick={() => setActiveModal('privacy')}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-white/50 dark:hover:bg-white/10 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-white/10 flex items-center justify-center">
                <Icons.Shield className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="font-medium">用户协议与隐私政策</span>
            </div>
            <Icons.ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </motion.div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeModal === 'tutorial' && '快捷指令配置教程'}
                  {activeModal === 'privacy' && '用户协议与隐私政策'}
                  {activeModal === 'appstore' && '添加到主屏幕'}
                  {activeModal === 'currency' && '选择默认币种'}
                </h3>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Icons.X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                {activeModal === 'tutorial' && (
                  <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/80 dark:bg-indigo-950/20 p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">通用请求头</p>
                      <p className="mt-2">所有自动化都使用 <strong>获取 URL 内容</strong>，方法选择 <strong>POST</strong>。</p>
                      <span className="inline-block mt-1 bg-gray-100 dark:bg-zinc-800 p-1.5 rounded">
                        键: <code>Authorization</code><br/>
                        值: <code>Bearer {shortcutToken.trim() || '你保存的快捷指令 Token'}</code>
                      </span>
                    </div>

                    <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">1. Wallet / Apple Pay 全自动</p>
                      <p className="mt-2">自动化触发器选择 <strong>交易 / Wallet</strong>，选择要监听的卡，运行方式选择立即运行。</p>
                      <code className="bg-white dark:bg-zinc-900 p-1.5 rounded block mt-2 break-all select-all">
                        {walletIngestUrl || '请在原生端配置 VITE_API_BASE_URL'}
                      </code>
                      <p className="mt-2">JSON Body：</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><code>amount</code>: Shortcut Input 的 Amount</li>
                        <li><code>merchant</code>: Shortcut Input 的 Merchant 或 Name</li>
                        <li><code>currency</code>: CNY</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">2. 短信 / 邮件自动解析</p>
                      <p className="mt-2">触发器选择收到信息或收到邮件，筛选银行、账单或支付关键词。</p>
                      <code className="bg-white dark:bg-zinc-900 p-1.5 rounded block mt-2 break-all select-all">
                        {textIngestUrl || '请在原生端配置 VITE_API_BASE_URL'}
                      </code>
                      <p className="mt-2">JSON Body：</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><code>text</code>: 短信或邮件正文</li>
                        <li><code>source</code>: sms 或 email</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-4">
                      <p className="font-semibold text-gray-900 dark:text-white">3. 截图 OCR 兜底</p>
                      <p className="mt-2">快捷指令执行截图，提取图片文字，再把文字发到同一个文本导入接口。</p>
                      <ul className="list-disc pl-5 space-y-1 mt-2">
                        <li><code>text</code>: 提取出的文字</li>
                        <li><code>source</code>: ocr</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeModal === 'privacy' && (
                  <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>欢迎使用“管钱花”记账应用。本应用尊重并保护所有使用服务用户的个人隐私权。</p>
                    <h4 className="font-medium text-gray-900 dark:text-white mt-4">1. 信息收集与存储</h4>
                    <p>本应用作为本地/个人服务器部署的工具，所有账单数据均存储在您的服务器或本地浏览器中。我们不会将您的财务数据上传至任何第三方商业服务器。</p>
                    <h4 className="font-medium text-gray-900 dark:text-white mt-4">2. API Token 使用</h4>
                    <p>App 访问 Token 用于保护账单读取和编辑接口，快捷指令 Token 仅用于验证自动化写入请求。正式部署后应用不会通过公网接口展示完整 Token，如发生泄露，请在 VPS 的 .env 中更换对应 Token。</p>
                    <h4 className="font-medium text-gray-900 dark:text-white mt-4">3. 免责声明</h4>
                    <p>本应用按“原样”提供，不对数据的绝对安全性做任何明示或暗示的保证。建议您定期使用“导出 CSV”功能备份数据。</p>
                  </div>
                )}

                {activeModal === 'appstore' && (
                  <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 text-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icons.Share className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p>“管钱花”是一款支持 PWA 的现代 Web 应用。您无需前往 App Store 下载，只需将其添加到主屏幕即可获得原生 App 般的体验。</p>
                    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-4 text-left mt-4 border border-gray-100 dark:border-zinc-700">
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Icons.Apple className="w-4 h-4" /> iOS Safari:
                      </p>
                      <p className="mt-1 text-xs">点击底部栏的 <Icons.Share className="inline w-3 h-3 mx-0.5"/> 分享图标，然后选择“添加到主屏幕”。</p>
                      <div className="h-px bg-gray-200 dark:bg-zinc-700 my-3"></div>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Icons.Smartphone className="w-4 h-4" /> Android Chrome:
                      </p>
                      <p className="mt-1 text-xs">点击右上角菜单，选择“添加到主屏幕”。</p>
                    </div>
                  </div>
                )}

                {activeModal === 'budget' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        预算金额 (¥)
                      </label>
                      <input
                        type="number"
                        value={budgetAmount}
                        onChange={(e) => setBudgetAmount(e.target.value)}
                        placeholder="例如: 5000"
                        className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveBudget}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                    >
                      保存设置
                    </button>
                  </div>
                )}

                {activeModal === 'currency' && (
                  <div className="space-y-2">
                    {(['CNY', 'USD', 'EUR', 'JPY'] as Currency[]).map(curr => (
                      <button
                        key={curr}
                        onClick={() => {
                          setDefaultCurrency(curr);
                          setActiveModal(null);
                          showToast(`默认币种已切换为 ${curr}`, 'success');
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                          defaultCurrency === curr 
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                            : "border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        <span className="font-semibold">{curr}</span>
                        {defaultCurrency === curr && <Icons.Check className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
