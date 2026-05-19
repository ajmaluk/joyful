import { useTypingCycle } from '@/hooks/useTypingCycle';

interface TypingCycleProps {
  texts: string[];
  speed?: number;
  delayBetweenTexts?: number;
  deleteSpeed?: number;
  enabled?: boolean;
  className?: string;
  showCursor?: boolean;
}

/**
 * Component that cycles through multiple texts with typing effect
 * Types out text, reverses it, then shows the next text
 */
export function TypingCycle({
  texts,
  speed = 50,
  delayBetweenTexts = 1500,
  deleteSpeed,
  enabled = true,
  className = '',
  showCursor = true,
}: TypingCycleProps) {
  const { displayText } = useTypingCycle({
    texts,
    speed,
    delayBetweenTexts,
    deleteSpeed,
    enabled,
  });

  return (
    <span className={className}>
      {displayText}
      {showCursor && (
        <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
