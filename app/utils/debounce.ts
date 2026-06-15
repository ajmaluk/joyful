type DebouncedFn<Args extends any[]> = {
  (...args: Args): void;
  cancel: () => void;
};

export function debounce<Args extends any[]>(fn: (...args: Args) => void, delay = 100): DebouncedFn<Args> {
  if (delay === 0) {
    const immediateFn = fn as DebouncedFn<Args>;

    immediateFn.cancel = () => {};

    return immediateFn;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = function (this: unknown, ...args: Args) {
    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  } as DebouncedFn<Args>;

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
