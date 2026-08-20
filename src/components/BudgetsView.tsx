import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  TrendingDown,
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
    <div className="space-y-6 pb-12">
      {/* 1. HEADER WITH CREATE ACTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Monthly Category Budgets</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Spending vs. monthly limits for {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <button
          onClick={onOpenAddBudget}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create budget</span>
        </button>
      </div>

      {/* 2. BUDGET HEALTH SUMMARY */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Budgeted
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalBudgetLimit)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Across {budgets.filter((b) => b.active).length} active categories
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Spent This Month
            </span>
            <div
              className={`text-2xl font-bold ${
                isOverallOverBudget ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {formatCurrency(totalBudgetSpent)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {formatPercent(overallPercent)} of total allowance used
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Budget Status
            </span>
            {overBudgetCount > 0 ? (
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{overBudgetCount} category is over budget</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>All active budgets on track</span>
              </div>
            )}
            <span className="text-[11px] text-slate-400 mt-1 block">
              Remaining: {formatCurrency(Math.max(0, totalBudgetLimit - totalBudgetSpent))}
            </span>
          </div>
        </div>
      )}

      {/* 3. BUDGET CARDS GRID */}
      {budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
            <PieChart className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No category budgets set</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create monthly spending limits for categories like Groceries, Dining, Shopping, or
            Transportation to track pacing automatically.
          </p>
          <button
            onClick={onOpenAddBudget}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create your first budget</span>
          </button>
        </div>
      ) : (
        <div ref={parent as any} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map((budget) => {
            const spent = categorySpentMap[budget.category] || 0;
            const percent = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
            const isOver = spent > budget.monthlyLimit;
            const remaining = budget.monthlyLimit - spent;

            return (
              <div
                key={budget.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{budget.category}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">Monthly Budget</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditBudget(budget)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
                        title="Edit budget"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteBudget(budget.id)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                        title="Delete budget"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Amount stats */}
                  <div className="mt-3 flex items-baseline justify-between text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Spent: </span>
                      <strong className={`text-sm ${isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatCurrency(spent)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Limit: </span>
                      <strong className="text-slate-900 text-sm">
                        {formatCurrency(budget.monthlyLimit)}
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(percent, 100)}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? 'bg-rose-500'
                          : percent > 80
                          ? 'bg-amber-500'
                          : 'bg-violet-600'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Footer status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      isOver ? 'text-rose-600' : 'text-slate-600'
                    }`}
                  >
                    {isOver ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Over by {formatCurrency(Math.abs(remaining))}
                      </>
                    ) : (
                      <>Remaining: {formatCurrency(remaining)}</>
                    )}
                  </span>
                  <span className="text-slate-400 text-[11px] font-bold">
                    {formatPercent(percent)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
