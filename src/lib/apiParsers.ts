import type { Budget, Currency, Transaction, TransactionSource } from '../types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readTransactionType(value: unknown): Transaction['type'] {
  return value === 'income' ? 'income' : 'expense';
}

function readCurrency(value: unknown): Currency {
  if (value === 'USD' || value === 'EUR' || value === 'JPY') {
    return value;
  }
  return 'CNY';
}

function readSource(value: unknown): TransactionSource {
  if (
    value === 'manual' ||
    value === 'shortcut' ||
    value === 'wallet' ||
    value === 'sms' ||
    value === 'email' ||
    value === 'ocr' ||
    value === 'import'
  ) {
    return value;
  }
  return 'manual';
}

export function parseTransaction(value: unknown): Transaction | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const amount = readNumber(value.amount);
  const category = readString(value.category, 'other');
  const date = readString(value.date);
  if (!id || amount === null || !date) {
    return null;
  }

  return {
    id,
    amount,
    type: readTransactionType(value.type),
    category,
    date,
    note: readString(value.note),
    source: readSource(value.source),
    currency: readCurrency(value.currency),
  };
}

function parseBudget(value: unknown): Budget | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const amount = readNumber(value.amount);
  const month = readString(value.month);
  if (!id || amount === null || !month) {
    return null;
  }

  return { id, amount, month };
}

function isTransaction(value: Transaction | null): value is Transaction {
  return value !== null;
}

function isBudget(value: Budget | null): value is Budget {
  return value !== null;
}

export function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => b.date.localeCompare(a.date));
}

export function parseTransactionList(value: unknown): Transaction[] {
  return Array.isArray(value) ? sortTransactions(value.map(parseTransaction).filter(isTransaction)) : [];
}

export function parseBudgetList(value: unknown): Budget[] {
  return Array.isArray(value)
    ? value.map(parseBudget).filter(isBudget).sort((a, b) => b.month.localeCompare(a.month))
    : [];
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
