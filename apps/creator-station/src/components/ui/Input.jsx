import { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  className = '',
  error,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-bangers text-xs uppercase tracking-wider text-white">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg
          px-3 py-2 text-sm text-white
          placeholder:text-white/50
          focus:outline-none focus:border-cyan
          transition-colors
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({
  label,
  className = '',
  error,
  ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="font-bangers text-xs uppercase tracking-wider text-white">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full bg-input-bg border-[1.5px] border-panel-border rounded-lg
          px-3 py-2 text-sm text-white
          placeholder:text-white/50
          focus:outline-none focus:border-cyan
          transition-colors resize-none
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;
