import React, { useState, useEffect } from 'react';
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
} from './types';
import {
  fetchAppState,
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
} from './api';

// Components
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileNav } from './components/MobileNav';

// Views
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { RecurringView } from './components/RecurringView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { BudgetsView } from './components/BudgetsView';
import { GoalsView } from './components/GoalsView';
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
import { RuleModal } from './components/modals/RuleModal';

export const App: React.FC = () => {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [period, setPeriod] = useState<DatePeriod>('this-month');

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

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Initial Load
  const loadState = async () => {
    try {
      const data = await fetchAppState();
      setState(data);
    } catch (err) {
      console.error('Failed to load application state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  if (loading || !state) {
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
      account: state.settings.accounts[0] || 'Main Checking',
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
      account: state.settings.accounts[0] || 'Everyday Visa',
      active: true,
    };
    await handleSaveSubscription(newItem);
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

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* 1. DESKTOP SIDEBAR */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* TOP BAR */}
        <TopBar
          activeTab={activeTab}
          period={period}
          onPeriodChange={setPeriod}
          onOpenAddEntry={() => setIsAddEntryOpen(true)}
          onOpenImport={() => setIsImportOpen(true)}
        />

        {/* VIEW CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              state={state}
              period={period}
              onPeriodChange={setPeriod}
              onNavigateTab={setActiveTab}
              onOpenAddEntry={() => setIsAddEntryOpen(true)}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              state={state}
              period={period}
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
              state={state}
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
              state={state}
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
              state={state}
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
              state={state}
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

          {activeTab === 'documents' && (
            <DocumentsView
              state={state}
              onOpenImport={() => setIsImportOpen(true)}
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

      {/* 3. MOBILE NAVIGATION BAR */}
      <MobileNav activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* 4. MODALS */}
      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        categories={state.settings?.categories || []}
        accounts={state.settings?.accounts || []}
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
        categories={state.settings?.categories || []}
        accounts={state.settings?.accounts || []}
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
        categories={state.settings?.categories || []}
        accounts={state.settings?.accounts || []}
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
        categories={state.settings?.categories || []}
        accounts={state.settings?.accounts || []}
        onSave={handleSaveRecurring}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => {
          setIsSubscriptionModalOpen(false);
          setEditingSubscription(null);
        }}
        item={editingSubscription}
        categories={state.settings?.categories || []}
        accounts={state.settings?.accounts || []}
        onSave={handleSaveSubscription}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setEditingBudget(null);
        }}
        budget={editingBudget}
        categories={state.settings?.categories || []}
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

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false);
          setEditingRule(null);
        }}
        rule={editingRule}
        categories={state.settings?.categories || []}
        onSave={handleSaveRule}
      />
    </div>
  );
};
export default App;
