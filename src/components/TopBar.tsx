import React from 'react';
import {
  Upload,
  Plus,
  Menu,
  Lock,
} from 'lucide-react';
import { ActiveTab, DatePeriod } from '../types';

interface TopBarProps {
  activeTab: ActiveTab;
  period: DatePeriod;
  onPeriodChange?: (period: DatePeriod) => void;
  onOpenAddEntry: () => void;
  onOpenImport: () => void;
  onOpenMobileMenu?: () => void;
  onLogout?: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Dashboard',
  'cash-flow': 'Cash Flow Forecast',
  'net-worth': 'Net Worth & Assets',
  transactions: 'Transactions',
  recurring: 'Recurring Expenses',
  subscriptions: 'Subscriptions',
  budgets: 'Budgets',
  goals: 'Goals',
  loans: 'Loans & Debts',
  documents: 'Documents',
  rules: 'Rules & Tags',
  'rules-tags': 'Rules & Tags',
  settings: 'Settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenAddEntry,
  onOpenImport,
  onOpenMobileMenu,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-20 h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-4 md:px-8 flex items-center justify-between transition-all">
      {/* Title / Tab Name with Hamburger Menu on Mobile */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
        {onOpenMobileMenu && (
          <button
            id="btn-hamburger-menu"
            type="button"
            onClick={onOpenMobileMenu}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}

        <div className="flex flex-col justify-center min-w-0">
          <span className="text-[9px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase truncate leading-none mb-0.5">
            YOUR MONEY, CLEARLY
          </span>
          <h2 className="text-base sm:text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight truncate">
            {TAB_TITLES[activeTab] || 'Dashboard'}
          </h2>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
        {/* Lock Vault Button */}
        {onLogout && (
          <button
            id="btn-topbar-lock"
            type="button"
            onClick={onLogout}
            title="Lock Vault"
            aria-label="Lock Vault"
            className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs md:text-sm font-medium rounded-xl text-slate-700 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 shadow-2xs transition active:scale-98 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 hover:text-rose-500" />
            <span className="hidden sm:inline">Lock</span>
          </button>
        )}

        {/* Import Button */}
        <button
          id="btn-topbar-import"
          onClick={onOpenImport}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs md:text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition active:scale-98"
        >
          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Add Entry Button */}
        <button
          id="btn-topbar-add-entry"
          onClick={onOpenAddEntry}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs md:text-sm font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-700 shadow-xs transition active:scale-98"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Add entry</span>
        </button>
      </div>
    </header>
  );
};


