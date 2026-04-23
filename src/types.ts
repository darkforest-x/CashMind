export type Currency = 'CNY' | 'USD' | 'EUR' | 'JPY';

export type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note?: string;
  source: 'shortcut' | 'manual';
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
