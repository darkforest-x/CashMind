import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';

type NumpadProps = {
  onInput: (value: string) => void;
  onSave: () => void;
};

const NUMPAD_KEYS = ['1', '2', '3', 'C', '4', '5', '6', 'DEL', '7', '8', '9', 'OK', '0', '.'];

export default function Numpad({ onInput, onSave }: NumpadProps) {
  return (
    <div className="grid grid-cols-4 gap-3 flex-1 max-h-[320px]">
      {NUMPAD_KEYS.map((key) => {
        if (key === 'OK') {
          return (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={key}
              onClick={onSave}
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
            onClick={() => onInput(key)}
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
  );
}
