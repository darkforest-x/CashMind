import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import Add from './components/Add';
import Stats from './components/Stats';
import Settings from './components/Settings';
import * as Icons from 'lucide-react';
import { Transaction } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize dark mode
    const savedDarkMode = localStorage.getItem('gqh_dark_mode');
    const isDark = savedDarkMode !== null ? savedDarkMode === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Fetch transactions
    fetch('/api/transactions')
      .then(res => res.json())
      .then(data => {
        setTransactions(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch transactions:', err);
        setIsLoading(false);
      });
  }, []);

  const handleAddTransaction = async (t: Transaction) => {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t),
      });
      const newTx = await res.json();
      setTransactions((prev) => [newTx, ...prev]);
      setActiveTab('home');
    } catch (err) {
      console.error('Failed to add transaction:', err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home transactions={transactions} onDelete={handleDeleteTransaction} />;
      case 'add':
        return <Add onAdd={handleAddTransaction} />;
      case 'stats':
        return <Stats transactions={transactions} />;
      case 'settings':
        return <Settings />;
      default:
        return <Home transactions={transactions} onDelete={handleDeleteTransaction} />;
    }
  };

  const tabs = [
    { id: 'home', icon: 'Home', label: '流水' },
    { id: 'add', icon: 'PlusCircle', label: '补记' },
    { id: 'stats', icon: 'PieChart', label: '洞察' },
    { id: 'settings', icon: 'Settings', label: '设置' },
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
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border-t border-white/40 dark:border-white/10 pb-safe z-50">
          <div className="flex justify-around items-center h-full px-6">
            {tabs.map((tab) => {
              const Icon = (Icons as any)[tab.icon];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
      </div>
    </div>
  );
}
