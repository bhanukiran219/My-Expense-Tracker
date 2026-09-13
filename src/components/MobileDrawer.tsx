import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
  Plus,
  Upload,
  Lock,
} from 'lucide-react';
import { LedgerlyGlyph } from './brand/LedgerlyLogo';
import { ActiveTab } from '../types';
import { getNavIconVariants } from './navIconVariants';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAddEntry?: () => void;
  onOpenImport?: () => void;
  documentCount?: number;
  reviewCount?: number;
  currentUser?: { id: string; username: string; email?: string; picture?: string } | null;
  onLogout?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenAddEntry,
  onOpenImport,
  documentCount = 0,
  reviewCount = 0,
  currentUser,
  onLogout,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <motion.div
            id="mobile-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <motion.aside
            id="mobile-nav-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header: Logo and Close Button */}
            <div className="h-20 flex items-center justify-between px-5 border-b border-slate-100 bg-white shrink-0">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  onSelectTab('dashboard');
                  onClose();
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-700 via-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-200">
                  <LedgerlyGlyph className="w-5.5 h-5.5 drop-shadow-sm text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-base text-slate-900 tracking-tight leading-tight flex flex-col">
                    <span>{currentUser?.username || 'Ledgerly'}</span>
                    <span className="text-violet-600 text-xs font-semibold tracking-wide">Expense Tracker</span>
                  </h1>
                </div>
              </div>

              <button
                id="btn-close-mobile-drawer"
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions (Add Entry & Import) */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2 shrink-0">
              {onOpenAddEntry && (
                <button
                  id="drawer-btn-add-entry"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAddEntry();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs transition active:scale-98 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Transaction Entry</span>
                </button>
              )}

              {onOpenImport && (
                <button
                  id="drawer-btn-import"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenImport();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Import Bank Statement / CSV</span>
                </button>
              )}
            </div>

            {/* Navigation List - All 12 Sections */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto no-scrollbar">
              <div className="px-3 pb-1 pt-0.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Navigation
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeTab === item.id || (item.id === 'rules-tags' && activeTab === 'rules');

                return (
                  <button
                    key={item.id}
                    id={`mobile-drawer-nav-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer active:scale-98 ${
                      isActive
                        ? 'text-violet-700 font-semibold bg-violet-50/90 border border-violet-100 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center p-1 rounded-lg transition-colors ${
                          isActive ? 'text-violet-600' : 'text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold transition-all ${
                          isActive
                            ? 'bg-violet-200 text-violet-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer / Status */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">Private Vault</span>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live D1
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
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
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lock Vault</span>
                </button>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
