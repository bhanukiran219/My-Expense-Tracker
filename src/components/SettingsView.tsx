import React, { useState } from 'react';
import {
  Wallet,
  Building2,
  Database,
  Trash2,
  Plus,
  Check,
  Save,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AppState, Settings, STARTER_CATEGORIES, STARTER_ACCOUNTS } from '../types';
import { formatCurrency } from '../utils/currency';

interface SettingsViewProps {
  state: AppState;
  onUpdateSettings: (settings: Partial<Settings>) => Promise<void>;
  onOpenWipeData: () => void;
  onResetDemoData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onUpdateSettings,
  onOpenWipeData,
  onResetDemoData,
}) => {
  const settings = state.settings;

  // Net worth fields state
  const [assets, setAssets] = useState((settings?.assetsTotal ?? 0).toString());
  const [liabilities, setLiabilities] = useState((settings?.liabilitiesTotal ?? 0).toString());
  const [isSavingNetWorth, setIsSavingNetWorth] = useState(false);
  const [netWorthSavedSuccess, setNetWorthSavedSuccess] = useState(false);

  // Accounts state
  const [newAccount, setNewAccount] = useState('');
  const [accounts, setAccounts] = useState<string[]>(settings?.accounts?.length ? settings.accounts : STARTER_ACCOUNTS);

  // Categories state
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(settings?.categories?.length ? settings.categories : STARTER_CATEGORIES);

  const parsedAssets = parseFloat(assets) || 0;
  const parsedLiabilities = parseFloat(liabilities) || 0;
  const computedNetWorth = parsedAssets - parsedLiabilities;

  const handleSaveNetWorth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNetWorth(true);
    try {
      await onUpdateSettings({
        assetsTotal: parsedAssets,
        liabilitiesTotal: parsedLiabilities,
        netWorthConfigured: true,
      });
      setNetWorthSavedSuccess(true);
      setTimeout(() => setNetWorthSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save net worth:', err);
    } finally {
      setIsSavingNetWorth(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAccount.trim();
    if (!trimmed || accounts.includes(trimmed)) return;
    const updated = [...accounts, trimmed];
    setAccounts(updated);
    setNewAccount('');
    await onUpdateSettings({ accounts: updated });
  };

  const handleDeleteAccount = async (accName: string) => {
    if (accounts.length <= 1) {
      alert('You must keep at least one active account.');
      return;
    }
    const updated = accounts.filter((a) => a !== accName);
    setAccounts(updated);
    await onUpdateSettings({ accounts: updated });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setCategories(updated);
    setNewCategory('');
    await onUpdateSettings({ categories: updated });
  };

  const handleDeleteCategory = async (catName: string) => {
    if (categories.length <= 1) {
      alert('You must keep at least one category.');
      return;
    }
    const updated = categories.filter((c) => c !== catName);
    setCategories(updated);
    await onUpdateSettings({ categories: updated });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. NET WORTH CONFIGURATION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Net Worth Configuration</h3>
            <p className="text-xs text-slate-500">
              Calculate balance sheet total across liquid cash, investments, real estate, and debts
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveNetWorth} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Assets (₹) <span className="text-slate-400 font-normal">(Cash, 401k, Brokerage, Home)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={assets}
                onChange={(e) => setAssets(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Liabilities (₹) <span className="text-slate-400 font-normal">(Mortgage, Auto, Cards, Loans)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={liabilities}
                onChange={(e) => setLiabilities(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Calculated Net Worth:
            </span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(computedNetWorth)}
            </span>
          </div>

          <div className="flex justify-end items-center gap-3 pt-2">
            {netWorthSavedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Net worth saved to dashboard
              </span>
            )}
            <button
              type="submit"
              disabled={isSavingNetWorth}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingNetWorth ? 'Saving...' : 'Save Net Worth'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. ACCOUNTS MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Financial Accounts</h3>
            <p className="text-xs text-slate-500">Checking, savings, credit cards, and brokerages</p>
          </div>
        </div>

        <form onSubmit={handleAddAccount} className="flex gap-2">
          <input
            type="text"
            placeholder="Add account name (e.g. Chase Sapphire, Apple Card)..."
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            Add Account
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {accounts.map((acc) => (
            <div
              key={acc}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
            >
              <span>{acc}</span>
              <button
                onClick={() => handleDeleteAccount(acc)}
                className="text-slate-400 hover:text-rose-600 transition"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CATEGORY MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Expense & Income Categories</h3>
        <p className="text-xs text-slate-500">
          Standardized buckets for your budget and recurring expense analysis
        </p>

        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            placeholder="New category name (e.g. Pets, Subscriptions, Education)..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            Add Category
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => (
            <div
              key={cat}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
            >
              <span>{cat}</span>
              {cat !== 'Needs review' && (
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="text-slate-400 hover:text-rose-600 transition"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. DATABASE & STORAGE ENGINE STATUS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Database & Object Storage Status</h3>
            <p className="text-xs text-slate-500">Fast Local SQLite Engine & Document Vault</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-700 block">D1 Primary Database:</span>
            <span className="text-emerald-600 font-bold">Local Sync Connected (Zero Latency)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-700 block">R2 Object Vault:</span>
            <span className="text-emerald-600 font-bold">Encrypted Document Storage Active</span>
          </div>
        </div>

        {/* Demo data / Wipe data actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            onClick={onResetDemoData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Demo Dataset</span>
          </button>

          <button
            onClick={onOpenWipeData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe All Financial Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
