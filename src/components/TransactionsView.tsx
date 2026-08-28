import React, { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Search,
  Filter,
  Plus,
  X,
  Receipt,
  FileCheck,
  Trash2,
  ChevronDown,
  Tag as TagIcon,
  Wallet,
  Folder,
  Edit3,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppState, DatePeriod, Transaction, STARTER_CATEGORIES, STARTER_ACCOUNTS } from '../types';
import { formatCurrency, formatDateDisplay } from '../utils/currency';
import { filterTransactionsByPeriod, getPeriodLabel } from '../utils/datePeriod';
import { getTagColorClass } from '../utils/tagColors';
import { getCategoryIcon } from '../utils/categoryIcons';
import { updateTransaction, deleteTransaction } from '../api';
import { PeriodDropdown } from './PeriodDropdown';
import { CustomSelect } from './CustomSelect';

interface TransactionsViewProps {
  state: AppState;
  period: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
  onOpenAddEntry: () => void;
  onOpenTagModal: (tx: Transaction) => void;
  onTransactionUpdated: (tx: Transaction) => void;
  onTransactionDeleted: (id: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  hiddenTxIds: Set<string>;
  onToggleTxVisibility: (id: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  state,
  period,
  onPeriodChange,
  onOpenAddEntry,
  onOpenTagModal,
  onTransactionUpdated,
  onTransactionDeleted,
  onEditTransaction,
  hiddenTxIds,
  onToggleTxVisibility,
}) => {
  const [parent] = useAutoAnimate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [updatingTxId, setUpdatingTxId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isTransactionsHidden, setIsTransactionsHidden] = useState(false);

  // 1. Filter by period
  const periodFiltered = filterTransactionsByPeriod(state.transactions, period);

  // Extract unique accounts and categories from existing transactions
  const uniqueAccounts = Array.from(new Set(state.transactions.map((tx) => tx.account).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(state.transactions.map((tx) => tx.category).filter(Boolean)));

  const baseCategories = state.settings?.categories?.length ? state.settings.categories : STARTER_CATEGORIES;
  const baseAccounts = state.settings?.accounts?.length ? state.settings.accounts : STARTER_ACCOUNTS;

  // Merge with settings and ensure uniqueness
  const mergedAccounts = Array.from(new Set([...baseAccounts, ...uniqueAccounts]));
  const mergedCategories = Array.from(new Set([...baseCategories, ...uniqueCategories]));

  const accountOptions = [
    { value: 'all', label: 'All accounts' },
    ...mergedAccounts.map((a) => ({
      value: a,
      label: a,
    })),
  ];

  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...mergedCategories.map((c) => ({
      value: c,
      label: c,
    })),
  ];

  const typeOptions = [
    { value: 'all', label: 'All types' },
    { value: 'income', label: 'Income (Credit)' },
    { value: 'expense', label: 'Spending (Debit)' },
  ];

  // 2. Filter by search, account, category, type
  const filteredTxs = periodFiltered.filter((tx) => {
    // Type filter
    if (selectedType !== 'all' && tx.type !== selectedType) {
      return false;
    }
    // Account filter
    if (selectedAccount !== 'all' && tx.account !== selectedAccount) {
      return false;
    }
    // Category filter
    if (selectedCategory !== 'all' && tx.category !== selectedCategory) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchMerchant = tx.merchant.toLowerCase().includes(q);
      const matchCategory = tx.category.toLowerCase().includes(q);
      const matchTags = tx.tags && tx.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchMerchant && !matchCategory && !matchTags) {
        return false;
      }
    }
    return true;
  });

  // Inline Category Change handler
  const handleCategoryChange = async (tx: Transaction, newCategory: string) => {
    if (tx.category === newCategory) return;
    setUpdatingTxId(tx.id);
    try {
      const updated = await updateTransaction(tx.id, { category: newCategory });
      onTransactionUpdated(updated);
    } catch (err) {
      console.error('Failed to update category:', err);
    } finally {
      setUpdatingTxId(null);
    }
  };

  // Inline Tag Removal handler
  const handleRemoveTag = async (tx: Transaction, tagToRemove: string) => {
    const updatedTags = tx.tags.filter((t) => t !== tagToRemove);
    setUpdatingTxId(tx.id);
    try {
      const updated = await updateTransaction(tx.id, { tags: updatedTags });
      onTransactionUpdated(updated);
    } catch (err) {
      console.error('Failed to remove tag:', err);
    } finally {
      setUpdatingTxId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingTxId(id);
    try {
      await deleteTransaction(id);
      onTransactionDeleted(id);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    } finally {
      setDeletingTxId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* CONTEXT HEADER & PERIOD DROPDOWN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Every entry, one clear view.
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-normal mt-0.5">
            Search, filter, categorize and tag your durable records.
          </p>
        </div>

        {/* Monthly / Period Dropdown positioned below TopBar Add Entry column */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsTransactionsHidden(!isTransactionsHidden)}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition shadow-xs"
            title={isTransactionsHidden ? "Show Transactions" : "Hide Transactions"}
          >
            {isTransactionsHidden ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <PeriodDropdown period={period} onPeriodChange={onPeriodChange} />
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="input-transaction-search"
            type="text"
            placeholder="Search merchant, category or tag"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs md:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter */}
          <CustomSelect
            id="filter-type"
            value={selectedType}
            onChange={setSelectedType}
            options={typeOptions}
            placeholder="All types"
          />

          {/* Account Filter */}
          <CustomSelect
            id="filter-account"
            value={selectedAccount}
            onChange={setSelectedAccount}
            options={accountOptions}
            placeholder="All accounts"
          />

          {/* Category Filter */}
          <CustomSelect
            id="filter-category"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            placeholder="All categories"
          />
        </div>
      </div>

      {/* TRANSACTION TABLE / LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isTransactionsHidden ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <EyeOff className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Transactions Hidden</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your transaction details are currently hidden for privacy.
            </p>
            <button
              onClick={() => setIsTransactionsHidden(false)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Eye className="w-4 h-4" />
              <span>Show Transactions</span>
            </button>
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900">No transactions found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || selectedAccount !== 'all' || selectedCategory !== 'all'
                ? 'No transactions match your active filters in this period.'
                : `Your transaction history for ${getPeriodLabel(period).toLowerCase()} is empty.`}
            </p>
            <button
              onClick={onOpenAddEntry}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Transaction</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-4 sm:px-6">Date & Merchant</th>
                  <th className="py-3.5 px-4">Category (Inline)</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Account</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-3 text-center w-20">Actions</th>
                </tr>
              </thead>
              <tbody ref={parent as any} className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredTxs.map((tx) => {
                  const isUpdating = updatingTxId === tx.id;
                  const isTxHidden = hiddenTxIds.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Date & Merchant */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xs ${
                              tx.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : getCategoryIcon(tx.category)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                                {isTxHidden ? '***' : tx.merchant}
                              </span>
                              {!isTxHidden && tx.receipt === 1 && (
                                <span
                                  className="text-violet-600 bg-violet-50 p-0.5 rounded-md"
                                  title="Receipt verified"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-normal">
                              {formatDateDisplay(tx.date)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Inline Category Editor */}
                      <td className="py-3.5 px-4">
                        {isTxHidden ? (
                          <span className="text-slate-400 font-bold">***</span>
                        ) : (
                          <CustomSelect
                            value={tx.category}
                            onChange={(newCat) => handleCategoryChange(tx, newCat)}
                            options={mergedCategories.map((c) => ({
                              value: c,
                              label: c,
                            }))}
                            size="sm"
                            className="min-w-[140px]"
                          />
                        )}
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 text-xs">
                        {isTxHidden ? '***' : tx.account}
                      </td>

                      {/* Inline Tags */}
                      <td className="py-3.5 px-4">
                        {isTxHidden ? (
                          <span className="text-slate-400 font-bold">***</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {tx.tags &&
                              tx.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold transition cursor-pointer group/tag ${getTagColorClass(tag, 'hover:bg-rose-50 hover:text-rose-700')}`}
                                  title="Click to remove tag"
                                  onClick={() => handleRemoveTag(tx, tag)}
                                >
                                  <span>{tag}</span>
                                  <X className="w-2.5 h-2.5 opacity-60 group-hover/tag:opacity-100" />
                                </span>
                              ))}

                            {/* Plus button to open Tag-only modal */}
                            <button
                              type="button"
                              onClick={() => onOpenTagModal(tx)}
                              className="w-5 h-5 rounded-md bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-500 flex items-center justify-center transition"
                              title="Add/Manage tags"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-bold text-xs sm:text-sm ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                          }`}
                        >
                          {isTxHidden ? '***' : formatCurrency(tx.amount, tx.type === 'income')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleTxVisibility(tx.id)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                            title={isTxHidden ? "Show transaction" : "Hide transaction"}
                          >
                            {isTxHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditTransaction(tx)}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition cursor-pointer"
                            title="Edit transaction"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            disabled={deletingTxId === tx.id}
                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                            title="Delete transaction"
                          >
                            {deletingTxId === tx.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer with counts */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span>Showing {isTransactionsHidden ? '***' : filteredTxs.filter(t => !hiddenTxIds.has(t.id)).length} transaction(s)</span>
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Income (Credit):{' '}
              <strong className="text-emerald-600">
                {isTransactionsHidden ? '***' : formatCurrency(filteredTxs.filter(t => t.type === 'income' && !hiddenTxIds.has(t.id)).reduce((sum, t) => sum + t.amount, 0))}
              </strong>
            </span>
            <span>
              Spending (Debit):{' '}
              <strong className="text-slate-900">
                {isTransactionsHidden ? '***' : formatCurrency(filteredTxs.filter(t => t.type === 'expense' && !hiddenTxIds.has(t.id)).reduce((sum, t) => sum + t.amount, 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
