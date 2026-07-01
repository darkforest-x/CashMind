export type Currency = 'CNY' | 'USD' | 'EUR' | 'JPY';
export type TransactionSource = 'manual' | 'shortcut' | 'wallet' | 'sms' | 'email' | 'ocr' | 'import';

export type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note?: string;
  source: TransactionSource;
  currency: Currency;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Budget = {
  id: string;
  amount: number;
  month: string; // YYYY-MM
};
