import React, { useState, useEffect } from 'react';
import { X, HandCoins } from 'lucide-react';
import { Loan } from '../../types';
import { CustomDatePicker } from '../CustomDatePicker';
import { CustomSelect } from '../CustomSelect';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan?: Loan | null;
  onSave: (loan: Loan) => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({
  isOpen,
  onClose,
  loan,
  onSave,
}) => {
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (loan) {
      setPersonName(loan.personName);
      setType(loan.type);
      setAmount(loan.amount.toString());
      setPaidAmount(loan.paidAmount.toString());
      setDueDate(loan.dueDate || '');
      setNote(loan.note || '');
    } else {
      setPersonName('');
      setType('lent');
      setAmount('');
      setPaidAmount('0');
      setDueDate('');
      setNote('');
    }
  }, [loan, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(amount);
    const current = parseFloat(paidAmount) || 0;
    if (!personName.trim() || isNaN(target) || target <= 0) return;

    onSave({
      id: loan?.id || crypto.randomUUID(),
      personName: personName.trim(),
      type,
      amount: target,
      paidAmount: current,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  const typeOptions = [
    { value: 'lent', label: 'I lent money (Owed to me)' },
    { value: 'borrowed', label: 'I borrowed money (I owe)' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-loan"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <HandCoins className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {loan ? 'Edit Loan & Debt' : 'Add Loan & Debt'}
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
              Person / Entity Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe, Bank"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Type of Loan <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={type}
              onChange={(val) => setType(val as 'lent' | 'borrowed')}
              options={typeOptions}
              placeholder="Select type"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Repaid (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Due Date (Optional)
            </label>
            <CustomDatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select expected repayment date"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly interest of 5%"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
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
              id="btn-save-loan"
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-200 transition"
            >
              Save Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
