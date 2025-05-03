export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const st = setTimeout(() => {
      clearTimeout(st);
      resolve();
    }, ms);
  });
}
