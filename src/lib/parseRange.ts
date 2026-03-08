/**
 * Parse a page range string like "1-3, 5, 7-9" into an array of page numbers.
 * Returns deduplicated, sorted page numbers clamped between 1 and max.
 */
export function parseRange(input: string, max: number): number[] {
  const pages: number[] = [];
  const parts = input.split(",").map(s => s.trim());
  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      if (isNaN(start) || isNaN(end)) continue;
      for (let i = Math.max(1, start); i <= Math.min(max, end); i++) pages.push(i);
    } else {
      const n = Number(part);
      if (!isNaN(n) && n >= 1 && n <= max) pages.push(n);
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}
