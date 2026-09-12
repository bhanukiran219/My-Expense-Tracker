import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
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
  const [parent] = useAutoAnimate();
  const goals = state.settings.goals || [];

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 1. ACTIVE DETECTION STATUS BANNER */}
      <div className="bg-gradient-to-r from-indigo-900 to-blue-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 font-bold shrink-0">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold">Savings & Milestones</h3>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Active
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-indigo-100/70 mt-0.5">
              Track dedicated targets for emergency funds, vacations, and large purchases
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddGoal}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
          <span>Create goal</span>
        </button>
      </div>

      {/* 2. SUMMARY METRIC CARDS: 2-COL ON MOBILE */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Target
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900">
            {formatCurrency(totalTarget)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block">
            Across {goals.length} goals
          </span>
        </div>

        <div className="col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 truncate">
            Total Saved
          </span>
          <div className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">
            {formatCurrency(totalSaved)}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">
            {formatPercent(overallProgress)} done
          </span>
        </div>

        <div className="col-span-1 bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1 truncate">
            Remaining
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 truncate">
            {formatCurrency(Math.max(0, totalTarget - totalSaved))}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 block truncate">
            To reach goals
          </span>
        </div>
      </div>

      {/* 3. GOALS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Active Goals</h3>
          <span className="text-xs text-slate-500">{goals.length} total</span>
        </div>

        {goals.length === 0 ? (
          <div className="py-14 text-center px-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              No savings goals created
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Set up goals such as a 6-month Emergency Fund, House Down Payment, or Vacation Fund to
              keep track of your progress.
            </p>
          </div>
        ) : (
          <div ref={parent as any} className="divide-y divide-slate-100">
            {goals.map((goal) => {
              const percent = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const isCompleted = goal.currentAmount >= goal.targetAmount;
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

              return (
                <div
                  key={goal.id}
                  className="px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition gap-3 sm:gap-4 md:gap-0"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{goal.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {isCompleted ? 'Achieved' : 'In Progress'}
                        </span>
                        {goal.dueDate && (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {formatDateDisplay(goal.dueDate)}
                          </span>
                        )}
                      </div>
                      {goal.note && (
                        <p className="text-[11px] text-slate-500 italic mt-1">
                          "{goal.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto w-full">
                    <div className="text-left md:text-right flex-1 md:flex-initial">
                      <div className="flex items-end md:justify-end gap-1 mb-1">
                        <span className="font-bold text-sm text-slate-900">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 mb-0.5">
                          / {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      
                      {/* Mini Progress Bar */}
                      <div className="w-full md:w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 inline-flex relative">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
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
                        onClick={() => onEditGoal(goal)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition cursor-pointer"
                        title="Edit goal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGoal(goal.id)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                        title="Delete goal"
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
