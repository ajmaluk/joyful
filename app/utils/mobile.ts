export function isMobile() {
  // we use sm: as the breakpoint for mobile. It's currently set to 640px
  // globalThis.innerWidth is undefined during SSR; fallback to 1024 (desktop)
  return (globalThis.innerWidth ?? 1024) < 640;
}
