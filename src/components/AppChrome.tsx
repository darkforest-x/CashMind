import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  CircleDollarSign,
  Clock3,
  LifeBuoy,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  User,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type AppTab = 'home' | 'add' | 'stats' | 'settings';
export type DrawerAction = 'profile' | 'history' | 'settings' | 'help';

type AppChromeProps = {
  readonly activeTab: AppTab;
  readonly canUseApp: boolean;
  readonly drawerOpen: boolean;
  readonly actionMenuOpen: boolean;
  readonly searchQuery: string;
  readonly onSearchChange: (value: string) => void;
  readonly onTabChange: (tab: AppTab) => void;
  readonly onDrawerChange: (open: boolean) => void;
  readonly onActionMenuChange: (open: boolean) => void;
  readonly onDrawerAction: (action: DrawerAction) => void;
};

type TabItem = {
  readonly id: AppTab;
  readonly label: string;
};

type ActionItem = {
  readonly label: string;
  readonly tab: AppTab;
  readonly icon: LucideIcon;
};

const TABS: readonly TabItem[] = [
  { id: 'home', label: '首页' },
  { id: 'add', label: '记账' },
  { id: 'stats', label: '洞察' },
  { id: 'settings', label: '自动化' },
];

const ACTIONS: readonly ActionItem[] = [
  { label: '手动补记', tab: 'add', icon: ReceiptText },
  { label: '自动化', tab: 'settings', icon: Zap },
  { label: '预算洞察', tab: 'stats', icon: CircleDollarSign },
  { label: '配置说明', tab: 'settings', icon: BookOpen },
];

const DRAWER_ITEMS = [
  { label: '个人资料', icon: User, action: 'profile' },
  { label: '历史记录', icon: Clock3, action: 'history' },
  { label: '设置', icon: Settings, action: 'settings' },
  { label: '帮助与支持', icon: LifeBuoy, action: 'help' },
] satisfies readonly { readonly label: string; readonly icon: LucideIcon; readonly action: DrawerAction }[];

export default function AppChrome({
  activeTab,
  canUseApp,
  drawerOpen,
  actionMenuOpen,
  searchQuery,
  onSearchChange,
  onTabChange,
  onDrawerChange,
  onActionMenuChange,
  onDrawerAction,
}: AppChromeProps) {
  const showBottomControls = canUseApp && (activeTab === 'home' || activeTab === 'stats');

  const activateTab = (tab: AppTab) => {
    onTabChange(tab);
    onActionMenuChange(false);
  };

  const activateDrawerAction = (action: DrawerAction) => {
    onDrawerChange(false);
    if (action === 'settings') {
      onTabChange('settings');
      return;
    }
    onDrawerAction(action);
  };

  return (
    <>
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 px-7 pt-[calc(env(safe-area-inset-top)+22px)]">
        <nav className="pointer-events-auto flex items-center gap-2 overflow-x-auto cm-scrollbar" aria-label="主要导航">
          <button
            type="button"
            onClick={() => onDrawerChange(true)}
            className="cm-press grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--cm-purple)] text-black"
            aria-label="打开账户菜单"
          >
            <Sparkles className="h-6 w-6" />
          </button>
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => activateTab(tab.id)}
                aria-current={selected ? 'page' : undefined}
                className={cn(
                  'cm-press h-11 shrink-0 rounded-full px-5 text-[15px] font-bold',
                  selected ? 'cm-chip-active' : 'cm-chip',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {showBottomControls && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex items-end gap-4 px-7 pb-[calc(env(safe-area-inset-bottom)+18px)]">
          <label className="cm-bottom-float pointer-events-auto flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full px-5">
            <Search className="h-5 w-5 shrink-0 text-[var(--cm-text-muted)]" />
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索 AI 管钱花"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-text-muted)]"
            />
          </label>
          <button
            type="button"
            onClick={() => onActionMenuChange(!actionMenuOpen)}
            className="cm-primary cm-press pointer-events-auto grid h-14 w-14 shrink-0 place-items-center rounded-full shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
            aria-label={actionMenuOpen ? '快捷操作已展开' : '打开快捷操作'}
          >
            {actionMenuOpen ? <X className="h-7 w-7" /> : <Plus className="h-8 w-8" />}
          </button>
        </div>
      )}

      <AnimatePresence>
        {actionMenuOpen && (
          <motion.div className="absolute inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              aria-label="关闭快捷操作遮罩"
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => onActionMenuChange(false)}
            />
            <div className="absolute bottom-[104px] right-7 space-y-5">
              {ACTIONS.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    type="button"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ delay: index * 0.035 }}
                    onClick={() => activateTab(action.tab)}
                    className="cm-press flex items-center justify-end gap-4 text-right text-2xl font-bold text-white"
                  >
                    <span>{action.label}</span>
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--cm-purple)] text-black">
                      <Icon className="h-6 w-6" />
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => onActionMenuChange(false)}
              className="cm-press absolute bottom-[calc(env(safe-area-inset-bottom)+18px)] right-7 grid h-14 w-14 place-items-center rounded-full bg-[var(--cm-card-raised)] text-white shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
              aria-label="关闭快捷菜单"
            >
              <X className="h-7 w-7" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="absolute inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              aria-label="关闭账户菜单"
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => onDrawerChange(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 top-0 w-[72%] rounded-r-[42px] bg-black px-8 pt-[calc(env(safe-area-inset-top)+86px)] text-white shadow-[28px_0_70px_rgba(0,0,0,0.55)]"
            >
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--cm-purple)] text-black">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="mt-7 text-3xl font-bold">@cashmind</h2>
              <button type="button" className="cm-press mt-9 flex items-center gap-3 text-xl font-semibold" onClick={() => activateDrawerAction('profile')}>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--cm-card)] text-sm">1</span>
                自动账本 1
              </button>
              <div className="mt-12 space-y-9">
                {DRAWER_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} type="button" className="cm-press flex items-center gap-6 text-[21px] text-white" onClick={() => activateDrawerAction(item.action)}>
                      <Icon className="h-6 w-6" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
