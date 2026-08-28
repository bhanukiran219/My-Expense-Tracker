import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, AlertTriangle } from 'lucide-react';
import { Transaction, TransactionType } from '../../types';
import { updateTransaction } from '../../api';
import { getTagColorClass } from '../../utils/tagColors';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  categories: string[];
  accounts: string[];
  existingTags: string[];
  onSuccess: (updatedTx: Transaction) => void;
  onAddTag: (tagName: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  categories = [],
  accounts = [],
  existingTags = [],
  onSuccess,
  onAddTag,
}) => {
  const safeCategories =
    categories.length > 0
      ? categories
      : ['Needs review', 'Housing', 'Groceries', 'Utilities', 'Dining', 'Transportation', 'Entertainment', 'Healthcare', 'Income'];
  const safeAccounts = accounts.length > 0 ? accounts : ['Main Checking', 'Savings', 'Credit Card'];
  const safeTags = existingTags || [];

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [account, setAccount] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setMerchant(transaction.merchant);
      setDate(transaction.date);
      setCategory(transaction.category || safeCategories[0] || 'Needs review');
      setAccount(transaction.account || safeAccounts[0] || 'Main Checking');
      setSelectedTags(transaction.tags || []);
      setNewTagInput('');
      setError(null);
    }
  }, [isOpen, transaction, safeCategories, safeAccounts]);

  if (!isOpen || !transaction) return null;

  const handleModalClose = () => {
    setError(null);
    onClose();
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    onAddTag(trimmed);
    setNewTagInput('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }

    if (!date) {
      setError('Please select a valid transaction date.');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateTransaction(transaction.id, {
        date,
        merchant: merchant.trim(),
        category: category || 'Needs review',
        amount: parsedAmount,
        type,
        account: account || 'Main Checking',
        tags: selectedTags,
      });

      if (updated) {
        onSuccess(updated);
        handleModalClose();
      } else {
        setError('Failed to update transaction. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div
        id="modal-edit-entry"
        className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200 my-8 transition-all relative max-w-lg"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Edit Transaction
              </h3>
              <p className="text-xs text-slate-500">
                Modify transaction details
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  type === 'expense'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense (-)
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income (+)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-entry-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <CustomDatePicker
                id="input-entry-date"
                value={date}
                onChange={setDate}
                align="right"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Merchant / Source <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-entry-merchant"
              type="text"
              placeholder="e.g. Swiggy, Amazon, Employer Payroll, Rent"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <CustomSelect
                id="select-entry-category"
                value={category}
                onChange={setCategory}
                options={safeCategories.map((c) => ({ value: c, label: c }))}
                placeholder="Select category"
                fullWidth
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Account</label>
              <CustomSelect
                id="select-entry-account"
                value={account}
                onChange={setAccount}
                options={safeAccounts.map((a) => ({ value: a, label: a }))}
                placeholder="Select account"
                fullWidth
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {safeTags.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${getTagColorClass(t)} ${
                      isSelected ? 'ring-2 ring-violet-500 shadow-xs' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add new tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleCreateNewTag}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition"
              >
                Add tag
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                id="btn-save-entry"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
