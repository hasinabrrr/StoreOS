/**
 * StoreOS Minor-Unit Currency Helper (Integer math)
 * 1 BDT = 100 Poisha. All financial values stored as bigint / integer minor units.
 */

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function toMajorUnits(minorAmount: number | bigint): number {
  return Number(minorAmount) / 100;
}

export function formatBDT(minorAmount: number | bigint): string {
  const major = toMajorUnits(minorAmount);
  return `৳ ${major.toLocaleString('en-US', {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

