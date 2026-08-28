import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Repeat,
  Sparkles,
  PieChart,
  Target,
  FileText,
  SlidersHorizontal,
  Settings as SettingsIcon,
  HandCoins,
} from 'lucide-react';
import { ActiveTab } from '../types';

interface MobileNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'subscriptions', label: 'Subscriptions', icon: Sparkles },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'loans', label: 'Loans & Debts', icon: HandCoins },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'rules-tags', label: 'Rules & Tags', icon: SlidersHorizontal },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center overflow-x-auto no-scrollbar gap-1 py-1 px-1 snap-x">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id || (item.id === 'rules-tags' && activeTab === 'rules');

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[70px] h-[48px] px-2 rounded-xl transition-all shrink-0 snap-start ${
                isActive
                  ? 'text-violet-600 font-semibold bg-violet-50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`}
              />
              <span className="text-[11px] leading-tight whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
