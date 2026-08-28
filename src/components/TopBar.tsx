import React from 'react';
import {
  Upload,
  Plus,
} from 'lucide-react';
import { ActiveTab, DatePeriod } from '../types';

interface TopBarProps {
  activeTab: ActiveTab;
  period: DatePeriod;
  onPeriodChange?: (period: DatePeriod) => void;
  onOpenAddEntry: () => void;
  onOpenImport: () => void;
}

const TAB_TITLES: Record<ActiveTab, string> = {
  dashboard: 'Dashboard',
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
}) => {
  return (
    <header className="sticky top-0 z-20 h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between">
      {/* Title / Tab Name with Context Eyebrow */}
      <div className="flex flex-col justify-center">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          YOUR MONEY, CLEARLY
        </span>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {TAB_TITLES[activeTab] || 'Dashboard'}
        </h2>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Import Button */}
        <button
          id="btn-topbar-import"
          onClick={onOpenImport}
          className="flex items-center gap-2 px-3 py-2 md:px-3.5 md:py-2 text-xs md:text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition active:scale-98"
        >
          <Upload className="w-4 h-4 text-slate-600" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Add Entry Button */}
        <button
          id="btn-topbar-add-entry"
          onClick={onOpenAddEntry}
          className="flex items-center gap-2 px-3.5 py-2 md:px-4 md:py-2 text-xs md:text-sm font-semibold rounded-xl text-white bg-violet-600 hover:bg-violet-700 shadow-xs transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Add entry</span>
        </button>
      </div>
    </header>
  );
};


