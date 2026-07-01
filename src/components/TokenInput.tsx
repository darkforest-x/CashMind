type TokenInputProps = {
  label: string;
  value: string;
  placeholder: string;
  statusText: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCopy?: () => void;
};

export default function TokenInput({ label, value, placeholder, statusText, onChange, onSave, onCopy }: TokenInputProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
        {label}
      </label>
      <div className="flex min-w-0 bg-white/50 dark:bg-black/50 backdrop-blur-md rounded-2xl p-1 border border-white/40 dark:border-white/10 shadow-inner">
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent border-none px-3 py-2 text-sm text-gray-600 dark:text-gray-300 focus:ring-0 focus:outline-none"
        />
        <button
          onClick={onSave}
          className="shrink-0 min-w-14 whitespace-nowrap bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors"
        >
          保存
        </button>
        {onCopy && (
          <button
            onClick={onCopy}
            className="ml-1 shrink-0 min-w-14 whitespace-nowrap bg-white/80 dark:bg-white/20 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl text-sm font-medium shadow-sm border border-white/40 dark:border-white/10 hover:bg-white dark:hover:bg-white/30 transition-colors"
          >
            复制
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        {statusText}
      </p>
    </div>
  );
}
