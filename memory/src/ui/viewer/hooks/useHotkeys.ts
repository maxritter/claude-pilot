import { useEffect, useRef, useCallback } from 'react';
import { SHORTCUTS, SEQUENCE_SHORTCUTS } from '../constants/shortcuts';

type ShortcutHandler = (action: string) => void;

interface UseHotkeysOptions {
  enabled?: boolean;
}

/**
 * Custom hook for handling keyboard shortcuts
 * Supports both single-key shortcuts with modifiers and key sequences (like vim)
 */
export function useHotkeys(handler: ShortcutHandler, options: UseHotkeysOptions = {}) {
  const { enabled = true } = options;
  const sequenceRef = useRef<string[]>([]);
  const sequenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSequence = useCallback(() => {
    sequenceRef.current = [];
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (event.key === 'Escape') {
          handler('escape');
        }
        return;
      }

      const isMac = navigator.platform.includes('Mac');
      const hasModifier = event.ctrlKey || event.metaKey;

      // Check single-key shortcuts with modifiers
      for (const shortcut of Object.values(SHORTCUTS)) {
        const modifierMatch =
          !shortcut.modifiers ||
          shortcut.modifiers.some((mod) => {
            if (mod === 'ctrl') return event.ctrlKey;
            if (mod === 'meta') return event.metaKey;
            if (mod === 'shift') return event.shiftKey;
            if (mod === 'alt') return event.altKey;
            return false;
          });

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const needsModifier = shortcut.modifiers && shortcut.modifiers.length > 0;

        if (keyMatch && modifierMatch && (needsModifier ? hasModifier : !hasModifier)) {
          event.preventDefault();
          handler(shortcut.action);
          resetSequence();
          return;
        }
      }

      // Handle key sequences (only without modifiers)
      if (!hasModifier && !event.shiftKey && !event.altKey) {
        // Reset sequence timeout
        if (sequenceTimeoutRef.current) {
          clearTimeout(sequenceTimeoutRef.current);
        }

        // Add key to sequence
        sequenceRef.current.push(event.key.toLowerCase());

        // Set timeout to reset sequence after 1 second
        sequenceTimeoutRef.current = setTimeout(resetSequence, 1000);

        // Check for matching sequence
        for (const seqShortcut of SEQUENCE_SHORTCUTS) {
          const currentSeq = sequenceRef.current;
          const targetSeq = seqShortcut.sequence;

          // Check if current sequence matches the beginning of a target
          const isPartialMatch = targetSeq
            .slice(0, currentSeq.length)
            .every((key, i) => key === currentSeq[i]);

          if (isPartialMatch) {
            if (currentSeq.length === targetSeq.length) {
              // Full match
              event.preventDefault();
              handler(seqShortcut.action);
              resetSequence();
              return;
            }
            // Partial match, continue waiting
            return;
          }
        }

        // No match found, reset
        resetSequence();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, [enabled, handler, resetSequence]);
}
