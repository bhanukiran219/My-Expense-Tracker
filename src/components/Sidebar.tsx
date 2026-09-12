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
  ShieldCheck,
  HandCoins,
  Landmark,
  CalendarClock,
  Lock,
} from 'lucide-react';
import { ActiveTab } from '../types';
import { getNavIconVariants } from './navIconVariants';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenImport?: () => void;
  documentCount?: number;
  reviewCount?: number;
  currentUser?: { id: string; username: string; email?: string; picture?: string } | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenImport,
  documentCount = 0,
  reviewCount = 0,
  currentUser,
  onLogout,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cash-flow', label: 'Cash Flow Forecast', icon: CalendarClock },
    { id: 'net-worth', label: 'Net Worth & Assets', icon: Landmark },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, badge: reviewCount > 0 ? reviewCount : undefined },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'subscriptions', label: 'Subscriptions', icon: Sparkles },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'loans', label: 'Loans & Debts', icon: HandCoins },
    { id: 'documents', label: 'Documents', icon: FileText, badge: documentCount > 0 ? documentCount : undefined },
    { id: 'rules-tags', label: 'Rules & Tags', icon: SlidersHorizontal },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed top-0 left-0 shrink-0 select-none z-20 shadow-sm">
      {/* Brand Header */}
      <motion.div
        className="h-[76px] flex items-center px-6 border-b border-slate-100 cursor-pointer group"
        initial="idle"
        whileHover="hover"
        whileTap="tap"
        onClick={() => onSelectTab('dashboard')}
      >
        <div className="flex items-center gap-3">
          <motion.div
            variants={getNavIconVariants('brand')}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-700 via-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-200 group-hover:shadow-lg group-hover:shadow-violet-300/60 transition-shadow"
          >
            <ShieldCheck className="w-6 h-6 drop-shadow-sm" />
          </motion.div>
          <div>
            <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight flex flex-col">
              <span className="group-hover:text-violet-900 transition-colors">Bhanu</span>
              <span className="text-violet-600 text-xs font-semibold tracking-wide">Expence Tracker</span>
            </h1>
          </div>
        </div>
      </motion.div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id || (item.id === 'rules-tags' && activeTab === 'rules');

          return (
            <motion.button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
              animate={isActive ? 'active' : 'idle'}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors group cursor-pointer ${
                isActive
                  ? 'text-violet-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {/* Animated active pill background */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActiveBackground"
                  className="absolute inset-0 bg-violet-50/90 rounded-xl border border-violet-100 shadow-xs"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-3">
                <motion.div
                  variants={getNavIconVariants(item.id)}
                  className={`flex items-center justify-center p-1 rounded-lg transition-colors ${
                    isActive
                      ? 'text-violet-600'
                      : 'text-slate-400 group-hover:text-violet-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <motion.span
                  variants={{
                    idle: { x: 0 },
                    hover: { x: 2, transition: { duration: 0.2 } },
                    active: { x: 0 },
                  }}
                >
                  {item.label}
                </motion.span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`relative z-10 text-[11px] px-2 py-0.5 rounded-full font-bold transition-all ${
                    isActive ? 'bg-violet-200 text-violet-800' : 'bg-slate-100 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700'
                  }`}
                >
                  {item.badge}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-violet-200 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-medium text-slate-700">Private Vault</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live D1
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Encrypted owner-only storage with daily Drive sync.
          </p>
        </div>

        {currentUser && (
          <div className="mt-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-2.5">
            {currentUser.picture ? (
              <img
                src={currentUser.picture}
                alt={currentUser.username}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {currentUser.username}
              </p>
              {currentUser.email && (
                <p className="text-[10px] text-slate-400 truncate leading-tight">
                  {currentUser.email}
                </p>
              )}
            </div>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="w-full mt-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-98"
            title="Lock your session and require password to re-enter"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
            <span>Lock Vault</span>
          </button>
        )}
      </div>
    </aside>
  );
};
