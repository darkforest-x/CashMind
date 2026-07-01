import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Home as HomeIcon, Lock, PieChart, PlusCircle, Settings as SettingsIcon } from 'lucide-react';
import { Transaction, Budget } from './types';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './components/Toast';
import { auth, db, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  setDoc,
  orderBy
} from 'firebase/firestore';

const Home = lazy(() => import('./components/Home'));
const Add = lazy(() => import('./components/Add'));
const Stats = lazy(() => import('./components/Stats'));
const Settings = lazy(() => import('./components/Settings'));
const Login = lazy(() => import('./components/Login'));

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Initialize dark mode
    const savedDarkMode = localStorage.getItem('gqh_dark_mode');
    const isDark = savedDarkMode !== null ? savedDarkMode === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTransactions([]);
        setBudgets([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    const txQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
      setTransactions(txs);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      setIsLoading(false);
    });

    const budgetQuery = query(
      collection(db, 'budgets'),
      where('userId', '==', user.uid)
    );

    const unsubscribeBudgets = onSnapshot(budgetQuery, (snapshot) => {
      const bgs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Budget));
      setBudgets(bgs);
    });

    return () => {
      unsubscribeTx();
      unsubscribeBudgets();
    };
  }, [user]);

  const handleAddTransaction = async (t: Transaction) => {
    if (!user) return;
    try {
      const txRef = doc(collection(db, 'transactions'));
      const txData = { 
        ...t, 
        id: txRef.id, 
        userId: user.uid,
        date: t.date.split('T')[0] // Ensure strict date format
      };
      await setDoc(txRef, txData);
      setActiveTab('home');
      showToast('记录添加成功', 'success');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      showToast('数据写入权限不足，请联系管理员', 'error');
    }
  };

  const handleUpdateTransaction = async (t: Transaction) => {
    if (!user) return;
    try {
      const txRef = doc(db, 'transactions', t.id);
      const updateData = { ...t, userId: user.uid };
      await setDoc(txRef, updateData, { merge: true });
      setEditingTransaction(null);
      setActiveTab('home');
      showToast('记录更新成功', 'success');
    } catch (err) {
      console.error('Failed to update transaction:', err);
      showToast('更新失败，权限验证未通过', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
      showToast('记录已删除', 'success');
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      showToast('记录删除失败', 'error');
    }
  };

  const handleUpdateBudgets = async (newBudgets: Budget[]) => {
    if (!user) return;
    try {
      // In our current settings logic, we usually update one budget at a time
      // But for compatibility with the prop:
      for (const b of newBudgets) {
        const budgetId = `${user.uid}_${b.month}`;
        await setDoc(doc(db, 'budgets', budgetId), {
          ...b,
          id: budgetId,
          userId: user.uid
        });
      }
    } catch (err) {
      console.error('Failed to update budget:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('已退出登录', 'info');
    } catch (err) {
      showToast('退出失败', 'error');
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
        return <Home transactions={transactions} onDelete={handleDeleteTransaction} onEdit={handleEditRequest} budgets={budgets} user={user} onLogout={handleLogout} onLoginRequest={() => setShowLogin(true)} />;
      case 'add':
        if (!user) {
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
        return <Settings transactions={transactions} budgets={budgets} onUpdateBudgets={handleUpdateBudgets} />;
      default:
        return <Home transactions={transactions} onDelete={handleDeleteTransaction} onEdit={handleEditRequest} budgets={budgets} user={user} onLogout={handleLogout} onLoginRequest={() => setShowLogin(true)} />;
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
        {user && (
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
