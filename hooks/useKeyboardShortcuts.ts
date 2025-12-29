
import { useEffect } from 'react';

interface Shortcuts {
  onUp?: () => void;
  onDown?: () => void;
  onAdd?: () => void;
  onDelete?: () => void;
  onAlert?: () => void;
  onHelp?: () => void;
  onPrediction?: () => void;
  onTimeframe?: (key: string) => void;
  onNavigate?: (index: number) => void;
  onCyclePage?: (direction: 'NEXT' | 'PREV') => void;
  disabled?: boolean;
}

export const useKeyboardShortcuts = ({
  onUp,
  onDown,
  onAdd,
  onDelete,
  onAlert,
  onHelp,
  onPrediction,
  onTimeframe,
  onNavigate,
  onCyclePage,
  disabled
}: Shortcuts) => {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input, but allow Alt keys for navigation
      if (e.target instanceof HTMLInputElement && !e.altKey) return;

      // Global Navigation (Alt + 1-5)
      if (e.altKey) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          e.preventDefault();
          onNavigate?.(num - 1); // Convert 1-based key to 0-based index
          return;
        }
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          onUp?.();
          break;
        case 'ArrowDown':
        case 'j':
          onDown?.();
          break;
        case 'a':
        case 'A':
          if (!e.altKey && !e.ctrlKey) onAdd?.();
          break;
        case 'd':
        case 'D':
          if (!e.altKey && !e.ctrlKey) onDelete?.();
          break;
        case 'r':
        case 'R':
          if (!e.altKey && !e.ctrlKey) onAlert?.();
          break;
        case 'p':
        case 'P':
          if (!e.altKey && !e.ctrlKey) onPrediction?.();
          break;
        case 'h':
        case 'H':
          if (!e.altKey && !e.ctrlKey) onHelp?.();
          break;
        case '[':
          onCyclePage?.('PREV');
          break;
        case ']':
          onCyclePage?.('NEXT');
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '0':
          // Only trigger timeframe if Alt is NOT pressed to avoid conflict with nav
          if (!e.altKey) onTimeframe?.(e.key);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUp, onDown, onAdd, onDelete, onAlert, onHelp, onPrediction, onTimeframe, onNavigate, onCyclePage, disabled]);
};
