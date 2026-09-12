import React, { useState, useMemo } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  CreditCard,
  Building2,
  Coins,
  Shield,
  Car,
  CircleDollarSign,
  Camera,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart,
  Calendar,
  DollarSign,
  AlertCircle,
  Clock,
  History,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppState, Asset, Liability, AssetCategory, LiabilityCategory, NetWorthSnapshot } from '../types';
import { formatCurrency, formatPercent } from '../utils/currency';

interface NetWorthViewProps {
  state: AppState;
  onOpenAddAsset: () => void;
  onEditAsset: (asset: Asset) => void;
  onDeleteAsset: (id: string) => void;
  onOpenAddLiability: () => void;
  onEditLiability: (liability: Liability) => void;
  onDeleteLiability: (id: string) => void;
  onRecordSnapshot: () => void;
  onDeleteSnapshot: (id: string) => void;
  onToggleIncludeLoans: (include: boolean) => void;
  isPrivacyMode: boolean;
  onTogglePrivacyMode: () => void;
  isHideAssets: boolean;
  onToggleHideAssets: () => void;
  isHideLiabilities: boolean;
  onToggleHideLiabilities: () => void;
  hiddenAssetIds: Set<string>;
  onToggleHideAsset: (id: string) => void;
  hiddenLiabilityIds: Set<string>;
  onToggleHideLiability: (id: string) => void;
}

