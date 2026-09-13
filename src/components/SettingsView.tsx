import React, { useState, useEffect } from 'react';
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
  KeyRound,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { AppState, Settings, STARTER_CATEGORIES, STARTER_ACCOUNTS } from '../types';
import { formatCurrency, deduplicateList } from '../utils/currency';
import { getUserRecoveryConfig, saveUserRecoveryConfig } from '../api';

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
  const [accounts, setAccounts] = useState<string[]>(
    settings?.accounts?.length ? deduplicateList(settings.accounts) : STARTER_ACCOUNTS
  );

  // Categories state
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<string[]>(
    settings?.categories?.length ? deduplicateList(settings.categories) : STARTER_CATEGORIES
  );

  useEffect(() => {
    if (settings?.accounts) {
      setAccounts(deduplicateList(settings.accounts));
    }
  }, [settings?.accounts]);

  useEffect(() => {
    if (settings?.categories) {
      setCategories(deduplicateList(settings.categories));
    }
  }, [settings?.categories]);

  // Security Recovery PIN state
  const [recoveryQuestion, setRecoveryQuestion] = useState('What is your secret 4-digit PIN?');
  const [customQuestion, setCustomQuestion] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [hasCustomRecovery, setHasCustomRecovery] = useState(false);
  const [isSavingRecovery, setIsSavingRecovery] = useState(false);
  const [recoverySaveSuccess, setRecoverySaveSuccess] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    getUserRecoveryConfig().then((cfg) => {
      if (cfg?.question) {
        setRecoveryQuestion(cfg.question);
      }
      setHasCustomRecovery(!!cfg?.hasRecovery);
    });
  }, []);

  const handleSaveRecoveryPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    if (!recoveryPin.trim()) {
      setRecoveryError('Please enter a 4-digit PIN or secret answer.');
      return;
    }
    const finalQ = recoveryQuestion === 'Custom question...' ? customQuestion.trim() : recoveryQuestion;
    if (!finalQ) {
      setRecoveryError('Please select or specify a security question.');
      return;
    }

    setIsSavingRecovery(true);
    try {
      await saveUserRecoveryConfig(finalQ, recoveryPin.trim());
      setHasCustomRecovery(true);
      setRecoverySaveSuccess(true);
      setRecoveryPin('');
      setTimeout(() => setRecoverySaveSuccess(false), 3500);
    } catch (err: any) {
      setRecoveryError(err.message || 'Failed to save recovery configuration.');
    } finally {
      setIsSavingRecovery(false);
    }
  };

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
    if (!trimmed || accounts.some((a) => a.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = deduplicateList([...accounts, trimmed]);
    setAccounts(updated);
    setNewAccount('');
    await onUpdateSettings({ accounts: updated });
  };

  const handleDeleteAccount = async (accName: string) => {
    if (accounts.length <= 1) {
      alert('You must keep at least one active account.');
      return;
    }
    const updated = deduplicateList(accounts.filter((a) => a.toLowerCase() !== accName.toLowerCase()));
    setAccounts(updated);
    await onUpdateSettings({ accounts: updated });
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed || categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return;
    const updated = deduplicateList([...categories, trimmed]);
    setCategories(updated);
    setNewCategory('');
    await onUpdateSettings({ categories: updated });
  };

  const handleDeleteCategory = async (catName: string) => {
    if (categories.length <= 1) {
      alert('You must keep at least one category.');
      return;
    }
    const updated = deduplicateList(categories.filter((c) => c.toLowerCase() !== catName.toLowerCase()));
    setCategories(updated);
    await onUpdateSettings({ categories: updated });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. NET WORTH CONFIGURATION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Net Worth Configuration</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              Calculate balance sheet total across liquid cash, investments, real estate, and debts
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveNetWorth} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Assets (₹) <span className="text-slate-400 font-normal">(Cash, 401k, Home)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={assets}
                onChange={(e) => setAssets(e.target.value)}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Liabilities (₹) <span className="text-slate-400 font-normal">(Mortgage, Cards, Loans)</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={liabilities}
                onChange={(e) => setLiabilities(e.target.value)}
                className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider">
              Calculated Net Worth:
            </span>
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {formatCurrency(computedNetWorth)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
            {netWorthSavedSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                <Check className="w-4 h-4" />
                Net worth saved to dashboard
              </span>
            )}
            <button
              type="submit"
              disabled={isSavingNetWorth}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingNetWorth ? 'Saving...' : 'Save Net Worth'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. ACCOUNTS MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Financial Accounts</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">Checking, savings, credit cards, and brokerages</p>
          </div>
        </div>

        <form onSubmit={handleAddAccount} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Add account name (e.g. HDFC, ICICI, SBI, Axis)..."
            value={newAccount}
            onChange={(e) => setNewAccount(e.target.value)}
            className="flex-1 px-3 py-2 sm:px-3.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 sm:py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 w-full sm:w-auto"
          >
            Add Account
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
          {accounts.map((acc) => (
            <div
              key={acc}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Expense & Income Categories</h3>
          <p className="text-[11px] sm:text-xs text-slate-500">
            Standardized buckets for your budget and recurring expense analysis
          </p>
        </div>

        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="New category name (e.g. Pets, Subscriptions, Education)..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-3 py-2 sm:px-3.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="px-4 py-2.5 sm:py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 w-full sm:w-auto"
          >
            Add Category
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
          {categories.map((cat) => (
            <div
              key={cat}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800"
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

      {/* 4. SECURITY & 4-DIGIT RECOVERY PIN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                Security & 4-Digit Recovery PIN
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Set or update your 4-digit PIN to reset your password without Google
              </p>
            </div>
          </div>

          <div>
            {hasCustomRecovery ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Custom PIN Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Default PIN Active (1234)
              </span>
            )}
          </div>
        </div>

        {recoverySaveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Your 4-digit recovery PIN has been saved! You can now use it on the Forgot Password screen.</span>
          </div>
        )}

        {recoveryError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{recoveryError}</span>
          </div>
        )}

        <form onSubmit={handleSaveRecoveryPin} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Security Question
              </label>
              <select
                value={recoveryQuestion}
                onChange={(e) => setRecoveryQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="What is your secret 4-digit PIN?">What is your secret 4-digit PIN?</option>
                <option value="What is your primary bank name (e.g. HDFC, ICICI, SBI)?">What is your primary bank name (e.g. HDFC, ICICI, SBI)?</option>
                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                <option value="What was the name of your first school?">What was the name of your first school?</option>
                <option value="What city were you born in?">What city were you born in?</option>
                <option value="Custom question...">Custom question...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Set 4-Digit PIN or Answer
              </label>
              <input
                type="text"
                value={recoveryPin}
                onChange={(e) => setRecoveryPin(e.target.value)}
                placeholder="e.g. 1234 or your secret PIN"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {recoveryQuestion === 'Custom question...' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Custom Question
              </label>
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Enter your custom security question"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-slate-500">
              This PIN allows you to recover your account and reset your password if you ever forget it.
            </p>
            <button
              type="submit"
              disabled={isSavingRecovery}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSavingRecovery ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save 4-Digit PIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 5. DATABASE & STORAGE ENGINE STATUS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Database & Object Storage Status</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">Fast Local SQLite Engine & Document Vault</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-700 block text-[11px] sm:text-xs">D1 Primary Database:</span>
            <span className="text-emerald-600 font-bold text-xs">Local Sync Connected (Zero Latency)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="font-semibold text-slate-700 block text-[11px] sm:text-xs">R2 Object Vault:</span>
            <span className="text-emerald-600 font-bold text-xs">Encrypted Document Storage Active</span>
          </div>
        </div>

        {/* Demo data / Wipe data actions */}
        <div className="pt-3 sm:pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <button
            onClick={onResetDemoData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Demo Dataset</span>
          </button>

          <button
            onClick={onOpenWipeData}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition w-full sm:w-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Wipe All Financial Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
