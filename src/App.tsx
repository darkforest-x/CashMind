import { useCallback, useEffect, useState, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Transaction } from './types';
import { useCashMindData } from './hooks/useCashMindData';
import { useSetupAuthorization } from './hooks/useSetupAuthorization';
import AppChrome, { type AppTab, type DrawerAction } from './components/AppChrome';
import DrawerInfoSheet from './components/DrawerInfoSheet';

const Home = lazy(() => import('./components/Home'));
const Add = lazy(() => import('./components/Add'));
const Stats = lazy(() => import('./components/Stats'));
const Settings = lazy(() => import('./components/Settings'));
const Login = lazy(() => import('./components/Login'));

type DrawerPanel = Exclude<DrawerAction, 'settings'>;

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [showLogin, setShowLogin] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel | null>(null);
  const {
    transactions,
    budgets,
    isLoading,
    user,
    isApiBackend,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudgets,
  } = useCashMindData();
  const canUseApp = isApiBackend || Boolean(user);

  const goToTab = (tab: AppTab) => {
    setEditingTransaction(null);
    setActiveTab(tab);
  };

  const handleSetupAuthorized = useCallback(() => {
    setEditingTransaction(null);
    setShowLogin(false);
    setActiveTab('home');
  }, []);

  useSetupAuthorization(handleSetupAuthorized);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('gqh_dark_mode');
    const useDark = savedDarkMode === null ? true : savedDarkMode === 'true';
    document.documentElement.classList.toggle('dark', useDark);
  }, []);

  const handleAddTransaction = async (transaction: Transaction) => {
    const saved = await addTransaction(transaction);
    if (saved) setActiveTab('home');
  };

  const handleUpdateTransaction = async (transaction: Transaction) => {
    const saved = await updateTransaction(transaction);
    if (saved) {
      setEditingTransaction(null);
      setActiveTab('home');
    }
  };

  const handleEditRequest = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setActiveTab('add');
  };

  const handleDrawerAction = (action: DrawerAction) => {
    setActionMenuOpen(false);
    if (action === 'settings') {
      setDrawerPanel(null);
      setActiveTab('settings');
      return;
    }
    setDrawerPanel(action);
  };

  const handleAutomationRequest = () => {
    if (!isApiBackend && !user) {
      setShowLogin(true);
      return;
    }
    setActiveTab('settings');
  };

  const renderContent = () => {
    if (showLogin && !user) {
      return (
        <div className="relative z-50 h-full w-full bg-black">
          <Login
            isApiBackend={isApiBackend}
            onBack={() => setShowLogin(false)}
            onSelfHostedAuthorized={handleSetupAuthorized}
          />
        </div>
      );
    }

    if (activeTab === 'home') {
      return (
        <Home
          transactions={transactions}
          onDelete={deleteTransaction}
          onEdit={handleEditRequest}
          budgets={budgets}
          user={user}
          backendMode={isApiBackend}
          onLoginRequest={() => setShowLogin(true)}
          onAutomationRequest={handleAutomationRequest}
          searchQuery={searchQuery}
        />
      );
    }
    if (activeTab === 'add') {
      return (
        <Add
          onAdd={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          initialData={editingTransaction}
          onCancelEdit={() => {
            setEditingTransaction(null);
            setActiveTab('home');
          }}
        />
      );
    }
    if (activeTab === 'stats') {
      return <Stats transactions={transactions} budgets={budgets} />;
    }
    return <Settings transactions={transactions} budgets={budgets} onUpdateBudgets={updateBudgets} />;
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
      <div className="cm-phone relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-black sm:h-[850px] sm:rounded-[3.25rem] sm:border-[8px] sm:border-zinc-950 sm:shadow-2xl">
        <main className="relative z-10 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="grid h-full place-items-center">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--cm-purple)] border-t-transparent" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={showLogin ? 'login' : activeTab}
                initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="absolute inset-0 h-full w-full"
              >
                <Suspense
                  fallback={
                    <div className="grid h-full place-items-center">
                      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[var(--cm-purple)] border-t-transparent" />
                    </div>
                  }
                >
                  {renderContent()}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          )}
        </main>
        {!showLogin && (
          <AppChrome
            activeTab={activeTab}
            canUseApp={canUseApp}
            drawerOpen={drawerOpen}
            actionMenuOpen={actionMenuOpen}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onTabChange={goToTab}
            onDrawerChange={setDrawerOpen}
            onActionMenuChange={setActionMenuOpen}
            onDrawerAction={handleDrawerAction}
          />
        )}
        <DrawerInfoSheet
          panel={drawerPanel}
          transactions={transactions}
          isApiBackend={isApiBackend}
          onClose={() => setDrawerPanel(null)}
        />
      </div>
    </div>
  );
}
