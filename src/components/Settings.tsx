import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { format } from 'date-fns';
import type { Budget, Currency, Transaction } from '../types';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import ShortcutAutomationCard from './ShortcutAutomationCard';

type SettingsProps = {
  readonly transactions?: readonly Transaction[];
  readonly budgets?: readonly Budget[];
  readonly onUpdateBudgets?: (budgets: Budget[]) => Promise<void> | void;
};

type Sheet = 'tutorial' | 'privacy' | 'pwa' | 'budget' | 'currency' | null;

const CURRENCIES: readonly Currency[] = ['CNY', 'USD', 'EUR', 'JPY'];

function getSourceLabel(source: Transaction['source']) {
  if (source === 'manual') return '手动';
  if (source === 'wallet') return 'Wallet';
  if (source === 'sms') return '短信';
  if (source === 'email') return '邮件';
  if (source === 'ocr') return 'OCR';
  if (source === 'import') return '导入';
  return '快捷指令';
}

function readDefaultCurrency(): Currency {
  const saved = localStorage.getItem('gqh_default_currency');
  return CURRENCIES.find((currency) => currency === saved) || 'CNY';
}

export default function Settings({ transactions = [], budgets = [], onUpdateBudgets }: SettingsProps) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(readDefaultCurrency);
  const { showToast } = useToast();

  useEffect(() => {
    localStorage.setItem('gqh_default_currency', defaultCurrency);
  }, [defaultCurrency]);

  const handleExport = () => {
    try {
      const rows = transactions.filter((transaction) => transaction.date.startsWith(exportMonth));
      if (rows.length === 0) {
        showToast(`${exportMonth} 没有账单数据可导出`, 'info');
        return;
      }
      const headers = ['ID', '金额', '币种', '类型', '分类', '日期', '备注', '来源'];
      const csvRows = [headers.join(',')];
      for (const transaction of rows) {
        csvRows.push([
          transaction.id,
          transaction.amount,
          transaction.currency,
          transaction.type === 'expense' ? '支出' : '收入',
          transaction.category,
          transaction.date,
          `"${(transaction.note || '').replace(/"/g, '""')}"`,
          getSourceLabel(transaction.source),
        ].join(','));
      }
      const encodedUri = encodeURI(`data:text/csv;charset=utf-8,\uFEFF${csvRows.join('\n')}`);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `CashMind_${exportMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('导出成功', 'success');
    } catch (error) {
      console.error('Export failed:', error instanceof Error ? error.message : String(error));
      showToast('导出失败，请重试', 'error');
    }
  };

  const openBudgetSheet = () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const currentBudget = budgets.find((budget) => budget.month === currentMonth);
    setBudgetAmount(currentBudget ? String(currentBudget.amount) : '');
    setSheet('budget');
  };

  const handleSaveBudget = async () => {
    const amount = Number.parseFloat(budgetAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('请输入有效的预算金额', 'error');
      return;
    }
    if (!onUpdateBudgets) {
      showToast('预算同步尚未就绪', 'error');
      return;
    }
    try {
      const currentMonth = format(new Date(), 'yyyy-MM');
      const currentBudget = budgets.find((budget) => budget.month === currentMonth);
      await onUpdateBudgets([{ id: currentBudget?.id || currentMonth, amount, month: currentMonth }, ...budgets.filter((budget) => budget.month !== currentMonth)]);
      showToast('预算设置成功', 'success');
      setSheet(null);
    } catch (error) {
      console.error('Budget save failed:', error instanceof Error ? error.message : String(error));
      showToast('预算设置失败，请检查服务状态', 'error');
    }
  };

  const rows = [
    { title: '本月预算设置', detail: '控制本月消费节奏', icon: Icons.Target, action: openBudgetSheet },
    { title: '默认币种', detail: defaultCurrency, icon: Icons.Coins, action: () => setSheet('currency') },
    { title: '添加到主屏幕', detail: '浏览器端 PWA', icon: Icons.Smartphone, action: () => setSheet('pwa') },
    { title: '导出 CSV 账单', detail: exportMonth, icon: Icons.FileSpreadsheet, action: handleExport },
    { title: '用户协议与隐私', detail: '自托管数据说明', icon: Icons.Shield, action: () => setSheet('privacy') },
  ];

  return (
    <div className="h-full overflow-y-auto px-7 pb-32 pt-36 text-white cm-scrollbar">
      <section>
        <h1 className="text-[30px] font-black">自动化</h1>
        <p className="mt-2 text-[15px] text-[var(--cm-text-soft)]">复制配置包，快捷指令不用手拼 Header。</p>
      </section>

      <div className="mt-6">
        <ShortcutAutomationCard onOpenGuide={() => setSheet('tutorial')} />
      </div>

      <section className="mt-6">
        <div className="space-y-3">
          <label className="cm-action-row flex items-center justify-between rounded-[24px] p-4">
            <span>
              <span className="block text-xs font-bold text-[var(--cm-text-soft)]">导出月份</span>
              <input type="month" value={exportMonth} onChange={(event) => setExportMonth(event.target.value)} className="mt-2 w-full bg-transparent text-base font-bold outline-none" />
            </span>
            <span className="cm-status-pill rounded-full px-3 py-1 text-xs font-bold text-[var(--cm-purple)]">CSV</span>
          </label>
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <button key={row.title} type="button" onClick={row.action} className="cm-action-row cm-press flex w-full items-center gap-4 rounded-[24px] p-4 text-left">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-black">
                  <Icon className="h-5 w-5 text-[var(--cm-purple)]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{row.title}</span>
                  <span className="mt-1 block text-sm text-[var(--cm-text-soft)]">{row.detail}</span>
                </span>
                <Icons.ChevronRight className="h-5 w-5 text-[var(--cm-text-muted)]" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <div className="cm-card rounded-[28px] p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-[24px] bg-[var(--cm-purple)] text-black">
            <Icons.Wallet className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-black">CashMind</h2>
          <p className="mt-1 text-sm text-[var(--cm-text-soft)]">Version 1.0.0 · Phantom style</p>
        </div>
      </section>

      {sheet && typeof document !== 'undefined' ? createPortal(
      <AnimatePresence>
        {sheet && (
          <>
            <motion.button className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm" aria-label="关闭设置弹层" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)} />
            <motion.div className="cm-sheet fixed bottom-0 left-1/2 z-[91] max-h-[82vh] w-full max-w-md -translate-x-1/2 overflow-y-auto rounded-t-[36px] p-7 pb-[calc(env(safe-area-inset-bottom)+28px)] cm-scrollbar" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}>
              <div className="mb-5 flex items-center justify-between">
                <span className="h-1.5 w-12 rounded-full bg-white/25" />
                <button type="button" onClick={() => setSheet(null)} className="cm-chip grid h-11 w-11 place-items-center rounded-full" aria-label="关闭">
                  <Icons.X className="h-5 w-5" />
                </button>
              </div>
              {sheet === 'tutorial' && <TutorialContent />}
              {sheet === 'privacy' && <PrivacyContent />}
              {sheet === 'pwa' && <PwaContent />}
              {sheet === 'budget' && (
                <div>
                  <h2 className="text-2xl font-black">本月预算</h2>
                  <input type="number" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} placeholder="例如 5000" className="cm-input mt-5 h-14 w-full rounded-[22px] px-5" />
                  <button type="button" onClick={handleSaveBudget} className="cm-primary mt-4 h-14 w-full rounded-[22px] font-black">保存设置</button>
                </div>
              )}
              {sheet === 'currency' && (
                <div>
                  <h2 className="text-2xl font-black">默认币种</h2>
                  <div className="mt-5 space-y-2">
                    {CURRENCIES.map((currency) => (
                      <button
                        key={currency}
                        type="button"
                        onClick={() => {
                          setDefaultCurrency(currency);
                          setSheet(null);
                          showToast(`默认币种已切换为 ${currency}`, 'success');
                        }}
                        className={cn('cm-action-row cm-press flex h-14 w-full items-center justify-between rounded-[22px] px-5 font-bold', defaultCurrency === currency && 'bg-[var(--cm-purple)] text-black')}
                      >
                        {currency}
                        {defaultCurrency === currency && <Icons.Check className="h-5 w-5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body) : null}
    </div>
  );
}

function TutorialContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-[var(--cm-text-soft)]">
      <h2 className="text-2xl font-black text-white">三步配置</h2>
      <p className="cm-card rounded-[22px] p-4">1. 用设置链接授权浏览器，然后复制完整配置包。</p>
      <p className="cm-card rounded-[22px] p-4">2. 在 iPhone 快捷指令里新建 Wallet、短信或 OCR 自动化，只保留“获取 URL 内容”。</p>
      <p className="cm-card rounded-[22px] p-4">3. 粘贴万能入口和 JSON 模板，回到 CashMind 点“自检写入”。</p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-[var(--cm-text-soft)]">
      <h2 className="text-2xl font-black text-white">隐私说明</h2>
      <p>CashMind 1.0 是个人 VPS 自托管工具，账单数据存储在你的服务器或浏览器中。</p>
      <p>App 访问密钥用于读取和编辑，快捷指令密钥只允许写入。密钥泄露后请在 VPS 的 .env 中轮换。</p>
      <p>AI 解析需要调用配置的模型服务；如未配置或不可用，会使用本地规则兜底。</p>
    </div>
  );
}

function PwaContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-[var(--cm-text-soft)]">
      <h2 className="text-2xl font-black text-white">添加到主屏幕</h2>
      <p>iOS Safari 点击分享按钮，选择“添加到主屏幕”。Android Chrome 点击右上角菜单，选择“添加到主屏幕”。</p>
      <p className="cm-card rounded-[22px] p-4">当前公网地址仍是 HTTP。绑定域名并开启 HTTPS 后，PWA 安装体验会更稳定。</p>
    </div>
  );
}
