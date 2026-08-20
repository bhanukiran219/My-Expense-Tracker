import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Sparkles,
  Plus,
  Check,
  EyeOff,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { AppState, DetectedPattern, SubscriptionItem } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/currency';
import { detectRecurringPatterns } from '../utils/detection';

interface SubscriptionsViewProps {
  state: AppState;
  onOpenAddModal: () => void;
  onEditItem: (item: SubscriptionItem) => void;
  onDeleteItem: (id: string) => void;
  onKeepSuggestion: (pattern: DetectedPattern) => void;
  onIgnoreSuggestion: (patternKey: string) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  state,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onKeepSuggestion,
  onIgnoreSuggestion,
}) => {
  const [parent] = useAutoAnimate();
  // Detect subscription patterns from expense transactions
  const detected = detectRecurringPatterns(
    state.transactions,
    state.settings.dismissedPatterns || []
  ).filter((p) => p.isSubscription);

  const confirmedSubs = state.settings.subscriptions || [];

  // Monthly and Annual commitments
  let monthlyTotal = 0;
  for (const item of confirmedSubs.filter((i) => i.active)) {
    if (item.cadence === 'weekly') monthlyTotal += (item.amount * 52) / 12;
    else if (item.cadence === 'biweekly') monthlyTotal += (item.amount * 26) / 12;
    else if (item.cadence === 'monthly') monthlyTotal += item.amount;
    else if (item.cadence === 'quarterly') monthlyTotal += item.amount / 3;
    else if (item.cadence === 'annual') monthlyTotal += item.amount / 12;
  }
  const annualTotal = monthlyTotal * 12;

  // Next renewal
  const nextRenewalItem = [...confirmedSubs]
    .filter((i) => i.active && i.nextRenewalDate)
    .sort((a, b) => new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime())[0];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-900 to-violet-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-purple-300 font-bold shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold">Subscription Intelligence</h3>
            <p className="text-xs text-purple-200 mt-0.5">
              Auto-detecting streaming, SaaS, gym, cloud storage, and membership charges.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4 text-violet-600" />
          <span>Add subscription</span>
        </button>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Monthly Subscriptions
          </span>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyTotal)}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {confirmedSubs.filter((i) => i.active).length} active subscription(s)
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Annual Commitment
          </span>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(annualTotal)}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Projected 1-year total</span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Next Renewal
          </span>
          {nextRenewalItem ? (
            <div>
              <div className="text-lg font-bold text-slate-900">{nextRenewalItem.service}</div>
              <span className="text-xs font-semibold text-violet-600">
                {formatDateDisplay(nextRenewalItem.nextRenewalDate)} (
                {formatCurrency(nextRenewalItem.amount)})
              </span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-400 py-1">None scheduled</div>
          )}
        </div>
      </div>

      {/* 3. DETECTED SUGGESTIONS */}
      {detected.length > 0 && (
        <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">
                Detected Subscriptions ({detected.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">Auto-identified from transactions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {detected.map((sug) => (
              <div
                key={sug.key}
                className="bg-white p-4 rounded-xl border border-purple-100 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{sug.displayMerchant}</h4>
                      <span className="text-[11px] text-slate-500 font-medium capitalize">
                        {sug.cadence} • {sug.category}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        sug.confidence === 'high'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {sug.confidence}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Avg: <strong>{formatCurrency(sug.averageAmount)}</strong>
                    </span>
                    <span>
                      Monthly eq: <strong>{formatCurrency(sug.monthlyEquivalent)}</strong>
                    </span>
                    <span>
                      Renewal: <strong>{formatDateDisplay(sug.nextExpectedDate)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onIgnoreSuggestion(sug.key)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ignore</span>
                  </button>
                  <button
                    onClick={() => onKeepSuggestion(sug)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Keep Subscription</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CONFIRMED SUBSCRIPTIONS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Active Subscriptions</h3>
          <span className="text-xs text-slate-500">{confirmedSubs.length} total</span>
        </div>

        {confirmedSubs.length === 0 ? (
          <div className="py-14 text-center px-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500">No active subscriptions yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Any regular service charges detected in your transaction statements will appear here,
              or you can click "Add subscription" to track one manually.
            </p>
          </div>
        ) : (
          <div ref={parent as any} className="divide-y divide-slate-100">
            {confirmedSubs.map((item) => (
              <div
                key={item.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.service}</h4>
                    <p className="text-[11px] text-slate-500 capitalize">
                      {item.cadence} • {item.group} • Renewal:{' '}
                      {formatDateDisplay(item.nextRenewalDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-bold text-sm text-slate-900 block">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold uppercase">
                      {item.active ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditItem(item)}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                    >
                      <Trash2 className="w-4 h-4" />
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
