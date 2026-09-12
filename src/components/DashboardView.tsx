import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Clock,
  ChevronRight,
  Plus,
  ReceiptText,
  Sparkles,
  ShieldAlert,
  ShoppingCart,
  Utensils,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Briefcase,
  MoreHorizontal,
  CalendarClock,
  ArrowRight,
} from 'lucide-react';
import { AppState, DatePeriod, Transaction } from '../types';
import { formatCurrency, formatPercent, formatDateDisplay } from '../utils/currency';
import { filterTransactionsByPeriod, getPeriodLabel, getPreviousPeriodTransactions } from '../utils/datePeriod';
import { generateCashFlowForecast } from '../utils/cashFlow';
import { PeriodDropdown } from './PeriodDropdown';

interface DashboardViewProps {
  state: AppState;
  period: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
  onNavigateTab: (tab: any) => void;
  onOpenAddEntry: () => void;
}

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('grocer') || cat.includes('shop')) return <ShoppingCart className="w-4 h-4" />;
  if (cat.includes('din') || cat.includes('food')) return <Utensils className="w-4 h-4" />;
  if (cat.includes('hous') || cat.includes('rent') || cat.includes('util')) return <Home className="w-4 h-4" />;
  if (cat.includes('trans') || cat.includes('car') || cat.includes('auto')) return <Car className="w-4 h-4" />;
  if (cat.includes('health') || cat.includes('med')) return <HeartPulse className="w-4 h-4" />;
  if (cat.includes('edu')) return <GraduationCap className="w-4 h-4" />;
  if (cat.includes('work') || cat.includes('job') || cat.includes('income')) return <Briefcase className="w-4 h-4" />;
  return <ReceiptText className="w-4 h-4" />;
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  period,
  onPeriodChange,
  onNavigateTab,
  onOpenAddEntry,
}) => {
  const periodTxs = filterTransactionsByPeriod(state.transactions, period);
  const prevPeriodTxs = getPreviousPeriodTransactions(state.transactions, period);

  // Totals for current period
  const totalIncome = periodTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSpending = periodTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0;

  // Previous period comparisons (only if real data exists in both)
  const prevIncome = prevPeriodTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevSpending = prevPeriodTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const hasPrevData = prevPeriodTxs.length > 0;
  const incomeDelta = hasPrevData && prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : null;
  const spendingDelta = hasPrevData && prevSpending > 0 ? ((totalSpending - prevSpending) / prevSpending) * 100 : null;

  // Net worth calculation
  const netWorth = state.settings.assetsTotal - state.settings.liabilitiesTotal;
  const isNetWorthSet = state.settings.netWorthConfigured;

  // 30-Day Forward-Looking Cash Flow Forecast
  const cashFlowForecast = React.useMemo(() => {
    return generateCashFlowForecast(state, { forecastDays: 30 });
  }, [state]);

  // Category breakdown for list
  const categoryTotals: Record<string, number> = {};
  for (const t of periodTxs) {
    const cat = t.category || 'Needs review';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  }

  const totalActivity = totalSpending + totalIncome;

  const sortedCategories = Object.entries(categoryTotals)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalActivity > 0 ? (amount / totalActivity) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Color palette for categories
  const CAT_COLORS = [
    '#6558D3', // Primary Violet
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#64748B', // Slate
  ];

  // Highest spending category
  const highestSpendCat = sortedCategories.length > 0 && sortedCategories[0].amount > 0 ? sortedCategories[0] : null;

  // 7-month cash flow calculation
  const monthsData: { label: string; income: number; expense: number }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mYear = d.getFullYear();
    const mMonth = d.getMonth();
    const label = d.toLocaleDateString('en-US', { month: 'short' });

    const monthIncome = state.transactions
      .filter((t) => {
        if (t.type !== 'income' || !t.date) return false;
        const td = new Date(t.date + 'T00:00:00');
        return td.getFullYear() === mYear && td.getMonth() === mMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const monthExpense = state.transactions
      .filter((t) => {
        if (t.type !== 'expense' || !t.date) return false;
        const td = new Date(t.date + 'T00:00:00');
        return td.getFullYear() === mYear && td.getMonth() === mMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    monthsData.push({ label, income: monthIncome, expense: monthExpense });
  }

  const maxMonthlyVal = Math.max(
    ...monthsData.map((m) => Math.max(m.income, m.expense)),
    100
  );

  // Recent 5 transactions
  const recentTxs = [...periodTxs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Needs review count
  const needsReviewCount = state.transactions.filter((t) => t.category === 'Needs review').length;

  // Upcoming recurring items
  const upcomingItems = [...(state.settings.recurring || []), ...(state.settings.subscriptions || [])]
    .filter((i) => i.active)
    .sort((a, b) => {
      const dateA = (a as any).nextDate || (a as any).nextRenewalDate || '';
      const dateB = (b as any).nextDate || (b as any).nextRenewalDate || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    })
    .slice(0, 3);

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* CONTEXT HEADER & PERIOD DROPDOWN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Good to see you.
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            A calm overview built only from your saved records.
          </p>
        </div>

        {/* Monthly / Period Dropdown positioned below TopBar Add Entry column */}
        <div className="shrink-0 self-start sm:self-auto">
          <PeriodDropdown period={period} onPeriodChange={onPeriodChange} />
        </div>
      </div>

      {/* 5 SUMMARY CARDS: 2-COL ON MOBILE, 5-COL ON XL */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {/* 1. Net Worth (Dark Card - Prominent Full Width on Mobile) */}
        <div 
          onClick={() => onNavigateTab('net-worth')}
          className="col-span-2 sm:col-span-1 bg-[#0f172a] hover:bg-[#1e293b] rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xs flex flex-col justify-between cursor-pointer transition group"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2 sm:mb-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white transition">Net Worth</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="text-xl sm:text-[26px] font-bold text-white tracking-tight leading-tight">
              {formatCurrency(netWorth)}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 font-normal">
              {state.settings.assetsTotal > 0 || state.settings.liabilitiesTotal > 0
                ? `${state.settings.assets?.length || 0} assets, ${state.settings.liabilities?.length || 0} liabilities`
                : 'Assets minus liabilities'}
            </p>
          </div>

          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-800 text-[11px] sm:text-xs text-slate-400 flex items-center justify-between">
            <span className="text-emerald-400 font-medium group-hover:underline flex items-center gap-1">
              Manage Portfolio &rarr;
            </span>
          </div>
        </div>

        {/* 2. Income (Green Accent Card) */}
        <div className="col-span-1 bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-xs border-t-[3px] border-t-emerald-500 flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-600 mb-1.5 sm:mb-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">Income</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            </div>

            <div className="text-base sm:text-[24px] font-bold text-slate-900 tracking-tight leading-tight truncate">
              {formatCurrency(totalIncome)}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-normal truncate">
              Saved income
            </p>
          </div>

          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs text-slate-400 font-medium truncate">
            {incomeDelta !== null ? (
              <span className={`font-semibold flex items-center gap-0.5 sm:gap-1 truncate ${incomeDelta >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                {incomeDelta >= 0 ? '+' : ''}{Math.round(incomeDelta)}% vs prior
              </span>
            ) : (
              <span>No trend yet</span>
            )}
          </div>
        </div>

        {/* 3. Spending (Orange Accent Card) */}
        <div className="col-span-1 bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-xs border-t-[3px] border-t-amber-500 flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-600 mb-1.5 sm:mb-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">Spending</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            </div>

            <div className="text-base sm:text-[24px] font-bold text-slate-900 tracking-tight leading-tight truncate">
              {formatCurrency(totalSpending)}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-normal truncate">
              Saved expenses
            </p>
          </div>

          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs text-slate-400 font-medium truncate">
            {spendingDelta !== null ? (
              <span className={`font-semibold flex items-center gap-0.5 sm:gap-1 truncate ${spendingDelta <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {spendingDelta >= 0 ? '+' : ''}{Math.round(spendingDelta)}% vs prior
              </span>
            ) : (
              <span>No trend yet</span>
            )}
          </div>
        </div>

        {/* 4. Savings Rate (Blue Accent Card) */}
        <div className="col-span-1 bg-white rounded-2xl p-3 sm:p-5 border border-slate-200 shadow-xs border-t-[3px] border-t-sky-500 flex flex-col justify-between hover:border-slate-300 transition">
          <div>
            <div className="flex items-center justify-between text-slate-600 mb-1.5 sm:mb-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">Savings rate</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            </div>

            <div className="text-base sm:text-[24px] font-bold text-slate-900 tracking-tight leading-tight truncate">
              {formatPercent(savingsRate)}
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 font-normal truncate">
              Income − spending
            </p>
          </div>

          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 text-[10px] sm:text-xs text-slate-400 font-medium truncate">
            {hasPrevData ? (
              <span>Saved {formatCurrency(totalIncome - totalSpending, true)}</span>
            ) : (
              <span>No trend yet</span>
            )}
          </div>
        </div>

        {/* 5. Highest Spending (Purple Card) */}
        <div className="col-span-1 bg-[#5046e5] text-white rounded-2xl p-3 sm:p-5 shadow-xs flex flex-col justify-between hover:bg-[#4338ca] transition">
          <div>
            <div className="flex items-center justify-between text-white/90 mb-1.5 sm:mb-3">
              <span className="text-xs sm:text-sm font-semibold text-white/95 truncate">Top spend</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 shrink-0" />
            </div>

            <div className="text-base sm:text-[24px] font-bold text-white tracking-tight leading-tight truncate">
              {highestSpendCat ? highestSpendCat.name : 'None'}
            </div>
            <p className="text-[10px] sm:text-xs text-white/80 mt-0.5 sm:mt-1 font-normal truncate">
              {highestSpendCat ? formatCurrency(highestSpendCat.amount) : formatCurrency(0)}
            </p>
          </div>

          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-white/20 text-[10px] sm:text-xs text-white/85 font-medium truncate">
            {highestSpendCat ? (
              <span>{Math.round(highestSpendCat.percentage)}% of spending</span>
            ) : (
              <span>No expenses</span>
            )}
          </div>
        </div>
      </div>

      {/* SAFE TO SPEND PREVIEW BANNER */}
      <div
        onClick={() => onNavigateTab('cash-flow')}
        className="bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer hover:shadow-md transition group"
      >
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition">
            <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-violet-200">Safe-to-Spend Forecast</span>
              <span className="text-[9px] sm:text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-bold">
                Next 30 Days
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white mt-0.5 leading-snug">
              Safe to spend today: <span className="font-extrabold text-emerald-300">{formatCurrency(cashFlowForecast.safeToSpendToday)}</span> • {formatCurrency(cashFlowForecast.safeToSpendWeekend)} this weekend
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-violet-100 group-hover:text-white shrink-0">
          <span>Explore Cash Flow Runway</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition" />
        </div>
      </div>

      {/* CASH FLOW & CATEGORY CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Cash Flow Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Cash flow</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-normal">Up to seven months of saved activity</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#5046e5]"></span> Income
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#f97316]"></span> Spending
                </span>
              </div>
            </div>

            {state.transactions.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <ReceiptText className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Import or add transactions to see cash flow.
                </p>
                <button
                  type="button"
                  onClick={onOpenAddEntry}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add your first transaction
                </button>
              </div>
            ) : (
              <div className="pt-4">
                {/* Bar Area with Baseline */}
                <div className="h-48 flex items-end justify-around gap-2 px-4 border-b border-slate-100">
                  {monthsData.map((m, i) => {
                    const incomeH = maxMonthlyVal > 0 && m.income > 0 ? (m.income / maxMonthlyVal) * 160 : 0;
                    const expenseH = maxMonthlyVal > 0 && m.expense > 0 ? (m.expense / maxMonthlyVal) * 160 : 0;

                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative max-w-[48px]">
                        {/* Hover Tooltip */}
                        <div className={`hidden group-hover:block pointer-events-none absolute -top-12 z-20 bg-slate-900 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap transition-all duration-150 ${
                          i >= monthsData.length - 2 ? 'right-0' : i === 0 ? 'left-0' : 'left-1/2 -translate-x-1/2'
                        }`}>
                          <div>{m.label}: +{formatCurrency(m.income)} / -{formatCurrency(m.expense)}</div>
                        </div>

                        {/* Bars Container */}
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-44 pb-0">
                          {/* Income Bar */}
                          <div
                            style={{ height: `${incomeH > 0 ? Math.max(incomeH, 6) : 0}px` }}
                            className={`w-2.5 sm:w-3.5 bg-[#5046e5] rounded-t-full transition-all duration-300 ${
                              incomeH > 0 ? 'opacity-100 group-hover:bg-[#4338ca]' : 'opacity-0'
                            }`}
                          ></div>
                          {/* Spending Bar */}
                          <div
                            style={{ height: `${expenseH > 0 ? Math.max(expenseH, 6) : 0}px` }}
                            className={`w-2.5 sm:w-3.5 bg-[#f97316] rounded-t-full transition-all duration-300 ${
                              expenseH > 0 ? 'opacity-100 group-hover:bg-[#ea580c]' : 'opacity-0'
                            }`}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Month Labels below Baseline */}
                <div className="flex items-center justify-around px-4 pt-2.5">
                  {monthsData.map((m, i) => (
                    <div key={i} className="flex-1 text-center max-w-[48px]">
                      <span className="text-xs font-medium text-slate-500">
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity by Category (1 col) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Activity by Category</h3>
              <span className="text-xs font-semibold text-slate-500">{getPeriodLabel(period)}</span>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500">
                  No records in {getPeriodLabel(period).toLowerCase()}.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Horizontal percentage stack */}
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-100">
                  {sortedCategories.map((c, i) => (
                    <div
                      key={c.name}
                      style={{
                        width: `${c.percentage}%`,
                        backgroundColor: CAT_COLORS[i % CAT_COLORS.length],
                      }}
                      title={`${c.name}: ${formatCurrency(c.amount)} (${formatPercent(c.percentage)})`}
                    ></div>
                  ))}
                </div>

                {/* Category List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 pt-2">
                  {sortedCategories.map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[140px]">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }}
                        ></span>
                        <span className="font-medium text-slate-800 truncate">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-slate-900">{formatCurrency(c.amount)}</span>
                        <span className="text-[11px] text-slate-400 w-9 text-right">
                          {formatPercent(c.percentage)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Volume:</span>
            <span className="font-bold text-slate-900">{formatCurrency(totalActivity)}</span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY & INSIGHTS & COMING UP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Activity (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
            <button
              onClick={() => onNavigateTab('transactions')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1"
            >
              <span>View all transactions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentTxs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              No transactions recorded in this period.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTxs.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs ${
                        tx.type === 'income'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : getCategoryIcon(tx.category)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                        {tx.merchant}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatDateDisplay(tx.date)} •{' '}
                        <span className="text-slate-600 font-medium">{tx.category}</span> •{' '}
                        <span>{tx.account}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${
                        tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {formatCurrency(tx.amount, tx.type === 'income')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Ledgerly Insights & Coming up */}
        <div className="space-y-4 sm:space-y-6">
          {/* Smart Insights Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-violet-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Smart Insights</span>
            </div>

            {needsReviewCount > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  You have <strong className="text-white">{needsReviewCount} transaction(s)</strong>{' '}
                  flagged as <em>Needs review</em>. Assign categories to keep budgets accurate.
                </p>
                <button
                  onClick={() => onNavigateTab('transactions')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Review transactions &rarr;
                </button>
              </div>
            ) : state.transactions.length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                All ledger databases are empty and ready. Drop a CSV statement or connect your daily
                Drive inbox to populate your cash flow metrics.
              </p>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed">
                All transactions are categorized cleanly. Your current savings rate is{' '}
                <strong className="text-emerald-400">{formatPercent(savingsRate)}</strong> for{' '}
                {getPeriodLabel(period).toLowerCase()}.
              </p>
            )}
          </div>

          {/* Coming Up Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-600" />
                <span>Coming Up</span>
              </h3>
              <button
                onClick={() => onNavigateTab('recurring')}
                className="text-xs font-semibold text-violet-600 hover:underline"
              >
                Manage
              </button>
            </div>

            {upcomingItems.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">
                No active recurring bills or subscriptions scheduled.{' '}
                <button
                  onClick={() => onNavigateTab('recurring')}
                  className="text-violet-600 font-semibold hover:underline"
                >
                  Add one in Recurring.
                </button>
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingItems.map((item) => {
                  const title = (item as any).name || (item as any).service;
                  const date = (item as any).nextDate || (item as any).nextRenewalDate;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 block">{title}</span>
                        <span className="text-[11px] text-slate-500">
                          Due: {formatDateDisplay(date)} ({item.cadence})
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
