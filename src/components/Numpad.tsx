import { motion } from 'motion/react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';

type NumpadProps = {
  readonly onInput: (value: string) => void;
  readonly onSave: () => void;
};

const NUMPAD_KEYS = ['1', '2', '3', 'C', '4', '5', '6', 'DEL', '7', '8', '9', 'OK', '0', '.'] as const;

export default function Numpad({ onInput, onSave }: NumpadProps) {
  return (
    <div className="grid max-h-[300px] grid-cols-4 gap-2.5">
      {NUMPAD_KEYS.map((key) => {
        if (key === 'OK') {
          return (
            <motion.button
              key={key}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={onSave}
              className="cm-primary cm-press row-span-2 rounded-[22px] text-[17px] font-black"
            >
              保存
            </motion.button>
          );
        }
        return (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onInput(key)}
            className={cn(
              'cm-card cm-press grid h-14 place-items-center rounded-[22px] text-xl font-black',
              key === '0' && 'col-span-2',
              (key === 'C' || key === 'DEL') && 'text-[var(--cm-red)]',
            )}
          >
            {key === 'DEL' ? <Icons.Delete className="h-6 w-6" /> : key}
          </motion.button>
        );
      })}
    </div>
  );
}
