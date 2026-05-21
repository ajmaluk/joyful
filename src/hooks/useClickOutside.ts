import { useEffect, useRef, type RefObject } from 'react';

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClickOutside: () => void,
  enabled = true,
) {
  const onClickOutsideRef = useRef(onClickOutside);

  useEffect(() => {
    onClickOutsideRef.current = onClickOutside;
  }, [onClickOutside]);

  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!ref.current) return;
      if (ref.current.contains(target)) return;
      onClickOutsideRef.current();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [enabled, ref]);
}
