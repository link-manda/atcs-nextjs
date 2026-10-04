/**
 * Isolated worker factory. Kept in its own module because `import.meta.url`
 * is bundler-only syntax; tests mock this module instead of loading it.
 */
export function createInferenceWorker(): Worker {
  return new Worker(new URL("./inference.worker.ts", import.meta.url), { type: "module" });
}
