import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Home as HomeIcon, Lock, PieChart, PlusCircle, Settings as SettingsIcon } from 'lucide-react';
import type { Transaction } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useCashMindData } from './hooks/useCashMindData';

const Home = lazy(() => import('./components/Home'));
const Add = lazy(() => import('./components/Add'));
const Stats = lazy(() => import('./components/Stats'));
const Settings = lazy(() => import('./components/Settings'));
const Login = lazy(() => import('./components/Login'));

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showLogin, setShowLogin] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
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
    logoutUser,
  } = useCashMindData();
  const canUseApp = isApiBackend || Boolean(user);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('gqh_dark_mode');
    const isDark = savedDarkMode !== null ? savedDarkMode === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const handleAddTransaction = async (t: Transaction) => {
    const saved = await addTransaction(t);
    if (saved) {
      setActiveTab('home');
    }
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    const saved = await updateTransaction(t);
    if (saved) {
      setEditingTransaction(null);
      setActiveTab('home');
    }
  };

  const handleEditRequest = (t: Transaction) => {
    setEditingTransaction(t);
    setActiveTab('add');
  };

  const renderContent = () => {
    if (showLogin && !user) {
      return (
        <div className="h-full w-full bg-white dark:bg-black relative z-50">
          <Login onBack={() => setShowLogin(false)} />
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return <Home transactions={transactions} onDelete={deleteTransaction} onEdit={handleEditRequest} budgets={budgets} user={user} backendMode={isApiBackend} onLogout={logoutUser} onLoginRequest={() => setShowLogin(true)} />;
      case 'add':
        if (!canUseApp) {
          return (
            <div className="flex flex-col items-center justify-center h-full px-8 text-center pb-20">
              <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold mb-2">需要登录</h2>
              <p className="text-sm text-gray-500 mb-6">登录后即可同步您的每一笔账单</p>
              <button 
                onClick={() => setShowLogin(true)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-medium"
              >
                立即登录
              </button>
            </div>
          );
        }
        return <Add onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} initialData={editingTransaction} onCancelEdit={() => { setEditingTransaction(null); setActiveTab('home'); }} />;
      case 'stats':
        return <Stats transactions={transactions} budgets={budgets} />;
      case 'settings':
        return <Settings transactions={transactions} budgets={budgets} onUpdateBudgets={updateBudgets} />;
      default:
        return <Home transactions={transactions} onDelete={deleteTransaction} onEdit={handleEditRequest} budgets={budgets} user={user} backendMode={isApiBackend} onLogout={logoutUser} onLoginRequest={() => setShowLogin(true)} />;
    }
  };

  const tabs = [
    { id: 'home', icon: HomeIcon, label: '流水', onClick: () => { setEditingTransaction(null); setActiveTab('home'); } },
    { id: 'add', icon: PlusCircle, label: '补记', onClick: () => { setEditingTransaction(null); setActiveTab('add'); } },
    { id: 'stats', icon: PieChart, label: '洞察', onClick: () => { setEditingTransaction(null); setActiveTab('stats'); } },
    { id: 'settings', icon: SettingsIcon, label: '设置', onClick: () => { setEditingTransaction(null); setActiveTab('settings'); } },
  ];

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-zinc-950">
      <div className="w-full max-w-md h-[100dvh] sm:h-[850px] sm:rounded-[3rem] sm:shadow-2xl sm:border-[8px] sm:border-gray-900 dark:sm:border-zinc-800 bg-slate-50 dark:bg-black relative overflow-hidden flex flex-col">
        {/* Ambient Background Blobs for iOS Glassmorphism */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/30 dark:bg-indigo-600/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen"></div>
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/30 dark:bg-teal-600/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full bg-pink-400/30 dark:bg-pink-600/20 blur-[80px] mix-blend-multiply dark:mix-blend-screen"></div>
        </div>

        {/* Dynamic Island / Notch simulation for desktop preview */}
        <div className="hidden sm:block absolute top-0 inset-x-0 h-7 z-50 pointer-events-none">
          <div className="w-32 h-7 bg-gray-900 dark:bg-zinc-800 mx-auto rounded-b-3xl"></div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative z-10">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="h-full w-full absolute inset-0"
              >
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }>
                  {renderContent()}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        {canUseApp && (
          <div className="absolute bottom-0 inset-x-0 h-20 bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border-t border-white/40 dark:border-white/10 pb-safe z-50">
            <div className="flex justify-around items-center h-full px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={tab.onClick}
                    className="flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors"
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 transition-all duration-300",
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400 scale-110"
                          : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium transition-colors",
                        isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
                      )}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
