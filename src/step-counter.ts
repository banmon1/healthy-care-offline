export type StepSample = { date: string; count: number; boot: number };

export function countBetweenSamples(previous: StepSample | undefined, current: StepSample) {
  if (!previous || previous.date !== current.date || previous.boot !== current.boot) return 0;
  return Math.max(0, current.count - previous.count);
}
