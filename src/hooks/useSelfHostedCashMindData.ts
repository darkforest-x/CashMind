import { useCallback, useEffect, useState } from 'react';
import { APP_ACCESS_TOKEN_UPDATED_EVENT, apiFetch } from '../lib/api';
import { getErrorMessage, parseBudgetList, parseTransaction, parseTransactionList, readJson, sortTransactions } from '../lib/apiParsers';
import type { Budget, Transaction } from '../types';
import { useToast } from '../components/Toast';

const SETUP_QUERY_KEYS = ['setup', 'setupToken', 'cashmind_setup'] as const;

function hasSetupTokenInUrl(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return SETUP_QUERY_KEYS.some((key) => Boolean(params.get(key)?.trim()));
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'HTTP 401';
}

function isAuthorizedSession(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'authorized' in value && value.authorized === true;
}

function getUnauthorizedMessage(action: 'add' | 'update' | 'delete' | 'budget'): string {
  if (action === 'budget') {
    return '请先连接个人服务，再保存预算';
  }
  if (action === 'delete') {
    return '请先连接个人服务，再删除记录';
  }
  return '请先连接个人服务，再保存账单';
}

export function useSelfHostedCashMindData(isEnabled: boolean) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAppAuthorization, setNeedsAppAuthorization] = useState(false);
  const { showToast } = useToast();

  const loadAppSession = useCallback(async () => {
    const response = await apiFetch('/api/app/session');
    return isAuthorizedSession(await readJson(response));
  }, []);

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
      setNeedsAppAuthorization(false);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setNeedsAppAuthorization(true);
        return;
      }
      console.error('Failed to load self-hosted data:', getErrorMessage(error));
      if (showLoading && showErrorToast) {
        showToast('连接个人服务失败，请检查 API 地址', 'error');
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
      if (hasSetupTokenInUrl()) {
        setIsLoading(false);
        return;
      }

      try {
        const authorized = await loadAppSession();
        if (!authorized) {
          setNeedsAppAuthorization(true);
          setIsLoading(false);
          return;
        }
        await loadApiData();
      } catch (error) {
        console.error('Failed to check self-hosted session:', getErrorMessage(error));
        showToast('连接个人服务失败，请检查 API 地址', 'error');
        setIsLoading(false);
      }
    };

    void loadInitialApiData();
    const refreshAfterTokenUpdate = () => {
      void loadApiData();
    };

    window.addEventListener(APP_ACCESS_TOKEN_UPDATED_EVENT, refreshAfterTokenUpdate);
    return () => {
      window.removeEventListener(APP_ACCESS_TOKEN_UPDATED_EVENT, refreshAfterTokenUpdate);
    };
  }, [isEnabled, loadApiData, loadAppSession, showToast]);

  useEffect(() => {
    if (!isEnabled || isLoading || needsAppAuthorization) {
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
  }, [isEnabled, isLoading, loadApiData, needsAppAuthorization]);

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
      if (isUnauthorizedError(error)) {
        setNeedsAppAuthorization(true);
        showToast(getUnauthorizedMessage('add'), 'error');
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
      if (isUnauthorizedError(error)) {
        setNeedsAppAuthorization(true);
        showToast(getUnauthorizedMessage('update'), 'error');
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
      if (isUnauthorizedError(error)) {
        setNeedsAppAuthorization(true);
        showToast(getUnauthorizedMessage('delete'), 'error');
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
      if (isUnauthorizedError(error)) {
        setNeedsAppAuthorization(true);
        showToast(getUnauthorizedMessage('budget'), 'error');
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
    needsAppAuthorization,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateBudgets,
    logoutUser,
  };
}