const ASSET_CATEGORY_META: Record<AssetCategory, { label: string; icon: any; color: string; bg: string }> = {
  cash: { label: 'Cash & Banking', icon: Landmark, color: 'text-emerald-600', bg: 'bg-emerald-500' },
  investment: { label: 'Stocks & Equities', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-500' },
  real_estate: { label: 'Real Estate', icon: Building2, color: 'text-violet-600', bg: 'bg-violet-500' },
  crypto: { label: 'Crypto Assets', icon: Coins, color: 'text-amber-600', bg: 'bg-amber-500' },
  precious_metals: { label: 'Precious Metals', icon: Shield, color: 'text-yellow-600', bg: 'bg-yellow-500' },
  vehicle: { label: 'Vehicles & Tangibles', icon: Car, color: 'text-rose-600', bg: 'bg-rose-500' },
  other: { label: 'Alternative Assets', icon: CircleDollarSign, color: 'text-slate-600', bg: 'bg-slate-500' },
};

const LIABILITY_CATEGORY_META: Record<LiabilityCategory, { label: string; icon: any; color: string; bg: string }> = {
  credit_card: { label: 'Credit Card', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-500' },
  mortgage: { label: 'Mortgage', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-500' },
  auto_loan: { label: 'Auto Loan', icon: Car, color: 'text-blue-600', bg: 'bg-blue-500' },
  student_loan: { label: 'Student Loan', icon: Landmark, color: 'text-violet-600', bg: 'bg-violet-500' },
  personal_loan: { label: 'Personal Loan', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-500' },
  other: { label: 'Other Debt', icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-500' },
};

export const NetWorthView: React.FC<NetWorthViewProps> = ({
  state,
  onOpenAddAsset,
  onEditAsset,
  onDeleteAsset,
  onOpenAddLiability,
  onEditLiability,
  onDeleteLiability,
  onRecordSnapshot,
  onDeleteSnapshot,
  onToggleIncludeLoans,
  isPrivacyMode,
  onTogglePrivacyMode,
  isHideAssets,
  onToggleHideAssets,
  isHideLiabilities,
  onToggleHideLiabilities,
  hiddenAssetIds,
  onToggleHideAsset,
  hiddenLiabilityIds,
  onToggleHideLiability,
}) => {
  const [parentAssets] = useAutoAnimate();
  const [parentLiabilities] = useAutoAnimate();
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'assets' | 'liabilities' | 'history'>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [liabilityFilter, setLiabilityFilter] = useState<string>('all');
  const [snapshotSavedNotice, setSnapshotSavedNotice] = useState(false);

  const renderAmount = (amount: number, isHidden?: boolean) => {
    if (isPrivacyMode || isHidden) {
      return '••••••';
    }
    return formatCurrency(amount);
  };

  const assets = state.settings.assets || [];
  const liabilities = state.settings.liabilities || [];
  const historySnapshots = state.settings.netWorthHistory || [];
  const includeLoans = state.settings.includeLoansInLiabilities !== false;

  // Active borrowed debts from Loans module
  const externalLoansDebt = useMemo(() => {
    if (!includeLoans) return 0;
    const loans = state.settings.loans || [];
    return loans
      .filter((l) => l.type === 'borrowed')
      .reduce((sum, l) => sum + Math.max(0, l.amount - l.paidAmount), 0);
  }, [includeLoans, state.settings.loans]);

  // Total Calculations
  const totalAssets = useMemo(() => {
    return assets.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [assets]);

  const directLiabilities = useMemo(() => {
    return liabilities.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  }, [liabilities]);

  const totalLiabilities = directLiabilities + externalLoansDebt;
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Liquid assets (cash + investments + crypto)
  const liquidAssets = useMemo(() => {
    return assets
      .filter((a) => a.category === 'cash' || a.category === 'investment' || a.category === 'crypto')
      .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
  }, [assets]);

  // Average monthly expense for runway calculation
  const monthlyBurn = useMemo(() => {
    const expenses = state.transactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return 0;
    const totalExp = expenses.reduce((sum, t) => sum + t.amount, 0);
    return totalExp / 3; // Approx 3-month baseline
  }, [state.transactions]);

  const liquidRunwayMonths = monthlyBurn > 0 ? (liquidAssets / monthlyBurn).toFixed(1) : '∞';

  // Asset category breakdown
  const assetCategoryBreakdown = useMemo(() => {
    const map: Record<AssetCategory, number> = {
      cash: 0,
      investment: 0,
      real_estate: 0,
      crypto: 0,
      precious_metals: 0,
      vehicle: 0,
      other: 0,
    };
    for (const a of assets) {
      if (map[a.category] !== undefined) {
        map[a.category] += Number(a.value) || 0;
      }
    }
    return Object.entries(map)
      .map(([cat, val]) => ({
        category: cat as AssetCategory,
        amount: val,
        percentage: totalAssets > 0 ? (val / totalAssets) * 100 : 0,
        meta: ASSET_CATEGORY_META[cat as AssetCategory],
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [assets, totalAssets]);

  // Filtered lists
  const filteredAssets = useMemo(() => {
    if (assetFilter === 'all') return assets;
    return assets.filter((a) => a.category === assetFilter);
  }, [assets, assetFilter]);

  const filteredLiabilities = useMemo(() => {
    if (liabilityFilter === 'all') return liabilities;
    return liabilities.filter((l) => l.category === liabilityFilter);
  }, [liabilities, liabilityFilter]);

  const handleSnapshotClick = () => {
    onRecordSnapshot();
    setSnapshotSavedNotice(true);
    setTimeout(() => setSnapshotSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 1. HERO WEALTH BANNER */}
      <div className="relative overflow-hidden bg-white text-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs border border-slate-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 sm:px-2.5 py-0.5 rounded-full">
                Wealth Portfolio
              </span>
            </div>
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 block">Total Net Worth</span>
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
                  {renderAmount(netWorth)}
                </h1>
                <span
                  className={`text-[11px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full flex items-center gap-1 ${
                    netWorth >= 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {netWorth >= 0 ? <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                  {netWorth >= 0 ? 'Positive Wealth' : 'Net Debt'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: 2-column grid on mobile */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              onClick={onTogglePrivacyMode}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                isPrivacyMode
                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isPrivacyMode ? 'Show all amounts' : 'Hide all amounts (Privacy mode)'}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" /> : <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />}
              <span>{isPrivacyMode ? 'Hidden' : 'Hide'}</span>
            </button>

            <button
              onClick={onOpenAddAsset}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Add Asset</span>
            </button>

            <button
              onClick={onOpenAddLiability}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
              <span>Add Debt</span>
            </button>

            <button
              onClick={handleSnapshotClick}
              className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
              title="Save a historical snapshot of your net worth today"
            >
              {snapshotSavedNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                  <span className="text-emerald-700">Saved!</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" />
                  <span>Snapshot</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. TOP METRIC STRIP */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-200">
          <div className="bg-emerald-50/50 rounded-2xl p-3 sm:p-4 border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition">
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Total Assets
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-600">
              {renderAmount(totalAssets)}
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-emerald-700/80 mt-0.5 block">
              {assets.length} holding{assets.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="bg-rose-50/50 rounded-2xl p-3 sm:p-4 border border-rose-200/80 shadow-xs hover:border-rose-300 transition">
            <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
              Total Liabilities
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600">
              {renderAmount(totalLiabilities)}
            </div>
            <span className="text-[11px] font-medium text-rose-700/80 mt-0.5 block">
              {liabilities.length} debt{liabilities.length === 1 ? '' : 's'} {externalLoansDebt > 0 ? '+ Loans' : ''}
            </span>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Debt-to-Asset
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {isPrivacyMode ? '••••••' : `${debtToAssetRatio.toFixed(1)}%`}
            </div>
            <span className="text-[11px] font-medium text-slate-600 mt-0.5 block">
              {debtToAssetRatio < 30 ? 'Healthy leverage' : debtToAssetRatio < 60 ? 'Moderate' : 'High leverage'}
            </span>
          </div>

          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-200/80 shadow-xs hover:border-blue-300 transition">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block mb-1">
              Liquid Runway
            </span>
            <div className="text-xl sm:text-2xl font-black text-blue-600">
              {isPrivacyMode ? (
                '••••••'
              ) : (
                <>
                  {liquidRunwayMonths}{' '}
                  <span className="text-xs font-bold text-blue-700">
                    {liquidRunwayMonths === '1.0' || liquidRunwayMonths === '1' ? 'month' : 'months'}
                  </span>
                </>
              )}
            </div>
            <span className="text-[11px] font-medium text-blue-700/80 mt-0.5 block">
              {renderAmount(liquidAssets)} in liquid cash / stocks
            </span>
          </div>
        </div>
      </div>

      {/* 3. ASSET ALLOCATION BAR & DISTRIBUTION */}
      {totalAssets > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-violet-600" />
              <h2 className="text-sm font-bold text-slate-900">Asset Allocation & Distribution</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              100% of {formatCurrency(totalAssets)}
            </span>
          </div>

          {/* Multi-segmented Progress Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden bg-slate-100 flex shadow-inner">
            {assetCategoryBreakdown.map((item) => (
              <div
                key={item.category}
                style={{ width: `${item.percentage}%` }}
                className={`${item.meta.bg} h-full transition-all duration-500 hover:opacity-90 relative group`}
                title={`${item.meta.label}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`}
              />
            ))}
          </div>

          {/* Allocation Chips */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {assetCategoryBreakdown.map((item) => (
              <div
                key={item.category}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${item.meta.bg}`}></div>
                <span className="font-semibold text-slate-700">{item.meta.label}</span>
                <span className="font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                <span className="text-[10px] font-bold text-slate-400">({item.percentage.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SUB TABS BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center overflow-x-auto no-scrollbar max-w-full gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Holdings ({assets.length + liabilities.length})
          </button>
          <button
            onClick={() => setActiveSubTab('assets')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'assets'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assets ({assets.length})
          </button>
          <button
            onClick={() => setActiveSubTab('liabilities')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'liabilities'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Liabilities ({liabilities.length})
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'history'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Snapshots History ({historySnapshots.length})
          </button>
        </div>

        {/* Sync Loans Toggle */}
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <input
            type="checkbox"
            checked={includeLoans}
            onChange={(e) => onToggleIncludeLoans(e.target.checked)}
            className="rounded text-violet-600 focus:ring-violet-500/20 cursor-pointer"
          />
          <span>Include Loans Tracker ({formatCurrency(externalLoansDebt)})</span>
        </label>
      </div>

      {/* 5. MAIN CONTENT GRIDS */}
      {activeSubTab === 'history' ? (
        /* HISTORICAL SNAPSHOTS VIEW */
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Historical Net Worth Snapshots</h3>
                <p className="text-xs text-slate-400">Track how your wealth grows month-over-month</p>
              </div>
            </div>
            <button
              onClick={handleSnapshotClick}
              className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Today's Snapshot</span>
            </button>
          </div>

          {historySnapshots.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No snapshots recorded yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click "Record Snapshot" to capture your net worth milestone today and start building your historical wealth chart.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {historySnapshots
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((snap) => (
                  <div key={snap.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 font-bold text-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900">{snap.date}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>Assets: {formatCurrency(snap.assetsTotal)}</span>
                          <span>•</span>
                          <span>Liabilities: {formatCurrency(snap.liabilitiesTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-sm text-slate-900">
                          {formatCurrency(snap.netWorth)}
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            snap.netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {snap.netWorth >= 0 ? 'Surplus' : 'Deficit'}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteSnapshot(snap.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : (
        /* ASSETS & LIABILITIES DUAL VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* LEFT: ASSETS COLUMN */}
          {(activeSubTab === 'all' || activeSubTab === 'assets') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Assets Portfolio</h3>
                    <p className="text-[11px] text-slate-500">{renderAmount(totalAssets)} across {assets.length} items</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onToggleHideAssets}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                    title={isHideAssets ? 'Show Assets list' : 'Hide Assets list'}
                  >
                    {isHideAssets ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isHideAssets ? 'Show' : 'Hide'}</span>
                  </button>

                  <button
                    onClick={onOpenAddAsset}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Asset</span>
                  </button>
                </div>
              </div>

              {isHideAssets ? (
                <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-2">
                  <EyeOff className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Assets Portfolio is hidden ({assets.length} items)</p>
                  <button
                    onClick={onToggleHideAssets}
                    className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Click to show assets
                  </button>
                </div>
              ) : assets.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">No assets added yet</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Add your bank balances, stock portfolios, real estate, or crypto to track your full wealth.
                  </p>
                  <button
                    onClick={onOpenAddAsset}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Asset</span>
                  </button>
                </div>
              ) : (
                <div ref={parentAssets} className="space-y-3">
                  {filteredAssets.map((asset) => {
                    const meta = ASSET_CATEGORY_META[asset.category] || ASSET_CATEGORY_META.other;
                    const Icon = meta.icon;
                    const isHidden = hiddenAssetIds.has(asset.id);

                    return (
                      <div
                        key={asset.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-200 hover:shadow-md transition group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${meta.color} shrink-0`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition">
                                  {asset.name}
                                </h4>
                                {asset.growthRate !== undefined && (
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                    +{asset.growthRate}%/yr
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span className="font-medium">{meta.label}</span>
                                {asset.institution && (
                                  <>
                                    <span>•</span>
                                    <span>{asset.institution}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-base text-slate-900">
                              {renderAmount(asset.value, isHidden)}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {totalAssets > 0 && !isHidden && !isPrivacyMode
                                ? `${((asset.value / totalAssets) * 100).toFixed(1)}%`
                                : '•••'}
                            </span>
                          </div>
                        </div>

                        {asset.note && (
                          <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 px-2.5 py-1 rounded-lg">
                            {asset.note}
                          </p>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Updated {asset.updatedAt}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onToggleHideAsset(asset.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title={isHidden ? 'Show asset amount' : 'Hide asset amount'}
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => onEditAsset(asset)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Asset"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteAsset(asset.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RIGHT: LIABILITIES COLUMN */}
          {(activeSubTab === 'all' || activeSubTab === 'liabilities') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Liabilities & Debts</h3>
                    <p className="text-[11px] text-slate-500">{renderAmount(totalLiabilities)} total outstanding</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onToggleHideLiabilities}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                    title={isHideLiabilities ? 'Show Liabilities list' : 'Hide Liabilities list'}
                  >
                    {isHideLiabilities ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isHideLiabilities ? 'Show' : 'Hide'}</span>
                  </button>

                  <button
                    onClick={onOpenAddLiability}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Liability</span>
                  </button>
                </div>
              </div>

              {isHideLiabilities ? (
                <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center space-y-2">
                  <EyeOff className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">Liabilities & Debts are hidden ({liabilities.length} items)</p>
                  <button
                    onClick={onToggleHideLiabilities}
                    className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Click to show liabilities
                  </button>
                </div>
              ) : liabilities.length === 0 && externalLoansDebt === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-800">Debt Free!</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    You have no liabilities logged. Add mortgages, credit cards, or auto loans if applicable.
                  </p>
                  <button
                    onClick={onOpenAddLiability}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Liability</span>
                  </button>
                </div>
              ) : (
                <div ref={parentLiabilities} className="space-y-3">
                  {/* External Borrowed Debts summary card if enabled */}
                  {includeLoans && externalLoansDebt > 0 && (
                    <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-amber-950">Active Loans Tracker Debts</h4>
                            <p className="text-xs text-amber-700">Auto-synced from Loans & Debts module</p>
                          </div>
                        </div>
                        <div className="text-right font-black text-base text-amber-900">
                          {renderAmount(externalLoansDebt)}
                        </div>
                      </div>
                    </div>
                  )}

                  {filteredLiabilities.map((liability) => {
                    const meta = LIABILITY_CATEGORY_META[liability.category] || LIABILITY_CATEGORY_META.other;
                    const Icon = meta.icon;
                    const isHidden = hiddenLiabilityIds.has(liability.id);

                    return (
                      <div
                        key={liability.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-rose-200 hover:shadow-md transition group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${meta.color} shrink-0`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-slate-900 group-hover:text-rose-700 transition">
                                  {liability.name}
                                </h4>
                                {liability.interestRate !== undefined && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                                    {liability.interestRate}% APR
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span className="font-medium">{meta.label}</span>
                                {liability.institution && (
                                  <>
                                    <span>•</span>
                                    <span>{liability.institution}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-black text-base text-rose-600">
                              {renderAmount(liability.amount, isHidden)}
                            </div>
                            {liability.monthlyPayment && (
                              <span className="text-[10px] text-slate-400">
                                {isHidden || isPrivacyMode ? '••••••' : `${formatCurrency(liability.monthlyPayment)}/mo`}
                              </span>
                            )}
                          </div>
                        </div>

                        {liability.note && (
                          <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 px-2.5 py-1 rounded-lg">
                            {liability.note}
                          </p>
                        )}

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {liability.dueDate ? `Target: ${liability.dueDate}` : `Updated ${liability.updatedAt}`}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onToggleHideLiability(liability.id)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title={isHidden ? 'Show liability amount' : 'Hide liability amount'}
                            >
                              {isHidden ? <Eye className="w-3.5 h-3.5 text-rose-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => onEditLiability(liability)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Liability"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteLiability(liability.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Liability"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
