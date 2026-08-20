import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { Rule } from '../../types';
import { CustomSelect } from '../CustomSelect';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule?: Rule | null;
  categories: string[];
  onSave: (rule: Rule) => void;
}

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  rule,
  categories = [],
  onSave,
}) => {
  const safeCategories = categories && categories.length > 0 ? categories : ['Housing', 'Groceries', 'Utilities', 'Dining', 'Transportation', 'Entertainment', 'Healthcare'];

  const [whenText, setWhenText] = useState('');
  const [thenText, setThenText] = useState(safeCategories[0] || 'Housing');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (rule) {
      setWhenText(rule.whenText);
      setThenText(rule.thenText);
      setEnabled(rule.enabled === 1);
    } else {
      setWhenText('');
      setThenText(safeCategories[0] || 'Housing');
      setEnabled(true);
    }
  }, [rule, isOpen, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whenText.trim() || !thenText.trim()) return;

    onSave({
      id: rule?.id || crypto.randomUUID(),
      whenText: whenText.trim(),
      thenText: thenText.trim(),
      enabled: enabled ? 1 : 0,
      createdAt: rule?.createdAt || new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-rule"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {rule ? 'Edit Categorization Rule' : 'Create Categorization Rule'}
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
          <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl text-xs text-violet-900 leading-relaxed">
            Automatic rule engine: matches merchant or description text on imports and applies the chosen category.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              When merchant / source contains <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Starbucks, Uber, Shell, Netflix"
              value={whenText}
              onChange={(e) => setWhenText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Then set category to <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={thenText}
              onChange={setThenText}
              options={safeCategories.map((c) => ({ value: c, label: c }))}
              placeholder="Select category"
              fullWidth
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <span>Rule is active</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="btn-save-rule-item"
              type="submit"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
            >
              Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
