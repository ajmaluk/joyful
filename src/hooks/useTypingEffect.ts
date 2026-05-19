import { useState, useEffect } from 'react';

interface UseTypingEffectProps {
  text: string;
  speed?: number; // milliseconds per character
  delay?: number; // delay before starting animation
  enabled?: boolean;
}

/**
 * Hook to create a typing effect animation
 * Returns the current visible text as it's being typed out
 */
export function useTypingEffect({
  text,
  speed = 50,
  delay = 0,
  enabled = true,
}: UseTypingEffectProps) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text);
      return;
    }

    let currentIndex = 0;
    let timeoutId: NodeJS.Timeout;
    let delayTimeoutId: NodeJS.Timeout;

    const startTyping = () => {
      const typeNextCharacter = () => {
        if (currentIndex < text.length) {
          setDisplayText(text.substring(0, currentIndex + 1));
          currentIndex++;
          timeoutId = setTimeout(typeNextCharacter, speed);
        }
      };

      typeNextCharacter();
    };

    if (delay > 0) {
      delayTimeoutId = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(delayTimeoutId);
    };
  }, [text, speed, delay, enabled]);

  return displayText;
}
