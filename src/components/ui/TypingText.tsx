import { useEffect } from 'react';
import { useTypingEffect } from '@/hooks/useTypingEffect';

interface TypingTextProps {
  text: string;
  speed?: number;
  delay?: number;
  enabled?: boolean;
  className?: string;
  showCursor?: boolean;
  onComplete?: () => void;
}

/**
 * Component that displays text with a typing animation effect
 * Shows a cursor after the text while typing
 */
export function TypingText({
  text,
  speed = 50,
  delay = 0,
  enabled = true,
  className = '',
  showCursor = true,
  onComplete,
}: TypingTextProps) {
  const displayText = useTypingEffect({ text, speed, delay, enabled });
  const isComplete = displayText === text;

  // Call onComplete when typing finishes
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {showCursor && !isComplete && (
        <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
