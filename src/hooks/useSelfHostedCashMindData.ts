import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { getErrorMessage, parseBudgetList, parseTransaction, parseTransactionList, readJson, sortTransactions } from '../lib/apiParsers';
import type { Budget, Transaction } from '../types';
import { useToast } from '../components/Toast';

export function useSelfHostedCashMindData(isEnabled: boolean) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadApiData = useCallback(async (showLoading = true, showErrorToast = true) => {
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
      if (error instanceof Error && error.message === 'HTTP 401') {
        showToast('个人服务拒绝访问，请确认 VPS 已部署最新版本', 'error');
        return;
      }
      console.error('Failed to load self-hosted data:', getErrorMessage(error));
      if (showLoading && showErrorToast) {
        showToast('个人 VPS 连接失败，请检查 API 地址', 'error');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const loadInitialApiData = async () => {
      await loadApiData();
    };

    void loadInitialApiData();
    return undefined;
  }, [isEnabled, loadApiData]);

  useEffect(() => {
    if (!isEnabled || isLoading) {
      return undefined;
    }

    const refreshData = () => {
      void loadApiData(false);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };
    const intervalId = window.setInterval(refreshData, 30_000);

    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [isEnabled, isLoading, loadApiData]);

  const addTransaction = useCallback(async (transaction: Transaction) => {
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
      if (error instanceof Error && error.message === 'HTTP 401') {
        showToast('个人服务拒绝写入，请确认 VPS 已部署最新版本', 'error');
        return false;
      }
      console.error('Failed to add transaction:', getErrorMessage(error));
      showToast('个人服务写入失败，请检查网络', 'error');
      return false;
    }
  }, [showToast]);

  const updateTransaction = useCallback(async (transaction: Transaction) => {
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
      if (error instanceof Error && error.message === 'HTTP 401') {
        showToast('个人服务拒绝更新，请确认 VPS 已部署最新版本', 'error');
        return false;
      }
      console.error('Failed to update transaction:', getErrorMessage(error));
      showToast('个人服务更新失败，请检查网络', 'error');
      return false;
    }
  }, [showToast]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await readJson(await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }));
      setTransactions((current) => current.filter((item) => item.id !== id));
      showToast('记录已删除', 'success');
    } catch (error) {
      if (error instanceof Error && error.message === 'HTTP 401') {
        showToast('个人服务拒绝删除，请确认 VPS 已部署最新版本', 'error');
        return;
      }
      console.error('Failed to delete transaction:', getErrorMessage(error));
      showToast('记录删除失败', 'error');
    }
  }, [showToast]);

  const updateBudgets = useCallback(async (newBudgets: Budget[]) => {
    try {
      await Promise.all(newBudgets.map((budget) => apiFetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budget),
      }).then(readJson)));
      setBudgets(newBudgets);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'HTTP 401') {
        showToast('个人服务拒绝保存预算，请确认 VPS 已部署最新版本', 'error');
        return false;
      }
      console.error('Failed to update budgets:', getErrorMessage(error));
      showToast('预算同步失败，请检查服务状态', 'error');
      return false;
    }
  }, [showToast]);

  const logoutUser = useCallback(() => {
    showToast('自托管模式无需退出登录', 'info');
  }, [showToast]);

  return {
    transactions,
    budgets,
    isLoading,
    needsAppAuthorization: false,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudgets,
    logoutUser,
  };
}
