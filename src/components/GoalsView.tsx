import React from 'react';
import { Target, Plus, Calendar, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { AppState, Goal } from '../types';
import { formatCurrency, formatPercent, formatDateDisplay } from '../utils/currency';

interface GoalsViewProps {
  state: AppState;
  onOpenAddGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  state,
  onOpenAddGoal,
  onEditGoal,
  onDeleteGoal,
}) => {
  const goals = state.settings.goals || [];

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Savings & Milestones</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track dedicated targets for emergency funds, vacations, and large purchases
          </p>
        </div>

        <button
          onClick={onOpenAddGoal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create goal</span>
        </button>
      </div>

      {/* 2. SUMMARY METRICS */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Target
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalTarget)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Across {goals.length} goals</span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Saved
            </span>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalSaved)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {formatPercent(overallProgress)} completed overall
            </span>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Remaining to Save
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(Math.max(0, totalTarget - totalSaved))}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">To reach all milestones</span>
          </div>
        </div>
      )}

      {/* 3. GOALS LIST */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-900">No savings goals created</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Set up goals such as a 6-month Emergency Fund, House Down Payment, or Vacation Fund to
            keep track of your progress.
          </p>
          <button
            onClick={onOpenAddGoal}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create your first goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{goal.name}</h4>
                      {goal.dueDate && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-violet-600" />
                          Target Date: {formatDateDisplay(goal.dueDate)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditGoal(goal)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {goal.note && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                      "{goal.note}"
                    </p>
                  )}

                  {/* Amounts */}
                  <div className="mt-4 flex items-baseline justify-between text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Saved: </span>
                      <strong className="text-slate-900 text-sm font-bold">
                        {formatCurrency(goal.currentAmount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Target: </span>
                      <strong className="text-slate-900 text-sm font-bold">
                        {formatCurrency(goal.targetAmount)}
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(percent, 100)}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-violet-600'
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Footer info */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">
                    {isCompleted ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Target Achieved!
                      </span>
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
