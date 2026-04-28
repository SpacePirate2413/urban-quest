const variants = {
  cyan: 'text-cyan border-cyan bg-cyan/10',
  green: 'text-neon-green border-neon-green bg-neon-green/10',
  pink: 'text-hot-pink border-hot-pink bg-hot-pink/10',
  yellow: 'text-yellow border-yellow bg-yellow/10',
  purple: 'text-purple border-purple bg-purple/10',
  orange: 'text-orange border-orange bg-orange/10',
  red: 'text-red-500 border-red-500 bg-red-500/10',
  gray: 'text-white border-panel-border bg-panel',
  'cyan-solid': 'text-navy-deep bg-cyan border-cyan',
  'green-solid': 'text-navy-deep bg-neon-green border-neon-green',
  'pink-solid': 'text-white bg-hot-pink border-hot-pink',
  'yellow-solid': 'text-navy-deep bg-yellow border-yellow',
  'purple-solid': 'text-white bg-purple border-purple',
  'orange-solid': 'text-white bg-orange border-orange',
  'red-solid': 'text-white bg-red-500 border-red-500',
};

export function Badge({ children, variant = 'cyan', className = '' }) {
  return (
    <span
      className={`
        font-bangers uppercase text-[11px] tracking-wider
        px-2 py-0.5 rounded-full
        border
        inline-flex items-center gap-1
        ${variants[variant] || variants.cyan}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export default Badge;
