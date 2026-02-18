const PERF_PREFIX = 'ux:';

export function markUx(name: string): void {
  if (typeof window === 'undefined' || !window.performance?.mark) return;
  window.performance.mark(`${PERF_PREFIX}${name}`);
}

export function measureUx(
  name: string,
  startMark: string,
  endMark: string
): number | null {
  if (typeof window === 'undefined' || !window.performance?.measure) return null;

  const start = `${PERF_PREFIX}${startMark}`;
  const end = `${PERF_PREFIX}${endMark}`;
  const measureName = `${PERF_PREFIX}${name}`;

  try {
    window.performance.measure(measureName, start, end);
    const entries = window.performance.getEntriesByName(measureName, 'measure');
    const latest = entries[entries.length - 1];
    return latest?.duration ?? null;
  } catch {
    return null;
  }
}

export function logUxEvent(eventName: string, metadata?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const now = new Date().toISOString();
  // Placeholder observability layer: can be replaced by analytics provider.
  // Kept centralized so migration to a real telemetry backend is straightforward.
  console.info(`[UX_EVENT] ${eventName}`, { at: now, ...metadata });
}
