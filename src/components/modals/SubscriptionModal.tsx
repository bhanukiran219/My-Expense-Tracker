import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Cadence, SubscriptionItem } from '../../types';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: SubscriptionItem | null;
  categories: string[];
  accounts: string[];
  onSave: (item: SubscriptionItem) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  item,
  categories = [],
  accounts = [],
  onSave,
}) => {
  const safeCategories = categories && categories.length > 0 ? categories : ['Subscriptions', 'Entertainment', 'Utilities', 'Software'];
  const safeAccounts = accounts && accounts.length > 0 ? accounts : ['Everyday Visa', 'Main Checking'];

  const [service, setService] = useState('');
  const [group, setGroup] = useState(safeCategories[0] || 'Subscriptions');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const [nextRenewalDate, setNextRenewalDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [account, setAccount] = useState(safeAccounts[0] || 'Everyday Visa');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (item) {
      setService(item.service);
      setGroup(item.group || safeCategories[0] || 'Subscriptions');
      setAmount(item.amount.toString());
      setCadence(item.cadence);
      setNextRenewalDate(item.nextRenewalDate);
      setAccount(item.account || safeAccounts[0] || 'Everyday Visa');
      setActive(item.active);
    } else {
      setService('');
      setGroup(safeCategories[0] || 'Subscriptions');
      setAmount('');
      setCadence('monthly');
      setNextRenewalDate(new Date().toISOString().split('T')[0]);
      setAccount(safeAccounts[0] || 'Everyday Visa');
      setActive(true);
    }
  }, [item, isOpen, accounts, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!service.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSave({
      id: item?.id || crypto.randomUUID(),
      service: service.trim(),
      group,
      amount: parsedAmount,
      cadence,
      nextRenewalDate,
      account,
      active,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-subscription"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {item ? 'Edit Subscription' : 'Add Subscription'}
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
              Service / Platform <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix, Spotify, iCloud, ChatGPT Plus, GitHub"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost (₹) <span className="text-rose-500">*</span>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Cycle</label>
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
                placeholder="Select billing cycle"
                fullWidth
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <CustomSelect
                value={group}
                onChange={setGroup}
                options={safeCategories.map((c) => ({ value: c, label: c }))}
                placeholder="Select category"
                fullWidth
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Renewal Date
              </label>
              <CustomDatePicker
                value={nextRenewalDate}
                onChange={setNextRenewalDate}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
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
              <span>Active subscription</span>
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
              id="btn-save-subscription-item"
              type="submit"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
            >
              Save Subscription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
