const SILENCE_DB = -60;
const MAX_DB = 0;

export const METER_BAR_COUNT = 5;

export function normalizeMetering(metering: number | undefined): number {
  if (metering === undefined || !Number.isFinite(metering)) return 0;
  return Math.min(
    1,
    Math.max(0, (metering - SILENCE_DB) / (MAX_DB - SILENCE_DB)),
  );
}

export function activeMeterBars(metering: number | undefined): number {
  return Math.round(normalizeMetering(metering) * METER_BAR_COUNT);
}
