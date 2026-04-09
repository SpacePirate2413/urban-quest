import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({ isOpen, onClose, title, children, className = '' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-navy-deep/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className={`
          relative bg-panel border-[1.5px] border-panel-border rounded-panel
          w-full max-w-lg mx-4 max-h-[90vh] overflow-auto
          ${className}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-panel-border">
          <h2 className="font-bangers text-xl text-white">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
