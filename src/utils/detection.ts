import { Cadence, DetectedPattern, Transaction } from '../types';

const SUBSCRIPTION_HINTS = [
  'netflix',
  'spotify',
  'hulu',
  'disney',
  'youtube',
  'icloud',
  'dropbox',
  'adobe',
  'microsoft',
  'amazon prime',
  'patreon',
  'membership',
  'studio',
  'gym',
  'openai',
  'chatgpt',
  'canva',
  'notion',
  'zoom',
  'slack',
  'github',
];

const RECURRING_HINTS = [
  'mortgage',
  'rent',
  'loan',
  'insurance',
  'utility',
  'utilities',
  'electric',
  'water',
  'internet',
  'phone',
  'mobile',
  'daycare',
  'tuition',
  'lease',
  'car payment',
  'auto payment',
  'hoa',
  'property tax',
];

export function normalizeMerchant(merchant: string): string {
  if (!merchant) return '';
  let m = merchant.toLowerCase().trim();
  // Remove punctuation
  m = m.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  // Remove terminal # plus digits
  m = m.replace(/#\s*\d+$/g, '');
  // Remove long reference number sequences (4+ digits)
  m = m.replace(/\b\d{4,}\b/g, '');
  // Collapse whitespace
  m = m.replace(/\s+/g, ' ').trim();
  return m;
}

export function detectRecurringPatterns(
  transactions: Transaction[],
  dismissedKeys: string[] = []
): DetectedPattern[] {
  // Only expense transactions
  const expenseTxs = transactions.filter((t) => t.type === 'expense' && t.amount > 0 && t.date);

  // Group by normalized merchant
  const groups: Record<string, Transaction[]> = {};
  const displayNames: Record<string, string> = {};
  const categories: Record<string, string> = {};

  for (const tx of expenseTxs) {
    const norm = normalizeMerchant(tx.merchant);
    if (!norm) continue;

    if (!groups[norm]) {
      groups[norm] = [];
      displayNames[norm] = tx.merchant;
      categories[norm] = tx.category;
    }
    groups[norm].push(tx);
  }

  const detected: DetectedPattern[] = [];

  for (const [normMerchant, txList] of Object.entries(groups)) {
    // Require at least 2 unique transaction dates
    const uniqueDates = Array.from(new Set(txList.map((t) => t.date))).sort();
    if (uniqueDates.length < 2) continue;

    // Sort transactions by date ascending
    const sortedTxs = [...txList].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate intervals between consecutive unique dates
    const intervals: number[] = [];
    for (let i = 1; i < uniqueDates.length; i++) {
      const d1 = new Date(uniqueDates[i - 1] + 'T00:00:00').getTime();
      const d2 = new Date(uniqueDates[i] + 'T00:00:00').getTime();
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    if (intervals.length === 0) continue;

    // Determine cadence from intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    let cadence: Cadence | null = null;

    if (avgInterval >= 5 && avgInterval <= 9) cadence = 'weekly';
    else if (avgInterval >= 12 && avgInterval <= 17) cadence = 'biweekly';
    else if (avgInterval >= 24 && avgInterval <= 40) cadence = 'monthly';
    else if (avgInterval >= 75 && avgInterval <= 110) cadence = 'quarterly';
    else if (avgInterval >= 330 && avgInterval <= 400) cadence = 'annual';

    if (!cadence) continue; // Interval does not fit standard recurrence window

    // Calculate amounts statistics
    const amounts = sortedTxs.map((t) => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmount = Math.max(...amounts);
    const minAmount = Math.min(...amounts);
    const amountVariation = avgAmount > 0 ? (maxAmount - minAmount) / avgAmount : 0;

    // Check hints
    const hasSubHint =
      categories[normMerchant]?.toLowerCase().includes('subscription') ||
      SUBSCRIPTION_HINTS.some((h) => normMerchant.includes(h)) ||
      sortedTxs.some((t) => t.tags.some((tag) => tag.toLowerCase().includes('subscription')));

    const hasBillHint =
      RECURRING_HINTS.some((h) => normMerchant.includes(h)) ||
      categories[normMerchant]?.toLowerCase().includes('utilities') ||
      categories[normMerchant]?.toLowerCase().includes('insurance') ||
      categories[normMerchant]?.toLowerCase().includes('housing');

    // Amount variation checks
    if (hasSubHint && amountVariation > 0.20) continue; // 20% limit
    if (!hasSubHint && hasBillHint && amountVariation > 0.35) continue; // 35% limit

    // Protection against false positives: no strong hint
    if (!hasSubHint && !hasBillHint) {
      if (
        uniqueDates.length < 3 ||
        amountVariation > 0.03 ||
        (cadence !== 'monthly' && cadence !== 'quarterly' && cadence !== 'annual')
      ) {
        continue;
      }
    }

    // Interval jitter check
    const maxInterval = Math.max(...intervals);
    const minInterval = Math.min(...intervals);
    const intervalJitter = maxInterval - minInterval;

    // Confidence
    let confidence: 'high' | 'likely' = 'likely';
    if (uniqueDates.length >= 3 && amountVariation <= 0.12 && intervalJitter <= 5) {
      confidence = 'high';
    }

    // Monthly equivalent
    let monthlyEquivalent = avgAmount;
    if (cadence === 'weekly') monthlyEquivalent = (avgAmount * 52) / 12;
    else if (cadence === 'biweekly') monthlyEquivalent = (avgAmount * 26) / 12;
    else if (cadence === 'monthly') monthlyEquivalent = avgAmount;
    else if (cadence === 'quarterly') monthlyEquivalent = avgAmount / 3;
    else if (cadence === 'annual') monthlyEquivalent = avgAmount / 12;

    // Calculate next expected date
    const lastDateStr = uniqueDates[uniqueDates.length - 1];
    const lastDate = new Date(lastDateStr + 'T00:00:00');
    const nextDate = new Date(lastDate);

    if (cadence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
    else if (cadence === 'biweekly') nextDate.setDate(nextDate.getDate() + 14);
    else if (cadence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (cadence === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (cadence === 'annual') nextDate.setFullYear(nextDate.getFullYear() + 1);

    const nextDateStr = nextDate.toISOString().split('T')[0];
    const patternKey = `pattern_${normMerchant}_${cadence}`;

    if (dismissedKeys.includes(patternKey)) {
      continue;
    }

    detected.push({
      key: patternKey,
      normalizedMerchant: normMerchant,
      displayMerchant: displayNames[normMerchant],
      category: categories[normMerchant] || 'Subscriptions',
      cadence,
      occurrenceCount: uniqueDates.length,
      averageAmount: avgAmount,
      monthlyEquivalent,
      confidence,
      nextExpectedDate: nextDateStr,
      isSubscription: hasSubHint,
      lastTransactionDate: lastDateStr,
      amountVariation,
    });
  }

  return detected.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent);
}
