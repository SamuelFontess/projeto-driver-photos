/**
 * Parses an environment variable string as a positive integer.
 * Returns `fallback` if the value is absent, non-numeric, or ≤ 0.
 */
export function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
