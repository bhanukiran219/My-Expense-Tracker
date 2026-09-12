import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { AppState, Budget } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';

interface BudgetsViewProps {
  state: AppState;
  onOpenAddBudget: () => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  state,
  onOpenAddBudget,
  onEditBudget,
  onDeleteBudget,
}) => {
  const [parent] = useAutoAnimate();
  const budgets = state.settings.budgets || [];

  // Calculate current month's expenses per category
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthExpenses = state.transactions.filter((tx) => {
    if (tx.type !== 'expense' || !tx.date) return false;
    const d = new Date(tx.date + 'T00:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const categorySpentMap: Record<string, number> = {};
  for (const tx of currentMonthExpenses) {
    categorySpentMap[tx.category] = (categorySpentMap[tx.category] || 0) + tx.amount;
  }

  // Aggregate health metrics
  const totalBudgetLimit = budgets
    .filter((b) => b.active)
    .reduce((sum, b) => sum + b.monthlyLimit, 0);

  const totalBudgetSpent = budgets
    .filter((b) => b.active)
    .reduce((sum, b) => sum + (categorySpentMap[b.category] || 0), 0);

  const overallPercent = totalBudgetLimit > 0 ? (totalBudgetSpent / totalBudgetLimit) * 100 : 0;
  const isOverallOverBudget = totalBudgetSpent > totalBudgetLimit && totalBudgetLimit > 0;
  const overBudgetCount = budgets.filter(
    (b) => b.active && (categorySpentMap[b.category] || 0) > b.monthlyLimit
  ).length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 1. ACTIVE DETECTION STATUS BANNER */}
      <div className="bg-gradient-to-r from-rose-900 to-orange-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-rose-300 font-bold shrink-0">
            <PieChart className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold">Monthly Category Budgets</h3>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-rose-100/70 mt-0.5">
              Spending vs. monthly limits for {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddBudget}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-rose-600" />
          <span>Create budget</span>
        </button>
      </div>

      {/* 2. BUDGET HEALTH SUMMARY: 2-COL ON MOBILE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Budgeted
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(totalBudgetLimit)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block">
            Across {budgets.filter((b) => b.active).length} active categories
          </span>
        </div>

        <div className="col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 truncate">
            Spent
          </span>
          <div
            className={`text-lg sm:text-2xl font-bold truncate ${
              isOverallOverBudget ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {formatCurrency(totalBudgetSpent)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">
            {formatPercent(overallPercent)} used
          </span>
        </div>

        <div className="col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 truncate">
            Status
          </span>
          {overBudgetCount > 0 ? (
            <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs sm:text-sm truncate">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{overBudgetCount} over</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs sm:text-sm truncate">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">On track</span>
            </div>
          )}
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">
            Left: {formatCurrency(Math.max(0, totalBudgetLimit - totalBudgetSpent))}
          </span>
        </div>
      </div>

      {/* 3. BUDGET LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Active Budgets</h3>
          <span className="text-xs text-slate-500">{budgets.length} total</span>
        </div>

        {budgets.length === 0 ? (
          <div className="py-14 text-center px-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              No category budgets set
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create monthly spending limits for categories like Groceries, Dining, Shopping, or
              Transportation to track pacing automatically.
            </p>
          </div>
        ) : (
          <div ref={parent as any} className="divide-y divide-slate-100">
            {budgets.map((budget) => {
              const spent = categorySpentMap[budget.category] || 0;
              const percent = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
              const isOver = spent > budget.monthlyLimit;
              const remaining = budget.monthlyLimit - spent;

              return (
                <div
                  key={budget.id}
                  className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition gap-3 sm:gap-4 md:gap-0"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                      <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{budget.category}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${budget.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {budget.active ? 'Active' : 'Paused'}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {isOver ? (
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Over by {formatCurrency(Math.abs(remaining))}
                            </span>
                          ) : (
                            <span>Remaining: {formatCurrency(remaining)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto w-full">
                    <div className="text-left md:text-right flex-1 md:flex-initial">
                      <div className="flex items-end md:justify-end gap-1 mb-1">
                        <span className={`font-bold text-sm ${isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatCurrency(spent)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 mb-0.5">
                          / {formatCurrency(budget.monthlyLimit)}
                        </span>
                      </div>
                      
                      {/* Mini Progress Bar */}
                      <div className="w-full md:w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 inline-flex relative">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <div className="text-right mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400">{formatPercent(percent)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditBudget(budget)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                        title="Edit budget"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteBudget(budget.id)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                        title="Delete budget"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
