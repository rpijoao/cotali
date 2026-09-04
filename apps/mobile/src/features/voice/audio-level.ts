const SILENCE_DB = -60;
const MAX_DB = 0;

export type AudioSampleEncoding = 'float32' | 'int16';

/** Converts a PCM chunk from expo-audio into the dB range used by the meter. */
export function pcmBufferToDecibels(
  data: ArrayBuffer,
  encoding: AudioSampleEncoding,
): number {
  const samples =
    encoding === 'int16' ? new Int16Array(data) : new Float32Array(data);

  if (samples.length === 0) return SILENCE_DB;

  let sumOfSquares = 0;
  for (const sample of samples) {
    const normalized = encoding === 'int16' ? sample / 32768 : sample;
    sumOfSquares += normalized * normalized;
  }

  const rms = Math.sqrt(sumOfSquares / samples.length);
  if (!Number.isFinite(rms) || rms <= 0.000001) return SILENCE_DB;

  return Math.min(MAX_DB, Math.max(SILENCE_DB, 20 * Math.log10(rms)));
}
