import React, { useState, useEffect, useMemo } from 'react';
import {
  ActiveTab,
  AppState,
  Budget,
  DatePeriod,
  DetectedPattern,
  Goal,
  RecurringItem,
  Rule,
  Settings,
  SubscriptionItem,
  Transaction,
  Loan,
  Asset,
  Liability,
  NetWorthSnapshot,
  CashFlowEvent,
  STARTER_CATEGORIES,
  STARTER_ACCOUNTS,
} from './types';
import {
  fetchAppState,
  saveTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  updatePreferences,
  createRule,
  updateRule,
  deleteRule,
  createTag,
  deleteTag,
  wipeAllData,
  importBatch,
  checkAuthStatus,
  logout,
} from './api';
import { deduplicateList } from './utils/currency';

// Auth
import { LoginView } from './components/auth/LoginView';

// Components
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileDrawer } from './components/MobileDrawer';

// Views
import { DashboardView } from './components/DashboardView';
import { CashFlowView } from './components/CashFlowView';
import { NetWorthView } from './components/NetWorthView';
import { TransactionsView } from './components/TransactionsView';
import { RecurringView } from './components/RecurringView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { BudgetsView } from './components/BudgetsView';
import { GoalsView } from './components/GoalsView';
import { LoansView } from './components/LoansView';
import { DocumentsView } from './components/DocumentsView';
import { RulesTagsView } from './components/RulesTagsView';
import { SettingsView } from './components/SettingsView';

