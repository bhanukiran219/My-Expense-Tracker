import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { HandCoins, Plus, Edit2, Trash2 } from 'lucide-react';
import { AppState, Loan } from '../types';
import { formatCurrency } from '../utils/currency';

interface LoansViewProps {
  state: AppState;
  onOpenAddLoan: () => void;
  onEditLoan: (loan: Loan) => void;
  onDeleteLoan: (id: string) => void;
}

export const LoansView: React.FC<LoansViewProps> = ({
  state,
  onOpenAddLoan,
  onEditLoan,
  onDeleteLoan,
}) => {
  const [parent] = useAutoAnimate();
  const loans = state.settings.loans || [];

  // Metrics calculations
  const totalOwedToYou = loans
    .filter((l) => l.type === 'lent')
    .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0);

  const totalYouOwe = loans
    .filter((l) => l.type === 'borrowed')
    .reduce((sum, l) => sum + (l.amount - l.paidAmount), 0);

  const netBalance = totalOwedToYou - totalYouOwe;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 1. ACTIVE DETECTION STATUS BANNER */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 font-bold shrink-0">
            <HandCoins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">Loans & Debts Tracker</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Active
              </span>
            </div>
            <p className="text-xs text-emerald-100/70 mt-0.5">
              Manage money you lent to friends or borrowed from others.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddLoan}
          className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>Add loan / debt</span>
        </button>
      </div>

      {/* 2. SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Owed To You
          </span>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalOwedToYou)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Money expected to return
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total You Owe
          </span>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalYouOwe)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Money you need to pay back
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Net Balance
          </span>
          <div>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance)}
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {netBalance >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CONFIRMED LOANS LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Active Loans & Debts</h3>
          <span className="text-xs text-slate-500">{loans.length} total</span>
        </div>

        {loans.length === 0 ? (
          <div className="py-14 text-center px-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              No loans or debts tracked yet.
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click the "Add loan / debt" button above to start tracking money you've lent to friends or borrowed from others.
            </p>
          </div>
        ) : (
          <div ref={parent as any} className="divide-y divide-slate-100">
            {loans.map((loan) => {
              const isLent = loan.type === 'lent';
              const progress = Math.min(100, Math.max(0, (loan.paidAmount / loan.amount) * 100));
              const isFullyPaid = progress >= 100;

              return (
                <div
                  key={loan.id}
                  className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition gap-4 md:gap-0"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${isLent ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <HandCoins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{loan.personName}</h4>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isLent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isLent ? 'You Lent' : 'You Borrowed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {loan.dueDate ? `Due: ${new Date(loan.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No due date set'}
                        {loan.note ? ` • ${loan.note}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 md:w-auto w-full">
                    <div className="text-left md:text-right flex-1 md:flex-initial">
                      <div className="flex items-end md:justify-end gap-1 mb-1">
                        <span className="font-bold text-sm text-slate-900">
                          {formatCurrency(loan.paidAmount)}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 mb-0.5">
                          / {formatCurrency(loan.amount)}
                        </span>
                      </div>
                      
                      {/* Mini Progress Bar */}
                      <div className="w-full md:w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1 inline-flex">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isFullyPaid ? 'bg-emerald-500' : isLent ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onEditLoan(loan)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition cursor-pointer"
                        title="Edit / Add Repayment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteLoan(loan.id)}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                        title="Delete Loan"
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
