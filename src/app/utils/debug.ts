export function dbg(...args: any[]) {
  try {
    if (typeof window !== 'undefined' && (window as any).__APP_DEBUG__) {
      console.log(...args);
    }
  } catch (e) {
    // swallow
  }
}
