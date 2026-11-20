import type {
  CalculatorInputs,
  CalculatorResults,
  YearlyProjection,
  CompoundingFrequency,
} from '../types/calculator';

/**
 * Calculate compound interest with optional monthly contributions
 *
 * Formula:
 * - For principal: A = P(1 + r/n)^(nt)
 * - For contributions: FV = PMT × [((1 + r/n)^(nt) - 1) / (r/n)]
 *
 * @param principal - Initial investment amount
 * @param annualRate - Annual interest rate as decimal (e.g., 0.07 for 7%)
 * @param compoundingFrequency - Number of times interest compounds per year
 * @param years - Investment period in years
 * @param monthlyContribution - Monthly deposit amount
 * @returns Complete calculation results with yearly breakdown
 */
export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundingFrequency: CompoundingFrequency,
  years: number,
  monthlyContribution: number
): CalculatorResults {
  const yearlyBreakdown: YearlyProjection[] = [];

  // Year 0: Starting position
  yearlyBreakdown.push({
    year: 0,
    principal: principal,
    contributions: 0,
    interestEarned: 0,
    totalAmount: principal,
  });

  let currentAmount = principal;
  let totalContributions = 0;
  let totalInterestEarned = 0;

  // Daily compounding: exact growth over one month, so 12 months give (1 + r/365)^365
  const dailyMonthFactor = Math.pow(1 + annualRate / 365, 365 / 12) - 1;
  // Annual, semi-annual, quarterly, monthly: months per compounding period (12, 6, 3, 1)
  const monthsPerPeriod = compoundingFrequency === 365 ? 0 : 12 / compoundingFrequency;

  // Calculate year by year
  for (let year = 1; year <= years; year++) {
    const yearStartAmount = currentAmount;
    let yearContributions = 0;
    let yearInterest = 0;
    let accrued = 0;

    for (let month = 1; month <= 12; month++) {
      // Contribution arrives at the start of the month
      currentAmount += monthlyContribution;
      yearContributions += monthlyContribution;

      if (monthsPerPeriod === 0) {
        const interest = currentAmount * dailyMonthFactor;
        currentAmount += interest;
        yearInterest += interest;
      } else {
        // Interest accrues on the balance each month but is only credited, and starts
        // earning interest itself, at the end of each compounding period
        accrued += currentAmount * (annualRate / 12);
        if (month % monthsPerPeriod === 0) {
          currentAmount += accrued;
          yearInterest += accrued;
          accrued = 0;
        }
      }
    }

    totalContributions += yearContributions;
    totalInterestEarned += yearInterest;

    yearlyBreakdown.push({
      year,
      principal: yearStartAmount,
      contributions: yearContributions,
      interestEarned: yearInterest,
      totalAmount: currentAmount,
    });
  }

  const finalAmount = currentAmount;
  const growthRate = principal > 0 ? (finalAmount - principal - totalContributions) / principal : 0;

  return {
    finalAmount,
    totalContributions,
    totalInterest: totalInterestEarned,
    growthRate,
    yearlyBreakdown,
  };
}

/**
 * Generate year-by-year projection for charting
 * @param inputs - Calculator input parameters
 * @returns Array of yearly projections
 */
export function generateProjection(inputs: CalculatorInputs): YearlyProjection[] {
  const results = calculateCompoundInterest(
    inputs.principal,
    inputs.annualRate,
    inputs.compoundingFrequency,
    inputs.years,
    inputs.monthlyContribution
  );

  return results.yearlyBreakdown;
}

/**
 * Calculate what principal is needed to reach a target amount
 * @param targetAmount - Desired final amount
 * @param annualRate - Annual interest rate as decimal
 * @param compoundingFrequency - Compounding frequency
 * @param years - Investment period
 * @param monthlyContribution - Monthly contribution amount
 * @returns Required principal amount
 */
export function calculatePrincipalNeeded(
  targetAmount: number,
  annualRate: number,
  compoundingFrequency: CompoundingFrequency,
  years: number,
  monthlyContribution: number
): number {
  // Use binary search to find the required principal
  let low = 0;
  let high = targetAmount;
  const tolerance = 1; // $1 tolerance

  while (high - low > tolerance) {
    const mid = (low + high) / 2;
    const result = calculateCompoundInterest(
      mid,
      annualRate,
      compoundingFrequency,
      years,
      monthlyContribution
    );

    if (result.finalAmount < targetAmount) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculate the effective annual rate (APY) based on compounding frequency
 * @param annualRate - Nominal annual rate as decimal
 * @param compoundingFrequency - Number of times compounded per year
 * @returns Effective annual rate (APY)
 */
export function calculateAPY(
  annualRate: number,
  compoundingFrequency: CompoundingFrequency
): number {
  return Math.pow(1 + annualRate / compoundingFrequency, compoundingFrequency) - 1;
}
