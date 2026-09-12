import React, { useState, useEffect } from 'react';
import { X, CreditCard, Home, GraduationCap, Car, HandCoins, AlertCircle } from 'lucide-react';
import { Liability, LiabilityCategory } from '../../types';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  liability?: Liability | null;
  onSave: (liability: Liability) => void;
}

const CATEGORY_OPTIONS: { value: LiabilityCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'credit_card', label: 'Credit Card Balance', icon: <CreditCard className="w-4 h-4 text-rose-500" /> },
  { value: 'mortgage', label: 'Mortgage / Home Loan', icon: <Home className="w-4 h-4 text-amber-500" /> },
  { value: 'auto_loan', label: 'Auto / Vehicle Loan', icon: <Car className="w-4 h-4 text-blue-500" /> },
  { value: 'student_loan', label: 'Student / Education Loan', icon: <GraduationCap className="w-4 h-4 text-violet-500" /> },
  { value: 'personal_loan', label: 'Personal Loan / P2P Debt', icon: <HandCoins className="w-4 h-4 text-emerald-500" /> },
  { value: 'other', label: 'Other Debt / Liability', icon: <AlertCircle className="w-4 h-4 text-slate-500" /> },
];

export const LiabilityModal: React.FC<LiabilityModalProps> = ({
  isOpen,
  onClose,
  liability,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LiabilityCategory>('credit_card');
  const [institution, setInstitution] = useState('');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (liability) {
      setName(liability.name);
      setCategory(liability.category);
      setInstitution(liability.institution || '');
      setAmount(liability.amount.toString());
      setInterestRate(liability.interestRate !== undefined ? liability.interestRate.toString() : '');
      setMonthlyPayment(liability.monthlyPayment !== undefined ? liability.monthlyPayment.toString() : '');
      setDueDate(liability.dueDate || '');
      setNote(liability.note || '');
    } else {
      setName('');
      setCategory('credit_card');
      setInstitution('');
      setAmount('');
      setInterestRate('');
      setMonthlyPayment('');
      setDueDate('');
      setNote('');
    }
  }, [liability, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!name.trim() || isNaN(numericAmount) || numericAmount < 0) return;

    onSave({
      id: liability?.id || crypto.randomUUID(),
      name: name.trim(),
      category,
      institution: institution.trim() || undefined,
      amount: numericAmount,
      interestRate: interestRate.trim() ? parseFloat(interestRate) : undefined,
      monthlyPayment: monthlyPayment.trim() ? parseFloat(monthlyPayment) : undefined,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <CreditCard className="w-5 h-5 text-rose-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {liability ? 'Edit Liability / Debt' : 'Add Liability / Debt'}
              </h3>
              <p className="text-xs text-rose-100/80">
                Track your loans, credit card debts and obligations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-100/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Liability Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chase Sapphire, Home Mortgage, Toyota Auto Loan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={category}
              onChange={(val) => setCategory(val as LiabilityCategory)}
              options={CATEGORY_OPTIONS}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Outstanding Balance <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-semibold text-rose-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Lender / Institution
              </label>
              <input
                type="text"
                placeholder="e.g. Wells Fargo, Discover"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-medium transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Interest Rate (APR %)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 6.25"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-medium transition"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Monthly EMI / Minimum
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-sm font-medium transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Due Date / Payoff Target (Optional)
            </label>
            <CustomDatePicker
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select target payoff date"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Account reference, repayment terms..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-medium transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              {liability ? 'Save Changes' : 'Add Liability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
