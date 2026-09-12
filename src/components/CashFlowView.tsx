import React, { useState, useMemo } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CheckCircle2,
  Sparkles,
  Calendar,
  DollarSign,
  CreditCard,
  Building2,
  Repeat,
  HelpCircle,
  Settings2,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Zap,
  CheckCircle,
  RotateCcw,
  Clock,
  X,
} from 'lucide-react';
import { AppState, CashFlowEvent, Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { generateCashFlowForecast } from '../utils/cashFlow';
import { CustomDatePicker } from './CustomDatePicker';

export interface CashFlowUndoPayload {
  transactionId?: string;
  event: CashFlowEvent;
  previousDate?: string;
  previousPaidAmount?: number;
}

interface CashFlowViewProps {
  state: AppState;
  onUpdateSettings: (settings: Partial<AppState['settings']>) => Promise<void>;
  onMarkPaid?: (event: CashFlowEvent) => Promise<{ transactionId?: string } | void>;
  onUndoPayment?: (undoData: CashFlowUndoPayload) => Promise<void>;
  onLogTransaction?: (tx: Partial<Transaction>) => Promise<void>;
  onNavigateTab: (tab: any) => void;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  state,
  onUpdateSettings,
  onMarkPaid,
  onUndoPayment,
  onLogTransaction,
  onNavigateTab,
}) => {
  const [parentList] = useAutoAnimate();
  const [forecastDays, setForecastDays] = useState<number>(30);
  const [filterWindow, setFilterWindow] = useState<'all' | '7days' | '14days' | 'incomes'>('all');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isPaidSuccessId, setIsPaidSuccessId] = useState<string | null>(null);
  const [recentlyPaidMap, setRecentlyPaidMap] = useState<
    Record<string, CashFlowUndoPayload & { paidAt: number }>
  >({});
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [lastUndoPayload, setLastUndoPayload] = useState<CashFlowUndoPayload | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoSuccessMessage, setUndoSuccessMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{
    title: string;
    amount: number;
    date: string;
  } | null>(null);

  // "What-If" Purchase Simulator State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulateAmount, setSimulateAmount] = useState('');
  const [simulateDate, setSimulateDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [simulateTitle, setSimulateTitle] = useState('New Laptop / Gadget');

  // Config settings form state
  const [cfgSalary, setCfgSalary] = useState(
    (state.settings?.expectedMonthlyIncome ?? 104959).toString()
  );
  const [cfgPayday, setCfgPayday] = useState(
    (state.settings?.incomePayday ?? 1).toString()
  );
  const [cfgBuffer, setCfgBuffer] = useState(
    (state.settings?.safetyBufferAmount ?? 10000).toString()
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Compute Active Forecast
  const parsedSimulateAmount = parseFloat(simulateAmount) || 0;
  const forecast = useMemo(() => {
    return generateCashFlowForecast(state, {
      forecastDays,
      simulatedExpense:
        isSimulatorOpen && parsedSimulateAmount > 0
          ? {
              amount: parsedSimulateAmount,
              date: simulateDate,
              title: simulateTitle,
            }
          : undefined,
    });
  }, [state, forecastDays, isSimulatorOpen, parsedSimulateAmount, simulateDate, simulateTitle]);

  // Baseline forecast (without simulation) to show comparison
  const baselineForecast = useMemo(() => {
    return generateCashFlowForecast(state, { forecastDays });
  }, [state, forecastDays]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      await onUpdateSettings({
        expectedMonthlyIncome: parseFloat(cfgSalary) || 0,
        incomePayday: parseInt(cfgPayday, 10) || 1,
        safetyBufferAmount: parseFloat(cfgBuffer) || 0,
      });
      setIsConfigModalOpen(false);
    } catch (err) {
      console.error('Failed to save cash flow configuration:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleMarkAsPaid = async (event: CashFlowEvent) => {
    // 1. Calculate previous values for undo
    let previousPaidAmount: number | undefined;
    if (event.sourceType === 'loan_emi' && event.sourceId) {
      previousPaidAmount = (state.settings?.loans || []).find((l) => l.id === event.sourceId)?.paidAmount ?? 0;
    }

    const eventKey = event.sourceId || event.id;
    const undoData: CashFlowUndoPayload & { paidAt: number } = {
      event,
      previousDate: event.date,
      previousPaidAmount,
      paidAt: Date.now(),
    };

    // 2. Set synchronous UI state IMMEDIATELY so the Undo button and Paid badge appear INSTANTLY on click!
    setMarkingPaidId(event.id);
    setRecentlyPaidMap((prev) => ({
      ...prev,
      [event.id]: undoData,
      [eventKey]: undoData,
    }));
    setLastUndoPayload(undoData);
    setSuccessToast({
      title: event.title,
      amount: event.amount,
      date: event.date,
    });

    try {
      let txId: string | undefined;
      if (onMarkPaid) {
        const res = await onMarkPaid(event);
        if (res && res.transactionId) {
          txId = res.transactionId;
        }
      } else if (onLogTransaction) {
        await onLogTransaction({
          merchant: event.title,
          amount: event.amount,
          type: event.type,
          category: event.category,
          account: event.account || 'Main Checking',
          date: new Date().toISOString().split('T')[0],
          tags: ['CashFlow-Paid'],
        });
      }

      if (txId) {
        undoData.transactionId = txId;
        setRecentlyPaidMap((prev) => ({
          ...prev,
          [event.id]: undoData,
          [eventKey]: undoData,
        }));
        setLastUndoPayload(undoData);
      }

      // Keep showing for 30 seconds so user has plenty of time to undo if needed
      setTimeout(() => {
        setRecentlyPaidMap((prev) => {
          const next = { ...prev };
          delete next[event.id];
          delete next[eventKey];
          return next;
        });
      }, 30000);

      setTimeout(() => setSuccessToast(null), 30000);
    } catch (err) {
      console.error('Failed to log paid transaction:', err);
      // Revert if failed
      setRecentlyPaidMap((prev) => {
        const next = { ...prev };
        delete next[event.id];
        delete next[eventKey];
        return next;
      });
      setLastUndoPayload(null);
      setSuccessToast(null);
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleTriggerUndo = async (customPayload?: CashFlowUndoPayload) => {
    const payload = customPayload || lastUndoPayload;
    if (!payload || !onUndoPayment) return;
    try {
      setIsUndoing(true);
      await onUndoPayment(payload);
      const eventKey = payload.event.sourceId || payload.event.id;
      setRecentlyPaidMap((prev) => {
        const next = { ...prev };
        delete next[payload.event.id];
        delete next[eventKey];
        return next;
      });
      setLastUndoPayload(null);
      setSuccessToast(null);
      setUndoSuccessMessage(`Payment for "${payload.event.title}" reverted.`);
      setTimeout(() => setUndoSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to undo payment:', err);
    } finally {
      setIsUndoing(false);
    }
  };

  // Filter events list + seamlessly merge active recently-paid items
  const filteredEvents = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const now = Date.now();
    const activePaidList = (Object.values(recentlyPaidMap) as Array<CashFlowUndoPayload & { paidAt: number }>).filter(
      (p) => now - p.paidAt < 30000
    );

    // Unique by event.id to avoid duplicate map entries
    const seenEventIds = new Set<string>();
    const uniquePaidList: (CashFlowUndoPayload & { paidAt: number })[] = [];
    for (const p of activePaidList) {
      if (!seenEventIds.has(p.event.id)) {
        seenEventIds.add(p.event.id);
        uniquePaidList.push(p);
      }
    }

    const activePaidSourceIds = new Set(
      uniquePaidList.map((p) => p.event.sourceId).filter(Boolean)
    );

    // Filter raw forecast events, hiding future cycle of an item currently shown as recently paid
    const regularEvents = forecast.upcomingEvents.filter((ev) => {
      if (ev.sourceId && activePaidSourceIds.has(ev.sourceId)) {
        return false;
      }
      return true;
    });

    const paidEventItems: CashFlowEvent[] = uniquePaidList.map((p) => ({
      ...p.event,
      isPaid: true,
    }));

    const combined = [...paidEventItems, ...regularEvents];

    return combined.filter((ev) => {
      if (filterWindow === '7days') return ev.date >= today && ev.date <= in7Days;
      if (filterWindow === '14days') return ev.date >= today && ev.date <= in14Days;
      if (filterWindow === 'incomes') return ev.type === 'income';
      return true;
    });
  }, [forecast.upcomingEvents, filterWindow, recentlyPaidMap]);

  // Chart Dimensions & Scaling
  const chartPoints = forecast.dailyProjections;
  const maxBalance = Math.max(...chartPoints.map((p) => p.projectedBalance), 1000);
  const minBalance = Math.min(...chartPoints.map((p) => p.projectedBalance), 0);
  const balanceRange = Math.max(maxBalance - minBalance, 1000);
  const chartHeight = 180;
  const chartWidth = 700;

  const getSvgY = (val: number) => {
    const normalized = (val - minBalance) / balanceRange;
    return chartHeight - normalized * (chartHeight - 30) - 15;
  };

  const pointsString = chartPoints
    .map((p, idx) => {
      const x = (idx / (chartPoints.length - 1 || 1)) * chartWidth;
      const y = getSvgY(p.projectedBalance);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaString = `0,${chartHeight} ${pointsString} ${chartWidth},${chartHeight}`;
  const bufferY = getSvgY(forecast.safetyBuffer);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. HERO BANNER: SAFE-TO-SPEND & CASH FLOW HEADER */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-violet-100/50 via-emerald-50/30 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        {/* TOP ROW: HEADER & ACTION BUTTONS */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 shadow-xs">
                <CalendarClock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-violet-700 bg-violet-50 border border-violet-200 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                Predictive Cash Flow
              </span>
            </div>
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap pt-0.5 sm:pt-1">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
                {formatCurrency(forecast.safeToSpendToday)}
                <span className="text-xs sm:text-base font-semibold text-slate-500 ml-1">/ day</span>
              </h1>
              <span className="text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                {formatCurrency(forecast.safeToSpendWeekend)} this weekend
              </span>
            </div>
          </div>

          {/* Action Buttons: 2-column grid on mobile */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto sm:self-start">
            <button
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs border transition cursor-pointer shadow-xs ${
                isSimulatorOpen
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isSimulatorOpen ? 'Exit' : 'Simulate'}</span>
            </button>

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              <span>Buffer</span>
            </button>
          </div>
        </div>

        {/* FULL-WIDTH EXECUTIVE FINANCIAL FLOW CARDS: 2x2 ON MOBILE */}
        <div className="relative z-10 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-100">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {/* Step 1: Inflow */}
            <div className="p-3 sm:p-4 bg-slate-50/90 hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs transition flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  1. Inflow
                </span>
                <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/50">
                  + Income
                </span>
              </div>
              <div className="text-base sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {formatCurrency(forecast.totalMonthlyIncome)}
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block font-medium truncate">Take-Home</span>
            </div>

            {/* Step 2: Fixed Bills */}
            <div className="p-3 sm:p-4 bg-slate-50/90 hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs transition flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  2. Committed
                </span>
                <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200/50">
                  − Bills
                </span>
              </div>
              <div className="text-base sm:text-2xl font-black text-rose-600 tracking-tight truncate">
                {formatCurrency(forecast.totalMonthlyCommitments)}
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block font-medium truncate">Fixed & Subs</span>
            </div>

            {/* Step 3: Safety Cushion */}
            <div className="p-3 sm:p-4 bg-slate-50/90 hover:bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs transition flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                  3. Safety
                </span>
                <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200/50">
                  − Cushion
                </span>
              </div>
              <div className="text-base sm:text-2xl font-black text-amber-600 tracking-tight truncate">
                {formatCurrency(forecast.safetyBuffer)}
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block font-medium truncate">Reserve</span>
            </div>

            {/* Step 4: Free Cash Pool */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 text-white rounded-2xl shadow-sm border border-violet-500/30 flex flex-col justify-between transition hover:shadow-md">
              <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-violet-200 truncate">
                  4. Free Pool
                </span>
                <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-xs border border-white/10">
                  {forecast.daysUntilPayday}d
                </span>
              </div>
              <div className="text-base sm:text-2xl font-black text-white tracking-tight truncate">
                {formatCurrency(forecast.totalMonthlyDiscretionaryPool)}
              </div>
              <span className="text-[10px] sm:text-xs text-violet-200 mt-0.5 sm:mt-1 block font-medium truncate">
                {formatCurrency(forecast.safeToSpendToday)}/d
              </span>
            </div>
          </div>

          {/* Segmented Income Allocation Bar */}
          {forecast.totalMonthlyIncome > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                <span>Monthly Income Allocation</span>
                <span className="text-slate-400 font-medium">100% of {formatCurrency(forecast.totalMonthlyIncome)}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                <div
                  style={{
                    width: `${Math.min(100, Math.max(5, (forecast.totalMonthlyDiscretionaryPool / forecast.totalMonthlyIncome) * 100))}%`,
                  }}
                  className="h-full bg-violet-600 rounded-l-full"
                  title={`Free Discretionary Pool: ${formatCurrency(forecast.totalMonthlyDiscretionaryPool)}`}
                />
                <div
                  style={{
                    width: `${Math.min(100, Math.max(5, (forecast.totalMonthlyCommitments / forecast.totalMonthlyIncome) * 100))}%`,
                  }}
                  className="h-full bg-rose-500"
                  title={`Committed Fixed Bills: ${formatCurrency(forecast.totalMonthlyCommitments)}`}
                />
                <div
                  style={{
                    width: `${Math.min(100, Math.max(5, (forecast.safetyBuffer / forecast.totalMonthlyIncome) * 100))}%`,
                  }}
                  className="h-full bg-amber-400 rounded-r-full"
                  title={`Safety Buffer: ${formatCurrency(forecast.safetyBuffer)}`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-5 mt-2.5 text-xs text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" />
                  <span>Free to Spend ({Math.round((forecast.totalMonthlyDiscretionaryPool / forecast.totalMonthlyIncome) * 100)}%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <span>Fixed Obligations ({Math.round((forecast.totalMonthlyCommitments / forecast.totalMonthlyIncome) * 100)}%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  <span>Safety Reserve ({Math.round((forecast.safetyBuffer / forecast.totalMonthlyIncome) * 100)}%)</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. TOP METRIC STRIP */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-6 mt-6 border-t border-slate-200">
          {/* Card 1: Lowest Projected Dip */}
          <div
            className={`rounded-2xl p-4 border shadow-xs transition ${
              forecast.isOverdraftRisk
                ? 'bg-rose-50 border-rose-200'
                : forecast.lowestDip.balance < forecast.safetyBuffer
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-emerald-50/50 border-emerald-200/80'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Lowest Balance Point
            </span>
            <div
              className={`text-xl sm:text-2xl font-black ${
                forecast.isOverdraftRisk
                  ? 'text-rose-600'
                  : forecast.lowestDip.balance < forecast.safetyBuffer
                  ? 'text-amber-700'
                  : 'text-emerald-600'
              }`}
            >
              {formatCurrency(forecast.lowestDip.balance)}
            </div>
            <span className="text-[11px] font-medium text-slate-600 mt-0.5 block">
              on {forecast.lowestDip.date} ({forecast.lowestDip.daysAway} days away)
            </span>
          </div>

          {/* Card 2: Upcoming Outflows */}
          <div className="bg-rose-50/50 rounded-2xl p-4 border border-rose-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
              Upcoming Obligations
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600">
              {formatCurrency(forecast.totalProjectedOutflows)}
            </div>
            <span className="text-[11px] font-medium text-rose-700/80 mt-0.5 block">
              {forecast.upcomingEvents.filter((e) => e.type === 'expense').length} committed bills & EMIs
            </span>
          </div>

          {/* Card 3: Next Salary / Income */}
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
              Next Income Arrival
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-600">
              {forecast.daysUntilPayday} <span className="text-xs font-bold text-blue-700">days</span>
            </div>
            <span className="text-[11px] font-medium text-blue-700/80 mt-0.5 block">
              {forecast.nextPaydayDate || 'Configured in settings'}
            </span>
          </div>

          {/* Card 4: 30-Day Net Cash Flow Delta */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Net 30-Day Delta
            </span>
            <div
              className={`text-xl sm:text-2xl font-black ${
                forecast.netCashFlowDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(forecast.netCashFlowDelta, true)}
            </div>
            <span className="text-[11px] font-medium text-slate-600 mt-0.5 block">
              {forecast.netCashFlowDelta >= 0 ? 'Net Cash Surplus' : 'Net Cash Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. "WHAT-IF" PURCHASE SIMULATOR CARD */}
      {isSimulatorOpen && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-3xl p-6 border-2 border-amber-300 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-amber-950">"What-If" Planned Purchase Simulator</h3>
                <p className="text-xs text-amber-800">
                  Test a major purchase to see if it risks upcoming bills or your safety buffer.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSimulatorOpen(false)}
              className="text-amber-700 hover:text-amber-900 font-bold text-xs px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-amber-900 uppercase block mb-1">Item / Expense Name</label>
              <input
                type="text"
                value={simulateTitle}
                onChange={(e) => setSimulateTitle(e.target.value)}
                placeholder="e.g. MacBook Pro, Trip, Watch"
                className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-amber-900 uppercase block mb-1">Purchase Amount (₹)</label>
              <input
                type="number"
                value={simulateAmount}
                onChange={(e) => setSimulateAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-amber-900 uppercase block mb-1">Planned Date</label>
              <CustomDatePicker
                value={simulateDate}
                onChange={(d) => setSimulateDate(d)}
                align="right"
                theme="amber"
              />
            </div>
          </div>

          {parsedSimulateAmount > 0 && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                forecast.lowestDip.balance >= forecast.safetyBuffer
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : forecast.lowestDip.balance >= 0
                  ? 'bg-amber-100/80 border-amber-300 text-amber-950'
                  : 'bg-rose-100/90 border-rose-300 text-rose-950'
              }`}
            >
              {forecast.lowestDip.balance >= forecast.safetyBuffer ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-bold block text-sm">
                  {forecast.lowestDip.balance >= forecast.safetyBuffer
                    ? '✅ Safe to Purchase!'
                    : forecast.lowestDip.balance >= 0
                    ? '⚠️ Caution: Dips below Safety Buffer'
                    : '🚨 High Risk: Causes Overdraft / Negative Balance'}
                </span>
                <span>
                  After spending {formatCurrency(parsedSimulateAmount)}, your lowest projected balance will be{' '}
                  <span className="font-bold">{formatCurrency(forecast.lowestDip.balance)}</span> on {forecast.lowestDip.date} (compared to{' '}
                  {formatCurrency(baselineForecast.lowestDip.balance)} without this purchase).
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. INTERACTIVE 30-DAY BALANCE TRAJECTORY CHART */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              <span>Projected Bank Balance Trajectory</span>
            </h3>
            <p className="text-xs text-slate-400">Daily forecast accounting for all recurring bills and income</p>
          </div>

          <div className="flex items-center gap-2">
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setForecastDays(days)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  forecastDays === days
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative pt-4 pb-2">
          <div className="h-48 w-full">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Safety Buffer Reference Line */}
              {forecast.safetyBuffer > 0 && bufferY >= 0 && bufferY <= chartHeight && (
                <g>
                  <line
                    x1="0"
                    y1={bufferY}
                    x2={chartWidth}
                    y2={bufferY}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text x={chartWidth - 5} y={bufferY - 5} textAnchor="end" className="text-[9px] fill-amber-600 font-bold">
                    Buffer: {formatCurrency(forecast.safetyBuffer)}
                  </text>
                </g>
              )}

              {/* Zero Balance Line if visible */}
              {minBalance < 0 && (
                <line
                  x1="0"
                  y1={getSvgY(0)}
                  x2={chartWidth}
                  y2={getSvgY(0)}
                  stroke="#ef4444"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
              )}

              {/* Area Fill */}
              <polygon points={areaString} fill="url(#balanceGradient)" />

              {/* Line Stroke */}
              <polyline
                fill="none"
                stroke="#7c3aed"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pointsString}
              />

              {/* Milestone Markers */}
              {chartPoints.map((p, idx) => {
                const x = (idx / (chartPoints.length - 1 || 1)) * chartWidth;
                const y = getSvgY(p.projectedBalance);

                if (p.isPayday) {
                  return (
                    <g key={p.date}>
                      <circle cx={x} cy={y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                }

                if (p.isLowestDip) {
                  return (
                    <g key={p.date}>
                      <circle cx={x} cy={y} r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                    </g>
                  );
                }

                return null;
              })}
            </svg>
          </div>

          {/* Chart X-Axis Labels */}
          <div className="flex justify-between text-[11px] font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span>Today ({chartPoints[0]?.date})</span>
            <span>+15 Days</span>
            <span>+{forecastDays} Days ({chartPoints[chartPoints.length - 1]?.date})</span>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-violet-600 inline-block" /> Projected Balance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Scheduled Payday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Lowest Dip Point
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 border-t-2 border-dashed border-amber-500 inline-block" /> Safety Buffer Threshold
            </span>
          </div>
        </div>
      </div>

      {/* 5. UPCOMING FINANCIAL OBLIGATIONS & PAYDAYS TIMELINE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900">Upcoming Inflows & Obligations</h3>
            <p className="text-xs text-slate-400">
              Aggregated from your recurring expenses, subscriptions, active loans, and paydays.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setFilterWindow('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterWindow === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All (30d)
            </button>
            <button
              onClick={() => setFilterWindow('7days')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterWindow === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Next 7 Days
            </button>
            <button
              onClick={() => setFilterWindow('14days')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterWindow === '14days' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Next 14 Days
            </button>
            <button
              onClick={() => setFilterWindow('incomes')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                filterWindow === 'incomes' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Incomes
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No upcoming obligations in this window</h4>
            <p className="text-xs text-slate-400">
              Add recurring bills or subscriptions to build a complete cash flow roadmap.
            </p>
          </div>
        ) : (
          <div ref={parentList as any} className="space-y-2">
            {filteredEvents.map((event) => {
              const isIncome = event.type === 'income';
              const isPaid = Boolean(event.isPaid || recentlyPaidMap[event.id] || isPaidSuccessId === event.id);
              const isLogging = markingPaidId === event.id;

              return (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: isPaid ? [1, 1.015, 1] : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl px-3.5 border transition-all duration-300 ${
                    isPaid
                      ? 'bg-emerald-50/90 border-emerald-300/80 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-400/30'
                      : 'hover:bg-slate-50/70 border-slate-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isPaid
                          ? 'bg-emerald-500 text-white scale-110 shadow-sm shadow-emerald-500/30'
                          : isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : event.sourceType === 'subscription'
                          ? 'bg-violet-50 text-violet-600'
                          : event.sourceType === 'loan_emi'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isPaid ? (
                        <Check className="w-5 h-5 stroke-[2.5]" />
                      ) : isIncome ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : event.sourceType === 'subscription' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : event.sourceType === 'loan_emi' ? (
                        <DollarSign className="w-5 h-5" />
                      ) : (
                        <Repeat className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`font-bold text-sm transition-colors ${
                            isPaid ? 'text-emerald-950' : 'text-slate-900'
                          }`}
                        >
                          {event.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                            isPaid
                              ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300/60'
                              : isIncome
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {event.category}
                        </span>
                        {isPaid && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse">
                            Logged
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600">Due: {event.date}</span>
                        {event.account && (
                          <>
                            <span>•</span>
                            <span>{event.account}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div
                        className={`font-black text-base ${
                          isPaid
                            ? 'text-emerald-700'
                            : isIncome
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(event.amount, isIncome)}
                      </div>
                      <span className="text-[10px] text-slate-400 capitalize">{event.sourceType.replace('_', ' ')}</span>
                    </div>

                    {!isIncome && (
                      <div className="flex items-center gap-2">
                        {isPaid && onUndoPayment && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isUndoing}
                            onClick={(e) => {
                              e.stopPropagation();
                              const undoPayload =
                                (event.sourceId && recentlyPaidMap[event.sourceId]) ||
                                recentlyPaidMap[event.id] ||
                                lastUndoPayload ||
                                undefined;
                              handleTriggerUndo(undoPayload);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 border border-amber-600 transition cursor-pointer disabled:opacity-50"
                            title="Undo this payment and restore schedule"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                            <span>{isUndoing ? 'Undoing...' : 'Undo'}</span>
                          </motion.button>
                        )}

                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.94 }}
                          disabled={isLogging}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPaid) {
                              onNavigateTab('transactions');
                            } else if (!isLogging) {
                              handleMarkAsPaid(event);
                            }
                          }}
                          className={`relative overflow-hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                            isPaid
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                              : isLogging
                              ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20 cursor-wait'
                              : 'bg-slate-100 hover:bg-violet-600 hover:text-white text-slate-700 active:bg-violet-700'
                          }`}
                          title={isPaid ? 'View logged transaction in Transactions tab' : 'Record as paid in your transactions ledger'}
                        >
                          {/* Shimmer pulse effect when completed */}
                          {isPaid && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0.6 }}
                              animate={{ scale: 2.2, opacity: 0 }}
                              transition={{ duration: 0.7, ease: 'easeOut' }}
                              className="absolute inset-0 bg-white/40 rounded-xl pointer-events-none"
                            />
                          )}

                          <AnimatePresence mode="wait" initial={false}>
                            {isPaid ? (
                              <motion.span
                                key="paid"
                                initial={{ opacity: 0, y: 6, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="flex items-center gap-1.5 font-bold"
                              >
                                <motion.span
                                  initial={{ scale: 0, rotate: -45 }}
                                  animate={{ scale: [0, 1.3, 1], rotate: 0 }}
                                  transition={{ duration: 0.4, ease: 'backOut' }}
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </motion.span>
                                <span>Paid & Logged!</span>
                                <ArrowUpRight className="w-3.5 h-3.5 opacity-85" />
                              </motion.span>
                            ) : isLogging ? (
                              <motion.span
                                key="logging"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1.5 text-white"
                              >
                                <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                <span>Logging...</span>
                              </motion.span>
                            ) : (
                              <motion.span
                                key="default"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className="flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Paid</span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. PAYDAY & BUFFER CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Configure Cash Flow Engine</h3>
                  <p className="text-xs text-slate-400">Set your expected income, payday, and safety reserve</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Expected Monthly Income / Salary (₹)
                </label>
                <input
                  type="number"
                  value={cfgSalary}
                  onChange={(e) => setCfgSalary(e.target.value)}
                  placeholder="e.g. 75000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Your primary monthly take-home income.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Primary Payday of Month (1 - 31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={cfgPayday}
                  onChange={(e) => setCfgPayday(e.target.value)}
                  placeholder="e.g. 1 or 25"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">The day of the month your salary is credited.</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Emergency Safety Buffer (₹)
                </label>
                <input
                  type="number"
                  value={cfgBuffer}
                  onChange={(e) => setCfgBuffer(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  The minimum cash balance you never want to dip below.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. FLOATING CELEBRATION & UNDO TOAST (30s Interactive Window) */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h5 className="font-bold text-xs text-white truncate">{successToast.title}</h5>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                      {formatCurrency(successToast.amount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-1">
                    <span>Logged to ledger</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-400/90 font-semibold flex items-center gap-0.5">
                      <Clock className="w-3 h-3 inline" /> 30s Undo
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onUndoPayment && (
                  <button
                    type="button"
                    disabled={isUndoing}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerUndo();
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                    title="Undo this payment and restore schedule"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isUndoing ? 'animate-spin' : ''}`} />
                    <span>{isUndoing ? 'Undoing...' : 'Undo'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onNavigateTab('transactions')}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                >
                  View
                </button>

                <button
                  type="button"
                  onClick={() => setSuccessToast(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 30-Second Animated Countdown Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 30, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400"
              />
            </div>
          </motion.div>
        )}

        {undoSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100%-3rem)] bg-amber-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-amber-600/60 flex items-center gap-3 pointer-events-auto"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-amber-200">Payment Undone</h5>
              <p className="text-[11px] text-slate-300 mt-0.5">{undoSuccessMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
