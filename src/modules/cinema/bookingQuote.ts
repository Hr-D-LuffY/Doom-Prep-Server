import type { BookingItem } from "./cinema.interface";

export const calculateBooking = (
  bundleSizes: number[],
  groupSize: number,
): BookingItem[] | null => {
  const sizes = [...bundleSizes].sort((a, b) => b - a);

  const minBundles: number[] = new Array<number>(groupSize + 1).fill(Infinity);
  const lastBundle: number[] = new Array<number>(groupSize + 1).fill(0);
  minBundles[0] = 0;

  for (let seats = 1; seats <= groupSize; seats++) {
    for (const size of sizes) {
      if (size > seats) continue;
      const withThisBundle = (minBundles[seats - size] ?? Infinity) + 1;
      if (withThisBundle < (minBundles[seats] ?? Infinity)) {
        minBundles[seats] = withThisBundle;
        lastBundle[seats] = size;
      }
    }
  }

  if ((minBundles[groupSize] ?? Infinity) === Infinity) {
    return null;
  }

  const counts = new Map<number, number>();
  let remaining = groupSize;
  while (remaining > 0) {
    const size = lastBundle[remaining] ?? 0;
    if (size === 0) return null;
    counts.set(size, (counts.get(size) ?? 0) + 1);
    remaining -= size;
  }

  return [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.size - a.size);
};
