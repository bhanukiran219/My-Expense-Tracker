import React, { useState, useEffect } from 'react';
import { X, PieChart } from 'lucide-react';
import { Budget } from '../../types';
import { CustomSelect } from '../CustomSelect';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget | null;
  categories: string[];
  existingBudgets: Budget[];
  onSave: (budget: Budget) => void;
  onDelete?: (id: string) => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  budget,
  categories = [],
  existingBudgets = [],
  onSave,
  onDelete,
}) => {
  const safeCategories = categories && categories.length > 0 ? categories : ['Groceries', 'Housing', 'Utilities', 'Dining', 'Transportation', 'Entertainment', 'Healthcare'];
  const safeBudgets = existingBudgets || [];

  const [category, setCategory] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [active, setActive] = useState(true);

  // Filter categories to only those without an existing budget (unless editing)
  const availableCategories = safeCategories.filter(
    (c) => c !== 'Income' && (!safeBudgets.some((b) => b.category === c) || (budget && budget.category === c))
  );

  useEffect(() => {
    if (budget) {
      setCategory(budget.category);
      setMonthlyLimit(budget.monthlyLimit.toString());
      setActive(budget.active);
    } else {
      setCategory(availableCategories[0] || safeCategories[0] || 'Groceries');
      setMonthlyLimit('');
      setActive(true);
    }
  }, [budget, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(monthlyLimit);
    if (!category || isNaN(limit) || limit <= 0) return;

    onSave({
      id: budget?.id || crypto.randomUUID(),
      category,
      monthlyLimit: limit,
      active,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-budget"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {budget ? 'Adjust Category Budget' : 'Create Category Budget'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <CustomSelect
              value={category}
              onChange={setCategory}
              options={availableCategories.map((c) => ({ value: c, label: c }))}
              placeholder="Select category"
              fullWidth
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monthly Spending Limit (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="1"
              min="1"
              required
              placeholder="e.g. 500"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <span>Track budget actively</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {budget && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(budget.id);
                  onClose();
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800"
              >
                Delete Budget
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                id="btn-save-budget-item"
                type="submit"
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
              >
                Save Budget
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
