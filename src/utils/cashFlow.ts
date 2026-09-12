import { AppState, CashFlowEvent, CashFlowDayProjection } from '../types';

export interface CashFlowForecastResult {
  currentLiquidBalance: number;
  forecastDays: number;
  dailyProjections: CashFlowDayProjection[];
  upcomingEvents: CashFlowEvent[];
  lowestDip: {
    date: string;
    balance: number;
    daysAway: number;
  };
  safeToSpendToday: number;
  safeToSpendWeekend: number;
  dailyDiscretionaryBudget: number;
  totalMonthlyIncome: number;
  totalMonthlyCommitments: number;
  totalMonthlyDiscretionaryPool: number;
  discretionarySpentThisMonth: number;
  remainingDiscretionaryPool: number;
  totalProjectedInflows: number;
  totalProjectedOutflows: number;
  netCashFlowDelta: number;
  nextPaydayDate: string | null;
  daysUntilPayday: number;
  safetyBuffer: number;
  isOverdraftRisk: boolean;
  simulationResult?: {
    isSafe: boolean;
    lowestBalanceAfterSimulation: number;
    difference: number;
  };
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD into a local timezone Date at 00:00:00
 */
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Add days to a Date
 */
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Core Forward-Looking Cash Flow & Safe-to-Spend Forecast Engine
 */
export function generateCashFlowForecast(
  state: AppState,
  options?: {
    forecastDays?: number;
    simulatedExpense?: { amount: number; date: string; title?: string };
    customSafetyBuffer?: number;
    customIncome?: number;
    customPayday?: number;
  }
): CashFlowForecastResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);

  const forecastDays = options?.forecastDays || state.settings?.forecastDays || 30;
  const safetyBuffer = options?.customSafetyBuffer ?? (state.settings?.safetyBufferAmount ?? 10000);
  const monthlySalary = options?.customIncome ?? (state.settings?.expectedMonthlyIncome ?? 104959);
  const paydayDayOfMonth = options?.customPayday ?? (state.settings?.incomePayday ?? 1);

  // 1. Calculate Initial Liquid Cash Balance (Only checking/cash, excluding long-term investments)
  const assets = state.settings?.assets || [];
  const cashAssets = assets.filter((a) => a.category === 'cash');
  let currentLiquidBalance = cashAssets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);

  // Fallback: If no explicit 'cash' assets configured yet, start with 0 so the forecast
  // is cleanly driven by upcoming salary income & committed expenses
  if (currentLiquidBalance < 0) {
    currentLiquidBalance = 0;
  }

  // 2. Generate all upcoming cash flow events over the forecast period (1 full cycle: e.g. Sept 1 - Sept 30)
  const rawEvents: CashFlowEvent[] = [];
  const endDate = addDays(today, forecastDays - 1);
  const endDateStr = toDateStr(endDate);

  // A. Generate Scheduled Paydays / Salary Inflows
  if (monthlySalary > 0) {
    let checkDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
    while (checkDate <= addDays(today, forecastDays + 32)) {
      const year = checkDate.getFullYear();
      const month = checkDate.getMonth();
      const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
      const actualPayday = Math.min(paydayDayOfMonth, maxDaysInMonth);
      const scheduledPayday = new Date(year, month, actualPayday, 0, 0, 0, 0);
      const payDateStr = toDateStr(scheduledPayday);

      if (payDateStr >= todayStr && payDateStr <= endDateStr) {
        rawEvents.push({
          id: `salary-${payDateStr}`,
          title: 'Expected Salary / Income',
          type: 'income',
          category: 'Income',
          amount: monthlySalary,
          date: payDateStr,
          sourceType: 'salary',
        });
      }
      checkDate.setMonth(checkDate.getMonth() + 1);
    }
  }

  // B. Generate Active Recurring Expenses (Rent, Utilities, etc.)
  const recurringItems = (state.settings?.recurring || []).filter((r) => r.active !== false);
  for (const r of recurringItems) {
    let nextDate = r.nextDate ? parseLocalDate(r.nextDate) : new Date(today);
    // If next date was strictly in the past (before today), roll it forward based on cadence
    while (toDateStr(nextDate) < todayStr) {
      if (r.cadence === 'weekly') nextDate = addDays(nextDate, 7);
      else if (r.cadence === 'biweekly') nextDate = addDays(nextDate, 14);
      else if (r.cadence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (r.cadence === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);
    }

    while (toDateStr(nextDate) <= endDateStr) {
      rawEvents.push({
        id: `rec-${r.id}-${toDateStr(nextDate)}`,
        title: r.name,
        type: 'expense',
        category: r.category,
        amount: Number(r.amount) || 0,
        date: toDateStr(nextDate),
        sourceType: 'recurring',
        sourceId: r.id,
        account: r.account,
      });

      if (r.cadence === 'weekly') nextDate = addDays(nextDate, 7);
      else if (r.cadence === 'biweekly') nextDate = addDays(nextDate, 14);
      else if (r.cadence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
      else if (r.cadence === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);
      else nextDate.setMonth(nextDate.getMonth() + 1);
    }
  }

  // C. Generate Active Subscriptions (Netflix, Spotify, Gym, Cloud, etc.)
  const subscriptions = (state.settings?.subscriptions || []).filter((s) => s.active !== false);
  for (const s of subscriptions) {
    let renewalDate = s.nextRenewalDate ? parseLocalDate(s.nextRenewalDate) : new Date(today);
    while (toDateStr(renewalDate) < todayStr) {
      if (s.cadence === 'weekly') renewalDate = addDays(renewalDate, 7);
      else if (s.cadence === 'biweekly') renewalDate = addDays(renewalDate, 14);
      else if (s.cadence === 'quarterly') renewalDate.setMonth(renewalDate.getMonth() + 3);
      else if (s.cadence === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      else renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    while (toDateStr(renewalDate) <= endDateStr) {
      rawEvents.push({
        id: `sub-${s.id}-${toDateStr(renewalDate)}`,
        title: `${s.service} Subscription`,
        type: 'expense',
        category: s.group || 'Subscriptions',
        amount: Number(s.amount) || 0,
        date: toDateStr(renewalDate),
        sourceType: 'subscription',
        sourceId: s.id,
        account: s.account,
      });

      if (s.cadence === 'weekly') renewalDate = addDays(renewalDate, 7);
      else if (s.cadence === 'biweekly') renewalDate = addDays(renewalDate, 14);
      else if (s.cadence === 'quarterly') renewalDate.setMonth(renewalDate.getMonth() + 3);
      else if (s.cadence === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      else renewalDate.setMonth(renewalDate.getMonth() + 1);
    }
  }

  // D. Generate Borrowed Loans Repayments / EMIs
  const loans = state.settings?.loans || [];
  for (const loan of loans) {
    if (loan.type === 'borrowed' && loan.dueDate) {
      const dueDate = parseLocalDate(loan.dueDate);
      const dueDateStr = toDateStr(dueDate);
      if (dueDateStr >= todayStr && dueDateStr <= endDateStr) {
        const remainingAmount = Math.max(0, loan.amount - loan.paidAmount);
        if (remainingAmount > 0) {
          rawEvents.push({
            id: `loan-${loan.id}-${dueDateStr}`,
            title: `Loan Due: ${loan.personName}`,
            type: 'expense',
            category: 'Debt Repayment',
            amount: remainingAmount,
            date: dueDateStr,
            sourceType: 'loan_emi',
            sourceId: loan.id,
          });
        }
      }
    }
  }

  // E. Optional "What-If" Simulated Purchase
  if (options?.simulatedExpense && options.simulatedExpense.amount > 0) {
    rawEvents.push({
      id: `simulated-expense-${options.simulatedExpense.date}`,
      title: options.simulatedExpense.title || 'Simulated Planned Purchase',
      type: 'expense',
      category: 'Simulated',
      amount: options.simulatedExpense.amount,
      date: options.simulatedExpense.date,
      sourceType: 'other',
    });
  }

  // Sort events chronologically
  rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 3. Build Daily Balance Projections Day-by-Day
  const dailyProjections: CashFlowDayProjection[] = [];
  let runningBalance = currentLiquidBalance;
  let minBalance = currentLiquidBalance;
  let minBalanceDate = todayStr;
  let minBalanceDaysAway = 0;
  let totalProjectedInflows = 0;
  let totalProjectedOutflows = 0;

  for (let i = 0; i <= forecastDays; i++) {
    const currentDay = addDays(today, i);
    const dateStr = toDateStr(currentDay);
    const dayEvents = rawEvents.filter((e) => e.date === dateStr);

    const dayInflows = dayEvents
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const dayOutflows = dayEvents
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    totalProjectedInflows += dayInflows;
    totalProjectedOutflows += dayOutflows;

    runningBalance = runningBalance + dayInflows - dayOutflows;

    if (runningBalance < minBalance) {
      minBalance = runningBalance;
      minBalanceDate = dateStr;
      minBalanceDaysAway = i;
    }

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    dailyProjections.push({
      date: dateStr,
      dayLabel: dayFormatter.format(currentDay),
      projectedBalance: runningBalance,
      inflows: dayInflows,
      outflows: dayOutflows,
      netDelta: dayInflows - dayOutflows,
      events: dayEvents,
      isPayday: dayEvents.some((e) => e.sourceType === 'salary'),
    });
  }

  // Tag the lowest dip projection
  const lowestDipDay = dailyProjections.find((p) => p.date === minBalanceDate);
  if (lowestDipDay) {
    lowestDipDay.isLowestDip = true;
  }

  // 4. Calculate Next Payday Information (e.g. October 1, 2026)
  let nextPaydayDate: string | null = null;
  if (monthlySalary > 0) {
    const nextPaydayObj = new Date(today.getFullYear(), today.getMonth() + 1, paydayDayOfMonth, 0, 0, 0, 0);
    nextPaydayDate = toDateStr(nextPaydayObj);
  }
  const daysUntilPayday = nextPaydayDate
    ? Math.max(1, Math.round((parseLocalDate(nextPaydayDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    : forecastDays;

  // 5. Calculate "Safe-to-Spend" Discretionary Budget for the Pay Period
  // Calculate total monthly fixed commitments (recurring bills + subscriptions + EMIs)
  const monthlyRecurringTotal = (state.settings?.recurring || [])
    .filter((r) => r.active !== false)
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const monthlySubsTotal = (state.settings?.subscriptions || [])
    .filter((s) => s.active !== false)
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  const totalMonthlyCommitments = monthlyRecurringTotal + monthlySubsTotal;

  // Discretionary pool available for the full month
  const totalMonthlyDiscretionaryPool = Math.max(
    0,
    monthlySalary - totalMonthlyCommitments - safetyBuffer
  );

  // Track discretionary expenses already spent in current month (excluding fixed bills tagged CashFlow-Paid)
  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const discretionarySpentThisMonth = state.transactions
    .filter((tx) => tx.type === 'expense' && tx.date && tx.date.startsWith(currentMonthPrefix))
    .filter((tx) => !(tx.tags || []).includes('CashFlow-Paid'))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const remainingDiscretionaryPool = Math.max(
    0,
    totalMonthlyDiscretionaryPool - discretionarySpentThisMonth
  );

  const dailyDiscretionaryBudget = Math.max(0, remainingDiscretionaryPool / daysUntilPayday);
  const safeToSpendToday = Math.round(dailyDiscretionaryBudget);
  const safeToSpendWeekend = Math.round(dailyDiscretionaryBudget * 2.5); // Weekend allowance

  const netCashFlowDelta = totalProjectedInflows - totalProjectedOutflows;
  const isOverdraftRisk = minBalance < 0;

  return {
    currentLiquidBalance,
    forecastDays,
    dailyProjections,
    upcomingEvents: rawEvents,
    lowestDip: {
      date: minBalanceDate,
      balance: minBalance,
      daysAway: minBalanceDaysAway,
    },
    safeToSpendToday,
    safeToSpendWeekend,
    dailyDiscretionaryBudget,
    totalMonthlyIncome: monthlySalary,
    totalMonthlyCommitments,
    totalMonthlyDiscretionaryPool,
    discretionarySpentThisMonth,
    remainingDiscretionaryPool,
    totalProjectedInflows,
    totalProjectedOutflows,
    netCashFlowDelta,
    nextPaydayDate,
    daysUntilPayday,
    safetyBuffer,
    isOverdraftRisk,
    simulationResult: options?.simulatedExpense
      ? {
          isSafe: minBalance >= safetyBuffer,
          lowestBalanceAfterSimulation: minBalance,
          difference: options.simulatedExpense.amount,
        }
      : undefined,
  };
}
