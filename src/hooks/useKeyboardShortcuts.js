import { useEffect } from 'react';
import { useLeadStore } from '../stores/useLeadStore';

export function useKeyboardShortcuts() {
  const { nextLead, prevLead } = useLeadStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextLead();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        prevLead();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextLead, prevLead]);
}
