import { DatePeriod, Transaction } from '../types';

export function getPeriodLabel(period: DatePeriod): string {
  switch (period) {
    case 'all-time':
      return 'All time';
    case 'this-month':
      return 'This month';
    case 'last-month':
      return 'Last month';
    case 'last-3-months':
      return 'Last 3 months';
    case 'last-6-months':
      return 'Last 6 months';
    case 'this-year':
      return 'This year';
    default:
      return 'All time';
  }
}

export function filterTransactionsByPeriod(transactions: Transaction[], period: DatePeriod): Transaction[] {
  if (period === 'all-time') {
    return transactions;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  return transactions.filter((tx) => {
    if (!tx.date) return false;
    const txDate = new Date(tx.date + 'T00:00:00');
    if (isNaN(txDate.getTime())) return false;

    const txYear = txDate.getFullYear();
    const txMonth = txDate.getMonth();

    if (period === 'this-month') {
      return txYear === currentYear && txMonth === currentMonth;
    }

    if (period === 'last-month') {
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return txYear === prevYear && txMonth === prevMonth;
    }

    if (period === 'last-3-months') {
      const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
      return txDate >= threeMonthsAgo && txDate <= now;
    }

    if (period === 'last-6-months') {
      const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
      return txDate >= sixMonthsAgo && txDate <= now;
    }

    if (period === 'this-year') {
      return txYear === currentYear;
    }

    return true;
  });
}

export function getPreviousPeriodTransactions(transactions: Transaction[], period: DatePeriod): Transaction[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (period === 'this-month') {
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date + 'T00:00:00');
      return txDate.getFullYear() === prevYear && txDate.getMonth() === prevMonth;
    });
  }

  if (period === 'last-month') {
    const twoMonthsAgoMonth = currentMonth <= 1 ? currentMonth + 10 : currentMonth - 2;
    const twoMonthsAgoYear = currentMonth <= 1 ? currentYear - 1 : currentYear;
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date + 'T00:00:00');
      return txDate.getFullYear() === twoMonthsAgoYear && txDate.getMonth() === twoMonthsAgoMonth;
    });
  }

  if (period === 'this-year') {
    const prevYear = currentYear - 1;
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date + 'T00:00:00');
      return txDate.getFullYear() === prevYear;
    });
  }

  return [];
}
