import { Transaction, Category } from './types';
import { subDays, formatISO } from 'date-fns';

const today = new Date();

export const MOCK_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮美食', icon: 'Utensils', color: '#FF9500' },
  { id: 'coffee', name: '咖啡饮品', icon: 'Coffee', color: '#A2845E' },
  { id: 'transport', name: '交通出行', icon: 'Car', color: '#007AFF' },
  { id: 'shopping', name: '购物消费', icon: 'ShoppingBag', color: '#FF2D55' },
  { id: 'entertainment', name: '休闲娱乐', icon: 'Gamepad2', color: '#AF52DE' },
  { id: 'housing', name: '住房物业', icon: 'Home', color: '#34C759' },
  { id: 'salary', name: '薪资收入', icon: 'Wallet', color: '#34C759' },
  { id: 'other', name: '其他', icon: 'CircleHelp', color: '#8E8E93' },
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    amount: 32.5,
    type: 'expense',
    category: 'coffee',
    date: formatISO(today),
    note: '星巴克拿铁',
    source: 'shortcut',
    currency: 'CNY',
  },
  {
    id: 't2',
    amount: 15.0,
    type: 'expense',
    category: 'transport',
    date: formatISO(today),
    note: '打车',
    source: 'shortcut',
    currency: 'CNY',
  },
  {
    id: 't3',
    amount: 120.0,
    type: 'expense',
    category: 'food',
    date: formatISO(subDays(today, 1)),
    note: '外卖晚餐',
    source: 'shortcut',
    currency: 'CNY',
  },
  {
    id: 't4',
    amount: 50.0,
    type: 'expense',
    category: 'shopping',
    date: formatISO(subDays(today, 1)),
    note: '便利店',
    source: 'manual',
    currency: 'CNY',
  },
  {
    id: 't5',
    amount: 15000.0,
    type: 'income',
    category: 'salary',
    date: formatISO(subDays(today, 2)),
    note: '本月工资',
    source: 'manual',
    currency: 'CNY',
  },
];
