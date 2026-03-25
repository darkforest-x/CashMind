export type Transaction = {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  note?: string;
  source: 'shortcut' | 'manual';
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};
