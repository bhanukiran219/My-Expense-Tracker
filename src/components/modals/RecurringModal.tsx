import React, { useState, useEffect } from 'react';
import { X, Repeat } from 'lucide-react';
import { Cadence, RecurringItem } from '../../types';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: RecurringItem | null;
  categories: string[];
  accounts: string[];
  onSave: (item: RecurringItem) => void;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  item,
  categories = [],
  accounts = [],
  onSave,
}) => {
  const safeCategories = categories && categories.length > 0 ? categories : ['Housing', 'Utilities', 'Insurance', 'Subscriptions'];
  const safeAccounts = accounts && accounts.length > 0 ? accounts : ['Main Checking', 'Everyday Visa'];

  const [name, setName] = useState('');
  const [category, setCategory] = useState(safeCategories[0] || 'Housing');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState(safeAccounts[0] || 'Main Checking');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setAmount(item.amount.toString());
      setCadence(item.cadence);
      setNextDate(item.nextDate);
      setAccount(item.account || safeAccounts[0] || 'Main Checking');
      setActive(item.active);
    } else {
      setName('');
      setCategory(safeCategories[0] || 'Housing');
      setAmount('');
      setCadence('monthly');
      setNextDate(new Date().toISOString().split('T')[0]);
      setAccount(safeAccounts[0] || 'Main Checking');
      setActive(true);
    }
  }, [item, isOpen, categories, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave({
      id: item?.id || crypto.randomUUID(),
      name: name.trim(),
      category,
      amount: parsedAmount,
      cadence,
      nextDate,
      account,
      active,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-recurring"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Repeat className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {item ? 'Edit Recurring Bill' : 'Add Recurring Payment'}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bill / Payee Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rent, Mortgage, Car Payment, PGE Electric"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cadence</label>
              <CustomSelect
                value={cadence}
                onChange={(val) => setCadence(val as Cadence)}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Bi-weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annual', label: 'Annual' },
                ]}
                placeholder="Select cadence"
                fullWidth
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <CustomSelect
                value={category}
                onChange={setCategory}
                options={safeCategories.map((c) => ({ value: c, label: c }))}
                placeholder="Select category"
                fullWidth
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Expected Date
              </label>
              <CustomDatePicker
                value={nextDate}
                onChange={setNextDate}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Account (Optional)</label>
            <CustomSelect
              value={account}
              onChange={setAccount}
              options={safeAccounts.map((a) => ({ value: a, label: a }))}
              placeholder="Select account"
              fullWidth
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
              />
              <span>Active obligation</span>
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
              id="btn-save-recurring-item"
              type="submit"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
            >
              Save Recurring Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
