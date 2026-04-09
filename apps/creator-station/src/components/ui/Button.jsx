import { forwardRef } from 'react';

const variants = {
  cyan: 'bg-cyan text-navy-deep border-cyan hover:bg-cyan/90',
  'cyan-outline': 'bg-transparent text-cyan border-cyan hover:bg-cyan/10',
  green: 'bg-neon-green text-navy-deep border-neon-green hover:bg-neon-green/90',
  'green-outline': 'bg-transparent text-neon-green border-neon-green hover:bg-neon-green/10',
  pink: 'bg-hot-pink text-white border-hot-pink hover:bg-hot-pink/90',
  'pink-outline': 'bg-transparent text-hot-pink border-hot-pink hover:bg-hot-pink/10',
  yellow: 'bg-yellow text-navy-deep border-yellow hover:bg-yellow/90',
  'yellow-outline': 'bg-transparent text-yellow border-yellow hover:bg-yellow/10',
  purple: 'bg-purple text-white border-purple hover:bg-purple/90',
  'purple-outline': 'bg-transparent text-purple border-purple hover:bg-purple/10',
  orange: 'bg-orange text-white border-orange hover:bg-orange/90',
  ghost: 'bg-transparent text-white border-transparent hover:bg-panel',
  danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600',
  'danger-outline': 'bg-transparent text-red-500 border-red-500 hover:bg-red-500/10',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef(({
  children,
  variant = 'cyan',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`
        font-bangers uppercase tracking-wider
        border-2 rounded-lg
        inline-flex items-center justify-center gap-2
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant] || variants.cyan}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
