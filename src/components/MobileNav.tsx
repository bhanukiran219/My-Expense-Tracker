import React from 'react';
import { motion } from 'framer-motion';
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
  Landmark,
  CalendarClock,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { getNavIconVariants } from './navIconVariants';

interface MobileNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash-flow', label: 'Cash Flow', icon: CalendarClock },
    { id: 'net-worth', label: 'Net Worth', icon: Landmark },
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg max-w-full overflow-hidden">
      <div className="flex items-center overflow-x-auto no-scrollbar gap-1 py-1 px-1 snap-x">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id || (item.id === 'rules-tags' && activeTab === 'rules');

          return (
            <motion.button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              animate={isActive ? 'active' : 'idle'}
              className={`relative flex flex-col items-center justify-center min-w-[70px] h-[52px] px-2 rounded-xl transition-colors shrink-0 snap-start cursor-pointer ${
                isActive
                  ? 'text-violet-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileActiveBackground"
                  className="absolute inset-0 bg-violet-50 rounded-xl border border-violet-100"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                variants={getNavIconVariants(item.id)}
                className="relative z-10"
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 transition-colors ${isActive ? 'text-violet-600' : 'text-slate-400'}`}
                />
              </motion.div>
              <span className="relative z-10 text-[11px] leading-tight whitespace-nowrap">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
