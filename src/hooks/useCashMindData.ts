import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, where } from 'firebase/firestore';
import { auth, db, logout } from '../lib/firebase';
import { hasApiBackend } from '../lib/api';
import { getErrorMessage, parseBudgetList, parseTransactionList } from '../lib/apiParsers';
import type { Budget, Transaction } from '../types';
import { useToast } from '../components/Toast';
import { useSelfHostedCashMindData } from './useSelfHostedCashMindData';

export function useCashMindData() {
  const [isApiBackend] = useState(() => hasApiBackend());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { showToast } = useToast();
  const selfHosted = useSelfHostedCashMindData(isApiBackend);

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
      return selfHosted.addTransaction(transaction);
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
  }, [isApiBackend, selfHosted, showToast, user]);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
    if (isApiBackend) {
      return selfHosted.updateTransaction(transaction);
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
  }, [isApiBackend, selfHosted, showToast, user]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      if (isApiBackend) {
        await selfHosted.deleteTransaction(id);
      } else if (user) {
        await deleteDoc(doc(db, 'transactions', id));
        showToast('记录已删除', 'success');
      } else {
        return;
      }
    } catch (error) {
      console.error('Failed to delete transaction:', getErrorMessage(error));
      showToast('记录删除失败', 'error');
    }
  }, [isApiBackend, selfHosted, showToast, user]);

  const updateBudgets = useCallback(async (newBudgets: Budget[]) => {
    try {
      if (isApiBackend) {
        await selfHosted.updateBudgets(newBudgets);
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
  }, [isApiBackend, selfHosted, user]);

  const logoutUser = useCallback(async () => {
    if (isApiBackend) {
      selfHosted.logoutUser();
      return;
    }

    try {
      await logout();
      showToast('已退出登录', 'info');
    } catch (error) {
      console.error('Failed to logout:', getErrorMessage(error));
      showToast('退出失败', 'error');
    }
  }, [isApiBackend, selfHosted, showToast]);

  return {
    transactions: isApiBackend ? selfHosted.transactions : transactions,
    budgets: isApiBackend ? selfHosted.budgets : budgets,
    isLoading: isApiBackend ? selfHosted.isLoading : isLoading,
    user,
    isApiBackend,
    needsAppAuthorization: isApiBackend ? selfHosted.needsAppAuthorization : false,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudgets,
    logoutUser,
  };
}
