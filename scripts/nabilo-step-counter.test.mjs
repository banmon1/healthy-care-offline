import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countBetweenSamples} from '../src/step-counter.ts';

const sample = (count, date='2026-11-17', boot=42) => ({count,date,boot});
test('first sensor sample is a baseline, never lifetime steps', () => {
  assert.equal(countBetweenSamples(undefined,sample(584320)),0);
});
test('only the difference is added after reopening on the same day and boot', () => {
  assert.equal(countBetweenSamples(sample(584320),sample(584337)),17);
});
test('repeated sensor samples cannot double-count steps', () => {
  assert.equal(countBetweenSamples(sample(120),sample(120)),0);
});
test('device reboot starts a fresh baseline', () => {
  assert.equal(countBetweenSamples(sample(120),sample(3,'2026-11-17',43)),0);
  assert.equal(countBetweenSamples(sample(3,'2026-11-17',43),sample(9,'2026-11-17',43)),6);
});
test('midnight cannot carry yesterday steps into today', () => {
  assert.equal(countBetweenSamples(sample(120,'2026-11-16'),sample(180)),0);
  assert.equal(countBetweenSamples(sample(180),sample(184)),4);
});
test('counter decrease never subtracts from the daily total', () => {
  assert.equal(countBetweenSamples(sample(120),sample(5)),0);
});
test('daily totals survive multiple sensor subscriptions without inflation', () => {
  let total=700;
  let previous=sample(12000);
  for(const current of [sample(12007),sample(12007),sample(12015),sample(12015)]) {
    total+=countBetweenSamples(previous,current);previous=current;
  }
  assert.equal(total,715);
});
