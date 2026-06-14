export function debounce<Args extends any[]>(fn: (...args: Args) => void, delay = 100) {
  if (delay === 0) {
    return fn;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  return function <U>(this: U, ...args: Args) {
    const context = this;

    clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(context, args);
    }, delay);
  };
}
