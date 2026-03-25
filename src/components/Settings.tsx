import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [activeModal, setActiveModal] = useState<'tutorial' | 'privacy' | 'appstore' | null>(null);
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('gqh_api_token');
    if (saved) return saved;
    const newToken = 'gqh_sk_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('gqh_api_token', newToken);
    return newToken;
  });

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

  const handleCopy = () => {
    navigator.clipboard.writeText(token);
    alert('Token 已复制到剪贴板');
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      
      if (!data || data.length === 0) {
        alert('没有账单数据可导出');
        return;
      }

      const headers = ['ID', '金额', '类型', '分类', '日期', '备注', '来源'];
      const csvRows = [headers.join(',')];
      
      for (const t of data) {
        const row = [
          t.id,
          t.amount,
          t.type === 'expense' ? '支出' : '收入',
          t.category,
          t.date,
          `"${(t.note || '').replace(/"/g, '""')}"`,
          t.source === 'manual' ? '手动' : '快捷指令'
        ];
        csvRows.push(row.join(','));
      }
      
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `管钱花账单_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
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
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                API Token
              </label>
              <div className="flex bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl p-1 border border-white/40 dark:border-white/10 shadow-inner">
                <input
                  type="text"
                  value={token}
                  readOnly
                  className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-gray-600 dark:text-gray-300 focus:ring-0 focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="bg-white/80 dark:bg-white/20 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-medium shadow-sm border border-white/40 dark:border-white/10 hover:bg-white dark:hover:bg-white/30 transition-colors"
                >
                  复制
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                请勿泄露此 Token，它用于验证快捷指令的写入权限。
              </p>
            </div>

            <div className="pt-4 border-t border-black/5 dark:border-white/10">
              <button 
                onClick={() => setActiveModal('tutorial')}
                className="w-full flex items-center justify-between p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-2xl font-medium transition-colors hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30"
              >
                <span className="flex items-center gap-2">
                  <Icons.Download className="w-4 h-4" />
                  下载官方快捷指令
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
                    <p>1. 打开 iOS 快捷指令 App，新建一个快捷指令。</p>
                    <p>2. 添加操作：<strong>获取 URL 内容</strong>。</p>
                    <p>3. URL 设置为：<br/><code className="bg-gray-100 dark:bg-zinc-800 p-1.5 rounded block mt-1 break-all select-all">{window.location.origin}/api/transactions</code></p>
                    <p>4. 方法选择：<strong>POST</strong></p>
                    <p>5. 头部 (Headers) 添加：<br/>
                      <span className="inline-block mt-1 bg-gray-100 dark:bg-zinc-800 p-1.5 rounded">
                        键: <code>Authorization</code><br/>
                        值: <code>Bearer {token}</code>
                      </span>
                    </p>
                    <p>6. 请求体 (Body) 选择 JSON，并添加以下字段：</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code>amount</code>: 金额 (数字)</li>
                      <li><code>type</code>: expense 或 income</li>
                      <li><code>category</code>: 分类ID (如 coffee, food)</li>
                      <li><code>note</code>: 备注 (文本)</li>
                      <li><code>source</code>: shortcut</li>
                    </ul>
                    <a href="https://www.icloud.com/shortcuts/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-3 mt-6 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors">
                      <Icons.Download className="w-4 h-4" />
                      获取示例快捷指令
                    </a>
                  </div>
                )}

                {activeModal === 'privacy' && (
                  <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>欢迎使用“管钱花”记账应用。本应用尊重并保护所有使用服务用户的个人隐私权。</p>
                    <h4 className="font-medium text-gray-900 dark:text-white mt-4">1. 信息收集与存储</h4>
                    <p>本应用作为本地/个人服务器部署的工具，所有账单数据均存储在您的服务器或本地浏览器中。我们不会将您的财务数据上传至任何第三方商业服务器。</p>
                    <h4 className="font-medium text-gray-900 dark:text-white mt-4">2. API Token 使用</h4>
                    <p>应用生成的 API Token 仅用于验证您本人的快捷指令请求，请妥善保管。如发生泄露，请在设置中重置 Token。</p>
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
