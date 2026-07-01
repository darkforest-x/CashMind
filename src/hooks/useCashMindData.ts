import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import { auth, db, logout } from '../lib/firebase';
import { APP_ACCESS_TOKEN_UPDATED_EVENT, apiFetch, hasApiBackend } from '../lib/api';
import { getErrorMessage, parseBudgetList, parseTransaction, parseTransactionList, readJson, sortTransactions } from '../lib/apiParsers';
import type { Budget, Transaction } from '../types';
import { useToast } from '../components/Toast';

export function useCashMindData() {
  const [isApiBackend] = useState(() => hasApiBackend());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { showToast } = useToast();

  const loadApiData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    try {
      const [transactionsResponse, budgetsResponse] = await Promise.all([
        apiFetch('/api/transactions'),
        apiFetch('/api/budgets'),
      ]);
      const [transactionsJson, budgetsJson] = await Promise.all([
        readJson(transactionsResponse),
        readJson(budgetsResponse),
      ]);

      setTransactions(parseTransactionList(transactionsJson));
      setBudgets(parseBudgetList(budgetsJson));
    } catch (error) {
      console.error('Failed to load self-hosted data:', getErrorMessage(error));
      if (showLoading) {
        showToast('连接个人服务失败，请检查 API 地址', 'error');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (!isApiBackend) {
      return undefined;
    }

    void loadApiData();
    const intervalId = window.setInterval(() => {
      void loadApiData(false);
    }, 30_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadApiData(false);
      }
    };
    const refreshAfterTokenUpdate = () => {
      void loadApiData();
    };

    window.addEventListener('focus', refreshWhenVisible);
    window.addEventListener(APP_ACCESS_TOKEN_UPDATED_EVENT, refreshAfterTokenUpdate);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      window.removeEventListener(APP_ACCESS_TOKEN_UPDATED_EVENT, refreshAfterTokenUpdate);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [isApiBackend, loadApiData]);

  useEffect(() => {
    if (isApiBackend) {
      return undefined;
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
  }, [isApiBackend]);

  useEffect(() => {
    if (isApiBackend || !user) {
      return undefined;
    }

    setIsLoading(true);
    const txQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
    );
    const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
      setTransactions(parseTransactionList(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))));
      setIsLoading(false);
    }, (error) => {
      console.error('Firestore snapshot error:', getErrorMessage(error));
      setIsLoading(false);
    });

    const budgetQuery = query(collection(db, 'budgets'), where('userId', '==', user.uid));
    const unsubscribeBudgets = onSnapshot(budgetQuery, (snapshot) => {
      setBudgets(parseBudgetList(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))));
    });

    return () => {
      unsubscribeTx();
      unsubscribeBudgets();
    };
  }, [isApiBackend, user]);

  const addTransaction = useCallback(async (transaction: Transaction) => {
    if (isApiBackend) {
      try {
        const response = await apiFetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction),
        });
        const savedTransaction = parseTransaction(await readJson(response));
        if (!savedTransaction) {
          throw new Error('Invalid transaction response');
        }
        setTransactions((current) => sortTransactions([savedTransaction, ...current]));
        showToast('记录添加成功', 'success');
        return true;
      } catch (error) {
        console.error('Failed to add transaction:', getErrorMessage(error));
        showToast('个人服务写入失败，请检查网络', 'error');
        return false;
      }
    }

    if (!user) {
      return false;
    }

    try {
      const txRef = doc(collection(db, 'transactions'));
      await setDoc(txRef, {
        ...transaction,
        id: txRef.id,
        userId: user.uid,
        date: transaction.date.split('T')[0],
      });
      showToast('记录添加成功', 'success');
      return true;
    } catch (error) {
      console.error('Failed to add transaction:', getErrorMessage(error));
      showToast('数据写入权限不足，请联系管理员', 'error');
      return false;
    }
  }, [isApiBackend, showToast, user]);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    if (isApiBackend) {
      try {
        await readJson(await apiFetch(`/api/transactions/${transaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction),
        }));
        setTransactions((current) => sortTransactions(current.map((item) => (
          item.id === transaction.id ? transaction : item
        ))));
        showToast('记录更新成功', 'success');
        return true;
      } catch (error) {
        console.error('Failed to update transaction:', getErrorMessage(error));
        showToast('个人服务更新失败，请检查网络', 'error');
        return false;
      }
    }

    if (!user) {
      return false;
    }

    try {
      await setDoc(doc(db, 'transactions', transaction.id), { ...transaction, userId: user.uid }, { merge: true });
      showToast('记录更新成功', 'success');
      return true;
    } catch (error) {
      console.error('Failed to update transaction:', getErrorMessage(error));
      showToast('更新失败，权限验证未通过', 'error');
      return false;
    }
  }, [isApiBackend, showToast, user]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      if (isApiBackend) {
        await readJson(await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }));
        setTransactions((current) => current.filter((item) => item.id !== id));
      } else if (user) {
        await deleteDoc(doc(db, 'transactions', id));
      } else {
        return;
      }
      showToast('记录已删除', 'success');
    } catch (error) {
      console.error('Failed to delete transaction:', getErrorMessage(error));
      showToast('记录删除失败', 'error');
    }
  }, [isApiBackend, showToast, user]);

  const updateBudgets = useCallback(async (newBudgets: Budget[]) => {
    try {
      if (isApiBackend) {
        await Promise.all(newBudgets.map((budget) => apiFetch('/api/budgets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(budget),
        }).then(readJson)));
        setBudgets(newBudgets);
        return;
      }

      if (!user) {
        return;
      }

      await Promise.all(newBudgets.map((budget) => {
        const budgetId = `${user.uid}_${budget.month}`;
        return setDoc(doc(db, 'budgets', budgetId), { ...budget, id: budgetId, userId: user.uid });
      }));
    } catch (error) {
      console.error('Failed to update budget:', getErrorMessage(error));
      throw error;
    }
  }, [isApiBackend, user]);

  const logoutUser = useCallback(async () => {
    if (isApiBackend) {
      showToast('自托管模式无需退出登录', 'info');
      return;
    }

    try {
      await logout();
      showToast('已退出登录', 'info');
    } catch (error) {
      console.error('Failed to logout:', getErrorMessage(error));
      showToast('退出失败', 'error');
    }
  }, [isApiBackend, showToast]);

  return {
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
  };
}