// Modals
import { AddEntryModal } from './components/modals/AddEntryModal';
import { ImportModal } from './components/modals/ImportModal';
import { EditTransactionModal } from './components/modals/EditTransactionModal';
import { TagModal } from './components/modals/TagModal';
import { WipeDataModal } from './components/modals/WipeDataModal';
import { RecurringModal } from './components/modals/RecurringModal';
import { SubscriptionModal } from './components/modals/SubscriptionModal';
import { BudgetModal } from './components/modals/BudgetModal';
import { GoalModal } from './components/modals/GoalModal';
import { LoanModal } from './components/modals/LoanModal';
import { RuleModal } from './components/modals/RuleModal';
import { AssetModal } from './components/modals/AssetModal';
import { LiabilityModal } from './components/modals/LiabilityModal';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email?: string; picture?: string } | null>(null);
  const [initialUserHint, setInitialUserHint] = useState<{ username: string; email?: string; picture?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [period, setPeriod] = useState<DatePeriod>('this-month');
  const [hiddenTxIds, setHiddenTxIds] = useState<Set<string>>(new Set());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persistent Net Worth privacy/hidden states
  const [isNetWorthPrivacyMode, setIsNetWorthPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ledgerly_nw_privacy') === 'true';
    } catch {
      return false;
    }
  });

  const [isHideAssets, setIsHideAssets] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ledgerly_nw_hide_assets') === 'true';
    } catch {
      return false;
    }
  });

  const [isHideLiabilities, setIsHideLiabilities] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ledgerly_nw_hide_liabilities') === 'true';
    } catch {
      return false;
    }
  });

  const [hiddenAssetIds, setHiddenAssetIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ledgerly_nw_hidden_assets');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [hiddenLiabilityIds, setHiddenLiabilityIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ledgerly_nw_hidden_liabilities');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ledgerly_nw_privacy', String(isNetWorthPrivacyMode));
      localStorage.setItem('ledgerly_nw_hide_assets', String(isHideAssets));
      localStorage.setItem('ledgerly_nw_hide_liabilities', String(isHideLiabilities));
      localStorage.setItem('ledgerly_nw_hidden_assets', JSON.stringify(Array.from(hiddenAssetIds)));
      localStorage.setItem('ledgerly_nw_hidden_liabilities', JSON.stringify(Array.from(hiddenLiabilityIds)));
    } catch (e) {
      console.warn('Could not save privacy preferences to localStorage', e);
    }
  }, [isNetWorthPrivacyMode, isHideAssets, isHideLiabilities, hiddenAssetIds, hiddenLiabilityIds]);

  const handleToggleHideAsset = (id: string) => {
    setHiddenAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleHideLiability = (id: string) => {
    setHiddenLiabilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTxVisibility = (id: string) => {
    setHiddenTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stateWithoutHidden = useMemo(() => {
    if (!state) return state;
    if (hiddenTxIds.size === 0) return state;
    return {
      ...state,
      transactions: state.transactions.filter(tx => !hiddenTxIds.has(tx.id))
    };
  }, [state, hiddenTxIds]);

  // Modal Open States
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isEditTxModalOpen, setIsEditTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isWipeDataOpen, setIsWipeDataOpen] = useState(false);

  // Selected Items for Modals
  const [tagModalTx, setTagModalTx] = useState<Transaction | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [isLiabilityModalOpen, setIsLiabilityModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Initial Load
  const loadState = async (isInitial = false) => {
    try {
      if (isInitial || !state) {
        setLoading(true);
      }
      const data = await fetchAppState();
      setState(data);
    } catch (err) {
      console.error('Failed to load application state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initAuthAndState = async () => {
      setAuthLoading(true);
      try {
        const status = await checkAuthStatus();
        if (!isMounted) return;
        setIsSetupNeeded(!status.initialized);
        setIsAuthenticated(status.authenticated);
        if (status.userHint) {
          setInitialUserHint(status.userHint);
        }
        if (status.user) {
          setCurrentUser(status.user);
          try {
            localStorage.setItem(
              'ledgerly_remembered_user',
              JSON.stringify({
                username: status.user.username,
                email: status.user.email,
                picture: status.user.picture,
              })
            );
          } catch {}
        }
        if (status.authenticated) {
          await loadState(true);
        }
      } catch (err) {
        console.error('Failed to check authentication status:', err);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initAuthAndState();

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setState(null);
    };

    window.addEventListener('ledgerly:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('ledgerly:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setState(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-400">
          Securing Ledgerly Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginView
        isSetupMode={isSetupNeeded}
        initialUserHint={initialUserHint}
        onSuccess={(user) => {
          setIsAuthenticated(true);
          setIsSetupNeeded(false);
          setCurrentUser(user);
          loadState(true);
        }}
      />
    );
  }

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-400">
          Loading Ledgerly...
        </p>
      </div>
    );
  }

  // --- Handlers for Transactions ---
  const handleSaveTransaction = (savedTx: Transaction) => {
    setState((prev) => {
      if (!prev) return prev;
      const exists = prev.transactions.some((t) => t.id === savedTx.id);
      return {
        ...prev,
        transactions: exists
          ? prev.transactions.map((t) => (t.id === savedTx.id ? savedTx : t))
          : [savedTx, ...prev.transactions],
      };
    });
  };

  const handleTransactionDeleted = (id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      };
    });
  };

  // --- Handlers for Settings & Preferences ---
  const handleUpdateSettings = async (partial: Partial<Settings>) => {
    if (!state) return;
    const updatedSettings = { ...state.settings, ...partial };
    setState((prev) => (prev ? { ...prev, settings: updatedSettings } : prev));
    try {
      await updatePreferences(updatedSettings);
    } catch (err) {
      console.error('Failed to save settings:', err);
      loadState();
    }
  };

  // --- Recurring Item Handlers ---
  const handleSaveRecurring = async (item: RecurringItem) => {
    const list = state.settings.recurring || [];
    const exists = list.some((i) => i.id === item.id);
    const updatedList = exists
      ? list.map((i) => (i.id === item.id ? item : i))
      : [...list, item];
    await handleUpdateSettings({ recurring: updatedList });
  };

  const handleDeleteRecurring = async (id: string) => {
    const list = (state.settings.recurring || []).filter((i) => i.id !== id);
    await handleUpdateSettings({ recurring: list });
  };

  const handleKeepRecurringSuggestion = async (pattern: DetectedPattern) => {
    const newItem: RecurringItem = {
      id: crypto.randomUUID(),
      name: pattern.displayMerchant,
      category: pattern.category,
      amount: pattern.averageAmount,
      cadence: pattern.cadence,
      nextDate: pattern.nextExpectedDate,
      account: state.settings.accounts?.[0] || 'Main Checking',
      active: true,
    };
    await handleSaveRecurring(newItem);
  };

  const handleIgnoreSuggestion = async (patternKey: string) => {
    const dismissed = [...(state.settings.dismissedPatterns || []), patternKey];
    await handleUpdateSettings({ dismissedPatterns: dismissed });
  };

  // --- Subscription Handlers ---
  const handleSaveSubscription = async (item: SubscriptionItem) => {
    const list = state.settings.subscriptions || [];
    const exists = list.some((i) => i.id === item.id);
    const updatedList = exists
      ? list.map((i) => (i.id === item.id ? item : i))
      : [...list, item];
    await handleUpdateSettings({ subscriptions: updatedList });
  };

  const handleDeleteSubscription = async (id: string) => {
    const list = (state.settings.subscriptions || []).filter((i) => i.id !== id);
    await handleUpdateSettings({ subscriptions: list });
  };

  const handleKeepSubscriptionSuggestion = async (pattern: DetectedPattern) => {
    const newItem: SubscriptionItem = {
      id: crypto.randomUUID(),
      service: pattern.displayMerchant,
      group: 'Subscriptions',
      amount: pattern.averageAmount,
      cadence: pattern.cadence,
      nextRenewalDate: pattern.nextExpectedDate,
      account: state.settings.accounts?.[0] || 'Everyday Visa',
      active: true,
    };
    await handleSaveSubscription(newItem);
  };

  const handleIgnoreSubscriptionSuggestion = async (patternKey: string) => {
    const dismissed = [...(state.settings.dismissedPatterns || []), patternKey];
    await handleUpdateSettings({ dismissedPatterns: dismissed });
  };

  // --- Cash Flow Mark-Paid & Undo Handlers ---
  const handleMarkCashFlowEventPaid = async (event: CashFlowEvent): Promise<{ transactionId?: string }> => {
    if (!state) return {};
    try {
      const today = new Date().toISOString().split('T')[0];
      const txData: Partial<Transaction> = {
        merchant: event.title,
        amount: event.amount,
        type: event.type,
        category: event.category,
        account: event.account || state.settings?.accounts?.[0] || 'Main Checking',
        date: event.date <= today ? event.date : today,
        tags: ['CashFlow-Paid'],
        source: 'manual',
      };

      // 1. Save transaction to database
      const saveRes = await saveTransactions([txData]);
      const createdTx = saveRes.items?.[0];

      // 2. Advance recurring bill due date if linked
      if (event.sourceType === 'recurring' && event.sourceId) {
        const recurringList = state.settings.recurring || [];
        const item = recurringList.find((r) => r.id === event.sourceId);
        if (item) {
          const currentDue = event.date || item.nextDate || today;
          const [y, m, d] = currentDue.split('-').map(Number);
          const nextDateObj = new Date(y, m - 1, d);
          if (item.cadence === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
          else if (item.cadence === 'biweekly') nextDateObj.setDate(nextDateObj.getDate() + 14);
          else if (item.cadence === 'quarterly') nextDateObj.setMonth(nextDateObj.getMonth() + 3);
          else if (item.cadence === 'annual') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
          else nextDateObj.setMonth(nextDateObj.getMonth() + 1);

          const ny = nextDateObj.getFullYear();
          const nm = String(nextDateObj.getMonth() + 1).padStart(2, '0');
          const nd = String(nextDateObj.getDate()).padStart(2, '0');
          const nextDateStr = `${ny}-${nm}-${nd}`;

          const updatedRecurring = recurringList.map((r) =>
            r.id === event.sourceId ? { ...r, nextDate: nextDateStr } : r
          );
          await handleUpdateSettings({ recurring: updatedRecurring });
        }
      }

      // 3. Advance subscription renewal date if linked
      if (event.sourceType === 'subscription' && event.sourceId) {
        const subList = state.settings.subscriptions || [];
        const item = subList.find((s) => s.id === event.sourceId);
        if (item) {
          const currentDue = event.date || item.nextRenewalDate || today;
          const [y, m, d] = currentDue.split('-').map(Number);
          const nextDateObj = new Date(y, m - 1, d);
          if (item.cadence === 'weekly') nextDateObj.setDate(nextDateObj.getDate() + 7);
          else if (item.cadence === 'biweekly') nextDateObj.setDate(nextDateObj.getDate() + 14);
          else if (item.cadence === 'quarterly') nextDateObj.setMonth(nextDateObj.getMonth() + 3);
          else if (item.cadence === 'annual') nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
          else nextDateObj.setMonth(nextDateObj.getMonth() + 1);

          const ny = nextDateObj.getFullYear();
          const nm = String(nextDateObj.getMonth() + 1).padStart(2, '0');
          const nd = String(nextDateObj.getDate()).padStart(2, '0');
          const nextDateStr = `${ny}-${nm}-${nd}`;

          const updatedSubs = subList.map((s) =>
            s.id === event.sourceId ? { ...s, nextRenewalDate: nextDateStr } : s
          );
          await handleUpdateSettings({ subscriptions: updatedSubs });
        }
      }

      // 4. Update loan paidAmount if linked
      if (event.sourceType === 'loan_emi' && event.sourceId) {
        const loanList = state.settings.loans || [];
        const item = loanList.find((l) => l.id === event.sourceId);
        if (item) {
          const updatedLoans = loanList.map((l) =>
            l.id === event.sourceId
              ? { ...l, paidAmount: Math.min(l.amount, (l.paidAmount || 0) + event.amount) }
              : l
          );
          await handleUpdateSettings({ loans: updatedLoans });
        }
      }

      // 5. Refresh full application state
      await loadState();
      return { transactionId: createdTx?.id };
    } catch (err) {
      console.error('Failed to mark cash flow event as paid:', err);
      throw err;
    }
  };

  const handleUndoCashFlowPayment = async (undoData: {
    transactionId?: string;
    event: CashFlowEvent;
    previousDate?: string;
    previousPaidAmount?: number;
  }) => {
    if (!state) return;
    try {
      // 1. Delete created transaction if ID known or fallback to latest matching CashFlow-Paid
      if (undoData.transactionId) {
        await deleteTransaction(undoData.transactionId);
      } else {
        const found = state.transactions.find(
          (t) =>
            t.merchant.toLowerCase() === undoData.event.title.toLowerCase() &&
            (t.tags || []).includes('CashFlow-Paid')
        );
        if (found) {
          await deleteTransaction(found.id);
        }
      }

      // 2. Revert recurring bill date if linked
      if (undoData.event.sourceType === 'recurring' && undoData.event.sourceId && undoData.previousDate) {
        const list = state.settings.recurring || [];
        const updatedList = list.map((r) =>
          r.id === undoData.event.sourceId ? { ...r, nextDate: undoData.previousDate! } : r
        );
        await handleUpdateSettings({ recurring: updatedList });
      }

      // 3. Revert subscription renewal date if linked
      if (undoData.event.sourceType === 'subscription' && undoData.event.sourceId && undoData.previousDate) {
        const list = state.settings.subscriptions || [];
        const updatedList = list.map((s) =>
          s.id === undoData.event.sourceId ? { ...s, nextRenewalDate: undoData.previousDate! } : s
        );
        await handleUpdateSettings({ subscriptions: updatedList });
      }

      // 4. Revert loan paid amount if linked
      if (undoData.event.sourceType === 'loan_emi' && undoData.event.sourceId && undoData.previousPaidAmount !== undefined) {
        const list = state.settings.loans || [];
        const updatedList = list.map((l) =>
          l.id === undoData.event.sourceId ? { ...l, paidAmount: undoData.previousPaidAmount! } : l
        );
        await handleUpdateSettings({ loans: updatedList });
      }

      // 5. Reload full application state
      await loadState();
    } catch (err) {
      console.error('Failed to undo cash flow payment:', err);
      throw err;
    }
  };

  // --- Budget Handlers ---
  const handleSaveBudget = async (budget: Budget) => {
    const list = state.settings.budgets || [];
    const exists = list.some((b) => b.id === budget.id);
    const updatedList = exists
      ? list.map((b) => (b.id === budget.id ? budget : b))
      : [...list, budget];
    await handleUpdateSettings({ budgets: updatedList });
  };

  const handleDeleteBudget = async (id: string) => {
    const list = (state.settings.budgets || []).filter((b) => b.id !== id);
    await handleUpdateSettings({ budgets: list });
  };

  // --- Goal Handlers ---
  const handleSaveGoal = async (goal: Goal) => {
    const list = state.settings.goals || [];
    const exists = list.some((g) => g.id === goal.id);
    const updatedList = exists
      ? list.map((g) => (g.id === goal.id ? goal : g))
      : [...list, goal];
    await handleUpdateSettings({ goals: updatedList });
  };

  const handleDeleteGoal = async (id: string) => {
    const list = (state.settings.goals || []).filter((g) => g.id !== id);
    await handleUpdateSettings({ goals: list });
  };

  // --- Loan Handlers ---
  const handleSaveLoan = async (loan: Loan) => {
    const list = state.settings.loans || [];
    const exists = list.some((l) => l.id === loan.id);
    const updatedList = exists
      ? list.map((l) => (l.id === loan.id ? loan : l))
      : [...list, loan];
    await handleUpdateSettings({ loans: updatedList });
  };

  const handleDeleteLoan = async (id: string) => {
    const list = (state.settings.loans || []).filter((l) => l.id !== id);
    await handleUpdateSettings({ loans: list });
  };

  // --- Net Worth / Asset Handlers ---
  const handleSaveAsset = async (asset: Asset) => {
    const list = state?.settings?.assets || [];
    const exists = list.some((a) => a.id === asset.id);
    const updatedList = exists
      ? list.map((a) => (a.id === asset.id ? asset : a))
      : [...list, asset];
    const newAssetsTotal = updatedList.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    await handleUpdateSettings({
      assets: updatedList,
      assetsTotal: newAssetsTotal,
      netWorthConfigured: true,
    });
  };

  const handleDeleteAsset = async (id: string) => {
    const list = (state?.settings?.assets || []).filter((a) => a.id !== id);
    const newAssetsTotal = list.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    await handleUpdateSettings({
      assets: list,
      assetsTotal: newAssetsTotal,
    });
  };

  // --- Liability Handlers ---
  const handleSaveLiability = async (liability: Liability) => {
    const list = state?.settings?.liabilities || [];
    const exists = list.some((l) => l.id === liability.id);
    const updatedList = exists
      ? list.map((l) => (l.id === liability.id ? liability : l))
      : [...list, liability];
    const directTotal = updatedList.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const loansDebt =
      state?.settings?.includeLoansInLiabilities !== false
        ? (state?.settings?.loans || [])
            .filter((l) => l.type === 'borrowed')
            .reduce((sum, l) => sum + Math.max(0, l.amount - l.paidAmount), 0)
        : 0;
    await handleUpdateSettings({
      liabilities: updatedList,
      liabilitiesTotal: directTotal + loansDebt,
      netWorthConfigured: true,
    });
  };

  const handleDeleteLiability = async (id: string) => {
    const list = (state?.settings?.liabilities || []).filter((l) => l.id !== id);
    const directTotal = list.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const loansDebt =
      state?.settings?.includeLoansInLiabilities !== false
        ? (state?.settings?.loans || [])
            .filter((l) => l.type === 'borrowed')
            .reduce((sum, l) => sum + Math.max(0, l.amount - l.paidAmount), 0)
        : 0;
    await handleUpdateSettings({
      liabilities: list,
      liabilitiesTotal: directTotal + loansDebt,
    });
  };

  const handleRecordSnapshot = async () => {
    if (!state) return;
    const assetsTotal = (state.settings.assets || []).reduce(
      (sum, a) => sum + (Number(a.value) || 0),
      0
    );
    const directLiabilities = (state.settings.liabilities || []).reduce(
      (sum, l) => sum + (Number(l.amount) || 0),
      0
    );
    const loansDebt =
      state.settings.includeLoansInLiabilities !== false
        ? (state.settings.loans || [])
            .filter((l) => l.type === 'borrowed')
            .reduce((sum, l) => sum + Math.max(0, l.amount - l.paidAmount), 0)
        : 0;
    const liabilitiesTotal = directLiabilities + loansDebt;
    const today = new Date().toISOString().split('T')[0];

    const snapshot: NetWorthSnapshot = {
      id: crypto.randomUUID(),
      date: today,
      assetsTotal,
      liabilitiesTotal,
      netWorth: assetsTotal - liabilitiesTotal,
    };

    const existingHistory = state.settings.netWorthHistory || [];
    const filteredHistory = existingHistory.filter((s) => s.date !== today);
    const newHistory = [snapshot, ...filteredHistory];
    await handleUpdateSettings({
      netWorthHistory: newHistory,
      assetsTotal,
      liabilitiesTotal,
      netWorthConfigured: true,
    });
  };

  const handleDeleteSnapshot = async (id: string) => {
    const list = (state?.settings?.netWorthHistory || []).filter((s) => s.id !== id);
    await handleUpdateSettings({ netWorthHistory: list });
  };

  const handleToggleIncludeLoans = async (include: boolean) => {
    if (!state) return;
    const directLiabilities = (state.settings.liabilities || []).reduce(
      (sum, l) => sum + (Number(l.amount) || 0),
      0
    );
    const loansDebt = include
      ? (state.settings.loans || [])
          .filter((l) => l.type === 'borrowed')
          .reduce((sum, l) => sum + Math.max(0, l.amount - l.paidAmount), 0)
      : 0;
    await handleUpdateSettings({
      includeLoansInLiabilities: include,
      liabilitiesTotal: directLiabilities + loansDebt,
    });
  };

  // --- Rule Handlers ---
  const handleSaveRule = async (rule: Rule) => {
    try {
      const exists = state.rules.some((r) => r.id === rule.id);
      let saved: Rule;
      if (exists) {
        saved = await updateRule(rule.id, rule);
        setState((prev) =>
          prev ? { ...prev, rules: prev.rules.map((r) => (r.id === rule.id ? saved : r)) } : prev
        );
      } else {
        saved = await createRule(rule);
        setState((prev) => (prev ? { ...prev, rules: [...prev.rules, saved] } : prev));
      }
    } catch (err) {
      console.error('Failed to save rule:', err);
    }
  };

  const handleToggleRule = async (rule: Rule) => {
    try {
      const updated = await updateRule(rule.id, { enabled: rule.enabled === 1 ? 0 : 1 });
      setState((prev) =>
        prev ? { ...prev, rules: prev.rules.map((r) => (r.id === rule.id ? updated : r)) } : prev
      );
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule(id);
      setState((prev) =>
        prev ? { ...prev, rules: prev.rules.filter((r) => r.id !== id) } : prev
      );
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  // --- Tag Handlers ---
  const handleAddTag = async (tagName: string) => {
    try {
      const newTag = await createTag(tagName);
      setState((prev) => (prev ? { ...prev, tags: [...prev.tags, newTag] } : prev));
    } catch (err) {
      console.error('Failed to create tag:', err);
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      await deleteTag(tagName);
      setState((prev) =>
        prev ? { ...prev, tags: prev.tags.filter((t) => t.name !== tagName) } : prev
      );
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  // --- Reset / Wipe Handlers ---
  const handleWipeData = async () => {
    try {
      await wipeAllData();
      await loadState();
      setIsWipeDataOpen(false);
    } catch (err) {
      console.error('Failed to wipe data:', err);
    }
  };

  const handleResetDemoData = async () => {
    // Generate standard demo seed
    const demoTransactions: Partial<Transaction>[] = [
      {
        merchant: 'Acme Property Management (Rent)',
        category: 'Housing',
        amount: 2400.0,
        type: 'expense',
        date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        account: 'Main Checking',
        tags: ['Fixed'],
      },
      {
        merchant: 'TechCorp Bi-Weekly Payroll',
        category: 'Income',
        amount: 4350.0,
        type: 'income',
        date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        account: 'Main Checking',
        tags: ['Salary'],
      },
      {
        merchant: 'Whole Foods Market',
        category: 'Groceries',
        amount: 142.35,
        type: 'expense',
        date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        account: 'Everyday Visa',
        tags: ['Food'],
      },
      {
        merchant: 'Netflix Subscription',
        category: 'Entertainment',
        amount: 19.99,
        type: 'expense',
        date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        account: 'Everyday Visa',
        tags: ['Streaming'],
      },
      {
        merchant: 'Spotify Premium',
        category: 'Entertainment',
        amount: 10.99,
        type: 'expense',
        date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        account: 'Everyday Visa',
        tags: ['Streaming'],
      },
      {
        merchant: 'Trader Joe’s',
        category: 'Groceries',
        amount: 88.42,
        type: 'expense',
        date: new Date(Date.now() - 18 * 86400000).toISOString().split('T')[0],
        account: 'Everyday Visa',
        tags: ['Food'],
      },
      {
        merchant: 'Blue Bottle Coffee',
        category: 'Dining',
        amount: 7.25,
        type: 'expense',
        date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0],
        account: 'Everyday Visa',
        tags: [],
      },
    ];

    try {
      await importBatch(demoTransactions as any);
      await handleUpdateSettings({
        assetsTotal: 48500,
        liabilitiesTotal: 12200,
        netWorthConfigured: true,
        budgets: [
          { id: crypto.randomUUID(), category: 'Groceries', monthlyLimit: 600, active: true },
          { id: crypto.randomUUID(), category: 'Dining', monthlyLimit: 350, active: true },
          { id: crypto.randomUUID(), category: 'Entertainment', monthlyLimit: 150, active: true },
        ],
        goals: [
          {
            id: crypto.randomUUID(),
            name: 'Emergency Fund (6 Months)',
            targetAmount: 25000,
            currentAmount: 18000,
            dueDate: '2026-12-31',
            note: 'High-Yield Savings Target',
          },
          {
            id: crypto.randomUUID(),
            name: 'Japan Travel Fund',
            targetAmount: 5000,
            currentAmount: 2850,
            dueDate: '2026-10-15',
          },
        ],
        recurring: [
          {
            id: crypto.randomUUID(),
            name: 'Apartment Rent',
            category: 'Housing',
            amount: 2400.0,
            cadence: 'monthly',
            nextDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
            account: 'Main Checking',
            active: true,
          },
        ],
        subscriptions: [
          {
            id: crypto.randomUUID(),
            service: 'Netflix',
            group: 'Entertainment',
            amount: 19.99,
            cadence: 'monthly',
            nextRenewalDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            account: 'Everyday Visa',
            active: true,
          },
          {
            id: crypto.randomUUID(),
            service: 'Spotify',
            group: 'Entertainment',
            amount: 10.99,
            cadence: 'monthly',
            nextRenewalDate: new Date(Date.now() + 16 * 86400000).toISOString().split('T')[0],
            account: 'Everyday Visa',
            active: true,
          },
        ],
      });
      await loadState();
    } catch (err) {
      console.error('Failed to restore demo data:', err);
    }
  };
  // Use configured settings accounts and categories with clean deduplication
  const baseCategories = state?.settings?.categories && state.settings.categories.length > 0 
    ? deduplicateList(state.settings.categories) 
    : STARTER_CATEGORIES;
  const baseAccounts = state?.settings?.accounts && state.settings.accounts.length > 0 
    ? deduplicateList(state.settings.accounts) 
    : STARTER_ACCOUNTS;

  const mergedCategories = deduplicateList(baseCategories);
  const mergedAccounts = deduplicateList(baseAccounts);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* 1. DESKTOP SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-72">
        {/* TOP BAR */}
        <TopBar
          activeTab={activeTab}
          period={period}
          onPeriodChange={setPeriod}
          onOpenAddEntry={() => setIsAddEntryOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onLogout={handleLogout}
        />

        {/* VIEW CONTAINER */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              state={stateWithoutHidden!}
              period={period}
              onPeriodChange={setPeriod}
              onNavigateTab={setActiveTab}
              onOpenAddEntry={() => setIsAddEntryOpen(true)}
            />
          )}

          {activeTab === 'cash-flow' && (
            <CashFlowView
              state={stateWithoutHidden!}
              onUpdateSettings={handleUpdateSettings}
              onMarkPaid={handleMarkCashFlowEventPaid}
              onUndoPayment={handleUndoCashFlowPayment}
              onLogTransaction={async (tx) => {
                await saveTransactions([tx]);
                await loadState();
              }}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'net-worth' && (
            <NetWorthView
              state={stateWithoutHidden!}
              onOpenAddAsset={() => {
                setEditingAsset(null);
                setIsAssetModalOpen(true);
              }}
              onEditAsset={(asset) => {
                setEditingAsset(asset);
                setIsAssetModalOpen(true);
              }}
              onDeleteAsset={handleDeleteAsset}
              onOpenAddLiability={() => {
                setEditingLiability(null);
                setIsLiabilityModalOpen(true);
              }}
              onEditLiability={(liability) => {
                setEditingLiability(liability);
                setIsLiabilityModalOpen(true);
              }}
              onDeleteLiability={handleDeleteLiability}
              onRecordSnapshot={handleRecordSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
              onToggleIncludeLoans={handleToggleIncludeLoans}
              isPrivacyMode={isNetWorthPrivacyMode}
              onTogglePrivacyMode={() => setIsNetWorthPrivacyMode((prev) => !prev)}
              isHideAssets={isHideAssets}
              onToggleHideAssets={() => setIsHideAssets((prev) => !prev)}
              isHideLiabilities={isHideLiabilities}
              onToggleHideLiabilities={() => setIsHideLiabilities((prev) => !prev)}
              hiddenAssetIds={hiddenAssetIds}
              onToggleHideAsset={handleToggleHideAsset}
              hiddenLiabilityIds={hiddenLiabilityIds}
              onToggleHideLiability={handleToggleHideLiability}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              state={state}
              period={period}
              hiddenTxIds={hiddenTxIds}
              onToggleTxVisibility={handleToggleTxVisibility}
              onPeriodChange={setPeriod}
              onOpenAddEntry={() => setIsAddEntryOpen(true)}
              onOpenTagModal={(tx) => setTagModalTx(tx)}
              onTransactionUpdated={handleSaveTransaction}
              onTransactionDeleted={handleTransactionDeleted}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setIsEditTxModalOpen(true);
              }}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringView
              state={stateWithoutHidden!}
              onOpenAddModal={() => {
                setEditingRecurring(null);
                setIsRecurringModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingRecurring(item);
                setIsRecurringModalOpen(true);
              }}
              onDeleteItem={handleDeleteRecurring}
              onKeepSuggestion={handleKeepRecurringSuggestion}
              onIgnoreSuggestion={handleIgnoreSuggestion}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsView
              state={stateWithoutHidden!}
              onOpenAddModal={() => {
                setEditingSubscription(null);
                setIsSubscriptionModalOpen(true);
              }}
              onEditItem={(item) => {
                setEditingSubscription(item);
                setIsSubscriptionModalOpen(true);
              }}
              onDeleteItem={handleDeleteSubscription}
              onKeepSuggestion={handleKeepSubscriptionSuggestion}
              onIgnoreSuggestion={handleIgnoreSuggestion}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              state={stateWithoutHidden!}
              onOpenAddBudget={() => {
                setEditingBudget(null);
                setIsBudgetModalOpen(true);
              }}
              onEditBudget={(b) => {
                setEditingBudget(b);
                setIsBudgetModalOpen(true);
              }}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsView
              state={stateWithoutHidden!}
              onOpenAddGoal={() => {
                setEditingGoal(null);
                setIsGoalModalOpen(true);
              }}
              onEditGoal={(g) => {
                setEditingGoal(g);
                setIsGoalModalOpen(true);
              }}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'loans' && (
            <LoansView
              state={stateWithoutHidden!}
              onOpenAddLoan={() => {
                setEditingLoan(null);
                setIsLoanModalOpen(true);
              }}
              onEditLoan={(l) => {
                setEditingLoan(l);
                setIsLoanModalOpen(true);
              }}
              onDeleteLoan={handleDeleteLoan}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsView
              state={state}
              onOpenImport={() => setIsImportOpen(true)}
              onRefreshState={loadState}
              onDocumentDeleted={(id) => {
                setState((prev) =>
                  prev ? { ...prev, documents: prev.documents.filter((d) => d.id !== id) } : prev
                );
              }}
            />
          )}

          {activeTab === 'rules-tags' && (
            <RulesTagsView
              state={state}
              onOpenAddRule={() => {
                setEditingRule(null);
                setIsRuleModalOpen(true);
              }}
              onEditRule={(r) => {
                setEditingRule(r);
                setIsRuleModalOpen(true);
              }}
              onToggleRule={handleToggleRule}
              onDeleteRule={handleDeleteRule}
              onAddTag={handleAddTag}
              onDeleteTag={handleDeleteTag}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              state={state}
              onUpdateSettings={handleUpdateSettings}
              onOpenWipeData={() => setIsWipeDataOpen(true)}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>

      {/* 3. MOBILE NAVIGATION DRAWER (HAMBURGER MENU) */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddEntry={() => setIsAddEntryOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        documentCount={state?.documents?.length || 0}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 4. MODALS */}
      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        categories={mergedCategories}
        accounts={mergedAccounts}
        existingTags={(state.tags || []).map((t) => t.name)}
        onSuccess={(tx) => {
          if (tx) handleSaveTransaction(tx);
          loadState();
        }}
        onBulkSuccess={() => loadState()}
        onAddTag={handleAddTag}
      />

      <EditTransactionModal
        isOpen={isEditTxModalOpen}
        onClose={() => setIsEditTxModalOpen(false)}
        transaction={editingTx}
        categories={mergedCategories}
        accounts={mergedAccounts}
        existingTags={(state.tags || []).map((t) => t.name)}
        onSuccess={(tx) => {
          handleSaveTransaction(tx);
          loadState();
        }}
        onAddTag={handleAddTag}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        categories={mergedCategories}
        accounts={mergedAccounts}
        onSuccess={() => loadState()}
      />

      {tagModalTx && (
        <TagModal
          isOpen={!!tagModalTx}
          onClose={() => setTagModalTx(null)}
          transaction={tagModalTx}
          allTags={(state.tags || []).map((t) => t.name)}
          onCreateTag={handleAddTag}
          onSaveTags={async (txId, tags) => {
            try {
              const updated = await updateTransaction(txId, { tags });
              handleSaveTransaction(updated);
            } catch (err) {
              console.error('Failed to update tags:', err);
            }
          }}
        />
      )}

      <WipeDataModal
        isOpen={isWipeDataOpen}
        onClose={() => setIsWipeDataOpen(false)}
        onWipeComplete={handleWipeData}
      />

      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false);
          setEditingRecurring(null);
        }}
        item={editingRecurring}
        categories={mergedCategories}
        accounts={mergedAccounts}
        onSave={handleSaveRecurring}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
        item={editingSubscription}
        categories={mergedCategories}
        accounts={mergedAccounts}
        onSave={handleSaveSubscription}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setEditingBudget(null);
        }}
        budget={editingBudget}
        categories={mergedCategories}
        existingBudgets={state.settings?.budgets || []}
        onSave={handleSaveBudget}
        onDelete={handleDeleteBudget}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        goal={editingGoal}
        onSave={handleSaveGoal}
      />

      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        loan={editingLoan}
        onSave={handleSaveLoan}
      />

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setEditingRule(null);
        }}
        rule={editingRule}
        categories={mergedCategories}
        onSave={handleSaveRule}
      />

      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setEditingAsset(null);
        }}
        asset={editingAsset}
        onSave={handleSaveAsset}
      />

      <LiabilityModal
        isOpen={isLiabilityModalOpen}
        onClose={() => {
          setIsLiabilityModalOpen(false);
          setEditingLiability(null);
        }}
        liability={editingLiability}
        onSave={handleSaveLiability}
      />
    </div>
  );
};
export default App;
