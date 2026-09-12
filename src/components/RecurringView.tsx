import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Repeat,
  Sparkles,
  Plus,
  Check,
  EyeOff,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  Edit2,
  Trash2,
} from 'lucide-react';
import { AppState, DetectedPattern, RecurringItem } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/currency';
import { detectRecurringPatterns } from '../utils/detection';

interface RecurringViewProps {
  state: AppState;
  onOpenAddModal: () => void;
  onEditItem: (item: RecurringItem) => void;
  onDeleteItem: (id: string) => void;
  onKeepSuggestion: (pattern: DetectedPattern) => void;
  onIgnoreSuggestion: (patternKey: string) => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  state,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onKeepSuggestion,
  onIgnoreSuggestion,
}) => {
  const [parent] = useAutoAnimate();
  // Detect patterns from expense transactions
  const detected = detectRecurringPatterns(
    state.transactions,
    state.settings.dismissedPatterns || []
  ).filter((p) => !p.isSubscription); // Recurring bills

  const confirmedItems = state.settings.recurring || [];

  // Monthly and Annual commitments (confirmed active items)
  let monthlyCommitment = 0;
  for (const item of confirmedItems.filter((i) => i.active)) {
    if (item.cadence === 'weekly') monthlyCommitment += (item.amount * 52) / 12;
    else if (item.cadence === 'biweekly') monthlyCommitment += (item.amount * 26) / 12;
    else if (item.cadence === 'monthly') monthlyCommitment += item.amount;
    else if (item.cadence === 'quarterly') monthlyCommitment += item.amount / 3;
    else if (item.cadence === 'annual') monthlyCommitment += item.amount / 12;
  }
  const annualCommitment = monthlyCommitment * 12;

  // Next expected payment
  const nextPaymentItem = [...confirmedItems]
    .filter((i) => i.active && i.nextDate)
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime())[0];

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* 1. ACTIVE DETECTION STATUS BANNER */}
      <div className="bg-gradient-to-r from-violet-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-violet-300 font-bold shrink-0">
            <Repeat className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold">Automatic Recurring Detection</h3>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
              Analyzing expense cadences across weekly, bi-weekly, monthly, and quarterly intervals.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddModal}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-violet-600" />
          <span>Add recurring payment</span>
        </button>
      </div>

      {/* 2. SUMMARY METRIC CARDS: 2-COL ON MOBILE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 truncate">
            Monthly
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(monthlyCommitment)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">
            {confirmedItems.filter((i) => i.active).length} active
          </span>
        </div>

        <div className="col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 truncate">
            Annual
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(annualCommitment)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">12-month outflow</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Next Payment Due
          </span>
          {nextPaymentItem ? (
            <div>
              <div className="text-sm sm:text-lg font-bold text-slate-900 truncate">{nextPaymentItem.name}</div>
              <span className="text-xs font-semibold text-violet-600">
                {formatDateDisplay(nextPaymentItem.nextDate)} ({formatCurrency(nextPaymentItem.amount)})
              </span>
            </div>
          ) : (
            <div className="text-xs sm:text-sm font-semibold text-slate-400 py-1">None scheduled</div>
          )}
        </div>
      </div>

      {/* 3. DETECTED SUGGESTIONS PANEL */}
      {detected.length > 0 && (
        <div className="bg-violet-50/70 border border-violet-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Detected Recurring Bills ({detected.length})
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500">Review and confirm below</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detected.map((sug) => (
              <div
                key={sug.key}
                className="bg-white p-3.5 sm:p-4 rounded-xl border border-violet-100 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{sug.displayMerchant}</h4>
                      <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium capitalize">
                        {sug.cadence} • {sug.category}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                        sug.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {sug.confidence}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-[11px] sm:text-xs text-slate-600">
                    <span>
                      Avg: <strong>{formatCurrency(sug.averageAmount)}</strong>
                    </span>
                    <span>
                      Monthly eq: <strong>{formatCurrency(sug.monthlyEquivalent)}</strong>
                    </span>
                    <span>
                      Next: <strong>{formatDateDisplay(sug.nextExpectedDate)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onIgnoreSuggestion(sug.key)}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ignore</span>
                  </button>
                  <button
                    onClick={() => onKeepSuggestion(sug)}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Keep / Confirm</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CONFIRMED RECURRING LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Confirmed Recurring Payments</h3>
          <span className="text-xs text-slate-500">{confirmedItems.length} total</span>
        </div>

        {confirmedItems.length === 0 ? (
          <div className="py-12 sm:py-14 text-center px-4 sm:px-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              No confirmed recurring bills yet.
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Transactions with regular cadence (e.g. rent, utilities) will automatically appear as
              suggestions above, or you can add one manually.
            </p>
          </div>
        ) : (
          <div ref={parent as any} className="divide-y divide-slate-100">
            {confirmedItems.map((item) => (
              <div
                key={item.id}
                className="px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-50 transition gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
                    <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">{item.name}</h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 capitalize truncate">
                      {item.cadence} • {item.category} • Next: {formatDateDisplay(item.nextDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className="text-right">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 block">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 font-semibold uppercase">
                      {item.active ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      onClick={() => onEditItem(item)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
                    >
                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
