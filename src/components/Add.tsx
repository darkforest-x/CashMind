import React, { useState, useEffect } from 'react';
import { Transaction, Category } from '../types';
import { MOCK_CATEGORIES } from '../data';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import { formatISO } from 'date-fns';
import { motion } from 'motion/react';
import { useToast } from './Toast';

interface AddProps {
  onAdd: (t: Transaction) => void;
  onUpdate?: (t: Transaction) => void;
  initialData?: Transaction | null;
  onCancelEdit?: () => void;
}

interface AiSuggestion {
  cat: string;
  prob: number;
  label: string;
}

export default function Add({ onAdd, onUpdate, initialData, onCancelEdit }: AddProps) {
  const [amount, setAmount] = useState(initialData ? initialData.amount.toString() : '0');
  const [type, setType] = useState<'expense' | 'income'>(initialData ? initialData.type : 'expense');
  const [category, setCategory] = useState<string>(initialData ? initialData.category : 'food');
  const [note, setNote] = useState(initialData ? (initialData.note || '') : '');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([
    { cat: 'food', prob: 100, label: '餐饮美食' }
  ]);
  const [isClassifying, setIsClassifying] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !note.trim()) {
      return;
    }

    const classify = async () => {
      setIsClassifying(true);
      try {
        const res = await fetch('/api/ai/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: numAmount, note }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const suggestions = data.map((item: any) => {
              const catObj = MOCK_CATEGORIES.find(c => c.id === item.category);
              return {
                cat: item.category,
                prob: Math.round(item.probability * 100),
                label: catObj ? catObj.name : item.category
              };
            });
            setAiSuggestions(suggestions);
            if (suggestions.length > 0) {
              setCategory(suggestions[0].cat);
              showToast(`AI 建议分类: ${suggestions[0].label}`, 'info');
            }
          }
        } else {
           showToast('AI 分类失败，请稍后重试', 'error');
        }
      } catch (error) {
        console.error('Failed to classify:', error);
        showToast('AI 分类失败，请检查网络', 'error');
      } finally {
        setIsClassifying(false);
      }
    };

    const timer = setTimeout(classify, 800);
    return () => clearTimeout(timer);
  }, [amount, note]);

  const handleNumpad = (val: string) => {
    if (val === 'C') {
      setAmount('0');
      return;
    }
    if (val === 'DEL') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (val === '.') {
      if (!amount.includes('.')) setAmount((prev) => prev + '.');
      return;
    }
    setAmount((prev) => (prev === '0' ? val : prev + val));
  };

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    if (initialData && onUpdate) {
      onUpdate({
        ...initialData,
        amount: numAmount,
        type,
        category,
        note,
      });
    } else {
      onAdd({
        id: Math.random().toString(36).substring(7),
        amount: numAmount,
        type,
        category,
        date: formatISO(new Date()),
        note,
        source: 'manual',
      });
    }
    setAmount('0');
    setNote('');
  };

  return (
    <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-white pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-6 bg-white/40 dark:bg-black/40 backdrop-blur-3xl saturate-200 rounded-b-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border-b border-white/40 dark:border-white/10 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            {initialData && (
              <button onClick={onCancelEdit} className="p-1 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                <Icons.ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{initialData ? '编辑记录' : 'AI 辅助补记'}</h1>
          </div>
          <div className="flex bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-full p-1">
            <button
              onClick={() => setType('expense')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                type === 'expense' ? "bg-white/80 dark:bg-black/40 shadow-sm" : "text-gray-600 dark:text-gray-300"
              )}
            >
              支出
            </button>
            <button
              onClick={() => setType('income')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                type === 'income' ? "bg-white/80 dark:bg-black/40 shadow-sm" : "text-gray-600 dark:text-gray-300"
              )}
            >
              收入
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-6">
          <span className="text-sm text-gray-500 dark:text-gray-400 mb-2">输入金额</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-medium text-gray-400">¥</span>
            <span className="text-6xl font-bold tracking-tighter">{amount}</span>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">
            <Icons.Sparkles className="w-4 h-4" />
            <span>AI 智能推测分类</span>
            {isClassifying && <Icons.Loader2 className="w-3 h-3 animate-spin" />}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {aiSuggestions.map((s, i) => (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.3 }}
                key={s.cat}
                onClick={() => setCategory(s.cat)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all whitespace-nowrap backdrop-blur-md",
                  category === s.cat
                    ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                    : "border-white/40 dark:border-white/10 bg-white/40 dark:bg-black/40 text-gray-700 dark:text-gray-300"
                )}
              >
                <span className="text-sm font-medium">{s.label}</span>
                <span className="text-xs opacity-60">{s.prob}%</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Input & Numpad */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-4">
        <div className="mb-6">
          <input
            type="text"
            placeholder="添加备注..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-2xl px-4 py-4 text-base placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500/50 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] transition-all"
          />
        </div>

        <div className="grid grid-cols-4 gap-3 flex-1 max-h-[320px]">
          {['1', '2', '3', 'C', '4', '5', '6', 'DEL', '7', '8', '9', 'OK', '0', '.'].map((key, i) => {
            if (key === 'OK') {
              return (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  key={key}
                  onClick={handleSave}
                  className="col-span-1 row-span-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl flex items-center justify-center font-semibold text-xl shadow-sm transition-colors"
                >
                  保存
                </motion.button>
              );
            }
            return (
              <motion.button
                whileTap={{ scale: 0.9 }}
                key={key}
                onClick={() => handleNumpad(key)}
                className={cn(
                  "bg-white/40 dark:bg-black/40 backdrop-blur-2xl saturate-200 border border-white/40 dark:border-white/10 rounded-3xl flex items-center justify-center text-2xl font-medium shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-colors",
                  key === 'C' || key === 'DEL' ? "text-red-500" : "text-gray-900 dark:text-white",
                  key === '0' ? "col-span-2" : ""
                )}
              >
                {key === 'DEL' ? <Icons.Delete className="w-6 h-6" /> : key}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
