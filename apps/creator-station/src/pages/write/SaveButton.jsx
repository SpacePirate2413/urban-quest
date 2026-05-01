import { Check, Loader2, Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui';

/**
 * Confirmation Save button used on Quest Info / Waypoints / Create tabs.
 *
 * Auto-save still does the heavy lifting in the background — this button
 * just gives creators an explicit "I saved" gesture and a clear visual ack
 * (`Saving…` → `✓ Saved` → reverts after 2s). Pass an async `onSave` and
 * the button will wait on it and display the result.
 */
export function SaveButton({ onSave, label = 'Save', disabled, className }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [errorMsg, setErrorMsg] = useState(null);

  const handleClick = async () => {
    if (status === 'saving') return;
    setStatus('saving');
    setErrorMsg(null);
    try {
      await onSave();
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Save failed');
      setTimeout(() => setStatus('idle'), 3500);
    }
  };

  const variant =
    status === 'saved' ? 'green' : status === 'error' ? 'danger-outline' : 'cyan';

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={handleClick}
      disabled={disabled || status === 'saving'}
      className={className}
      title={status === 'error' ? errorMsg : undefined}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving…
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-4 h-4" />
          Saved
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4" />
          Try again
        </>
      )}
      {status === 'idle' && (
        <>
          <Save className="w-4 h-4" />
          {label}
        </>
      )}
    </Button>
  );
}

export default SaveButton;
