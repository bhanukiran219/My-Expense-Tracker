import React, { useState, useEffect } from 'react';
import { X, Landmark, TrendingUp, Building2, Coins, Car, Shield, CircleDollarSign } from 'lucide-react';
import { Asset, AssetCategory } from '../../types';
import { CustomSelect } from '../CustomSelect';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset?: Asset | null;
  onSave: (asset: Asset) => void;
}

const CATEGORY_OPTIONS: { value: AssetCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'cash', label: 'Cash & Bank Accounts', icon: <Landmark className="w-4 h-4 text-emerald-500" /> },
  { value: 'investment', label: 'Stocks & Investments', icon: <TrendingUp className="w-4 h-4 text-blue-500" /> },
  { value: 'real_estate', label: 'Real Estate & Property', icon: <Building2 className="w-4 h-4 text-violet-500" /> },
  { value: 'crypto', label: 'Crypto & Digital Assets', icon: <Coins className="w-4 h-4 text-amber-500" /> },
  { value: 'precious_metals', label: 'Precious Metals (Gold/Silver)', icon: <Shield className="w-4 h-4 text-yellow-500" /> },
  { value: 'vehicle', label: 'Vehicles & Tangibles', icon: <Car className="w-4 h-4 text-rose-500" /> },
  { value: 'other', label: 'Other Alternative Assets', icon: <CircleDollarSign className="w-4 h-4 text-slate-500" /> },
];

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('cash');
  const [institution, setInstitution] = useState('');
  const [value, setValue] = useState('');
  const [growthRate, setGrowthRate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setCategory(asset.category);
      setInstitution(asset.institution || '');
      setValue(asset.value.toString());
      setGrowthRate(asset.growthRate !== undefined ? asset.growthRate.toString() : '');
      setNote(asset.note || '');
    } else {
      setName('');
      setCategory('cash');
      setInstitution('');
      setValue('');
      setGrowthRate('');
      setNote('');
    }
  }, [asset, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseFloat(value);
    if (!name.trim() || isNaN(numericValue) || numericValue < 0) return;

    onSave({
      id: asset?.id || crypto.randomUUID(),
      name: name.trim(),
      category,
      institution: institution.trim() || undefined,
      value: numericValue,
      growthRate: growthRate.trim() ? parseFloat(growthRate) : undefined,
      note: note.trim() || undefined,
      updatedAt: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Landmark className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {asset ? 'Edit Asset' : 'Add New Asset'}
              </h3>
              <p className="text-xs text-emerald-100/80">
                Track your wealth holdings and valuations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Asset Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. High Yield Savings, Vanguard S&P 500, Tesla Model 3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={category}
              onChange={(val) => setCategory(val as AssetCategory)}
              options={CATEGORY_OPTIONS}
              fullWidth
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Value <span className="text-rose-500">*</span>
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
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Institution / Platform
              </label>
              <input
                type="text"
                placeholder="e.g. Chase, Fidelity, Binance"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Est. Annual Growth / Appreciation (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 7.5 (Optional)"
                value={growthRate}
                onChange={(e) => setGrowthRate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                % / yr
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Account number, locker info, maturity date..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium transition"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              {asset ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
