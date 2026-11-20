// Run with: npm test (Node 22.6+ strips the TypeScript types itself; no extra dependency)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAPY, calculateCompoundInterest } from '../src/utils/compound-calculations.ts';

const FREQUENCIES = [1, 2, 4, 12, 365] as const;

const close = (actual: number, expected: number, label: string) =>
  assert.ok(Math.abs(actual - expected) < 0.005, `${label}: got ${actual.toFixed(4)}, expected ${expected.toFixed(4)}`);

test('lump sum matches A = P(1 + r/n)^(nt) for every frequency', () => {
  for (const n of FREQUENCIES) {
    const r = calculateCompoundInterest(10_000, 0.05, n, 30, 0);
    close(r.finalAmount, 10_000 * Math.pow(1 + 0.05 / n, n * 30), `n=${n}`);
    close(r.totalInterest, r.finalAmount - 10_000, `n=${n} interest`);
  }
});

test('textbook values: $10,000 at 5% for 30 years', () => {
  const expected = { 1: 43_219.42, 2: 43_997.90, 4: 44_402.13, 12: 44_677.44, 365: 44_812.29 };
  for (const n of FREQUENCIES) {
    const got = calculateCompoundInterest(10_000, 0.05, n, 30, 0).finalAmount;
    assert.equal(got.toFixed(2), expected[n].toFixed(2), `n=${n}`);
  }
});

test('more frequent compounding never pays less', () => {
  const finals = FREQUENCIES.map((n) => calculateCompoundInterest(10_000, 0.05, n, 30, 0).finalAmount);
  for (let i = 1; i < finals.length; i++) assert.ok(finals[i] > finals[i - 1], `n=${FREQUENCIES[i]}`);
});

test('every year in the breakdown grows by the effective annual rate', () => {
  for (const n of FREQUENCIES) {
    const { yearlyBreakdown } = calculateCompoundInterest(10_000, 0.05, n, 5, 0);
    for (const y of yearlyBreakdown.slice(1)) {
      close(y.totalAmount, y.principal * (1 + calculateAPY(0.05, n)), `n=${n} year ${y.year}`);
    }
  }
});

test('monthly compounding, deposits at the start of each month: annuity due', () => {
  const i = 0.05 / 12;
  const N = 12 * 30;
  const g = Math.pow(1 + i, N);
  const r = calculateCompoundInterest(10_000, 0.05, 12, 30, 200);
  close(r.finalAmount, 10_000 * g + 200 * ((g - 1) / i) * (1 + i), 'monthly with deposits');
  assert.equal(r.totalContributions, 200 * N);
});

test('annual compounding, monthly deposits earn simple interest until the year-end credit', () => {
  // Deposit made at the start of month m sits (13 - m) / 12 of a year: 78 / 12 = 6.5 deposit-years.
  let b = 10_000;
  for (let y = 0; y < 10; y++) b = b * 1.05 + 12 * 200 + 6.5 * 200 * 0.05;
  close(calculateCompoundInterest(10_000, 0.05, 1, 10, 200).finalAmount, b, 'annual with deposits');
});

test('quarterly compounding with deposits: interest credited every three months', () => {
  let b = 10_000;
  for (let q = 0; q < 40; q++) b = b * (1 + 0.05 / 4) + 3 * 200 + (3 + 2 + 1) / 12 * 200 * 0.05;
  close(calculateCompoundInterest(10_000, 0.05, 4, 10, 200).finalAmount, b, 'quarterly with deposits');
});

test('zero rate returns exactly what went in', () => {
  for (const n of FREQUENCIES) {
    const r = calculateCompoundInterest(1_000, 0, n, 3, 100);
    close(r.finalAmount, 1_000 + 3600, `n=${n}`);
    close(r.totalInterest, 0, `n=${n} interest`);
  }
});
