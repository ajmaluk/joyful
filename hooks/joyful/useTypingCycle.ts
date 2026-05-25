"use client";

import { useState, useEffect } from 'react';

interface UseTypingCycleProps {
  texts: string[];
  speed?: number; // milliseconds per character
  delayBetweenTexts?: number; // delay between text reversal and next text
  deleteSpeed?: number; // speed for deleting text (defaults to speed)
  enabled?: boolean;
}

/**
 * Hook to create a cycling typing effect animation
 * Types out text, reverses it, then moves to the next text
 */
export function useTypingCycle({
  texts,
  speed = 50,
  delayBetweenTexts = 1000,
  deleteSpeed,
  enabled = true,
}: UseTypingCycleProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteSpeedValue = deleteSpeed || speed;
  const currentText = texts[currentIndex];

  useEffect(() => {
    if (!enabled || !currentText) {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const currentCharIndex = displayText.length;

    if (!isDeleting) {
      // Typing mode
      if (currentCharIndex < currentText.length) {
        timeoutId = setTimeout(() => {
          setDisplayText(currentText.substring(0, currentCharIndex + 1));
        }, speed);
      } else {
        // Typing complete, start deleting after delay
        timeoutId = setTimeout(() => {
          setIsDeleting(true);
        }, delayBetweenTexts);
      }
    } else {
      // Deleting mode
      if (currentCharIndex > 0) {
        timeoutId = setTimeout(() => {
          setDisplayText(currentText.substring(0, currentCharIndex - 1));
        }, deleteSpeedValue);
      } else {
        // Deleting complete, move to next text
        setIsDeleting(false);
        setCurrentIndex((prev) => (prev + 1) % texts.length);
        setDisplayText('');
      }
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [displayText, isDeleting, currentText, speed, deleteSpeedValue, delayBetweenTexts, enabled, texts.length]);

  return { displayText, currentIndex, isDeleting };
}
