import { createContext, useContext, useState } from 'react';

const TabsContext = createContext();

export function Tabs({ children, defaultValue, value, onValueChange, className = '' }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;
  
  const handleChange = (newValue) => {
    if (onValueChange) {
      onValueChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }) {
  return (
    <div 
      className={`
        flex gap-1 p-1 bg-panel border border-panel-border rounded-xl
        overflow-x-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, className = '', icon }) {
  const { value: currentValue, onChange } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={`
        font-bangers uppercase tracking-wider text-sm
        px-4 py-2 rounded-lg
        flex items-center gap-2
        transition-all duration-200
        whitespace-nowrap
        ${isActive 
          ? 'bg-cyan text-navy-deep' 
          : 'text-white hover:bg-panel-border/50'
        }
        ${className}
      `}
    >
      {icon}
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className = '' }) {
  const { value: currentValue } = useContext(TabsContext);
  
  if (currentValue !== value) return null;

  return (
    <div className={className}>
      {children}
    </div>
  );
}

export default Tabs;
