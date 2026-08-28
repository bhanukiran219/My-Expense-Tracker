import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Tag as TagIcon,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import { AppState, Rule, Tag } from '../types';
import { getTagColorClass } from '../utils/tagColors';

interface RulesTagsViewProps {
  state: AppState;
  onOpenAddRule: () => void;
  onEditRule: (rule: Rule) => void;
  onToggleRule: (rule: Rule) => void;
  onDeleteRule: (id: string) => void;
  onAddTag: (tagName: string) => void;
  onDeleteTag: (tagName: string) => void;
}

export const RulesTagsView: React.FC<RulesTagsViewProps> = ({
  state,
  onOpenAddRule,
  onEditRule,
  onToggleRule,
  onDeleteRule,
  onAddTag,
  onDeleteTag,
}) => {
  const [newTagName, setNewTagName] = useState('');
  const rules = state.rules || [];
  const tags = state.tags || [];

  // Calculate tag usage counts from transactions
  const tagUsageMap: Record<string, number> = {};
  for (const tx of state.transactions) {
    if (tx.tags && Array.isArray(tx.tags)) {
      for (const t of tx.tags) {
        tagUsageMap[t] = (tagUsageMap[t] || 0) + 1;
      }
    }
  }

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    onAddTag(trimmed);
    setNewTagName('');
  };

  const handleDeleteTagConfirm = (tagName: string) => {
    onDeleteTag(tagName);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. CATEGORIZATION RULES SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-violet-600" />
              <span>Categorization Rules</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically assign categories to new transactions during CSV or Drive sync
            </p>
          </div>

          <button
            onClick={onOpenAddRule}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create rule</span>
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="py-14 text-center px-6 space-y-2">
            <p className="text-xs font-semibold text-slate-500">No categorization rules yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create rules like "When merchant contains Starbucks, then set category to Dining" to
              automate transaction sorting.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-5 flex items-center justify-between hover:bg-slate-50 transition gap-4"
              >
                <div className="flex items-center gap-3 text-xs sm:text-sm">
                  <span className="font-semibold text-slate-500">When merchant contains:</span>
                  <span className="font-mono bg-violet-50 text-violet-800 font-bold px-2.5 py-1 rounded-lg border border-violet-100">
                    "{rule.whenText}"
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-500">Set Category:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {rule.thenText}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled === 1}
                      onChange={() => onToggleRule(rule)}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                    />
                    <span className="hidden sm:inline font-medium">
                      {rule.enabled === 1 ? 'Active' : 'Disabled'}
                    </span>
                  </label>

                  <button
                    onClick={() => onEditRule(rule)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. TAG MANAGEMENT SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-violet-600" />
              <span>Tag Manager</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and manage custom transaction tags across your ledger
            </p>
          </div>

          {/* Quick create tag form */}
          <form onSubmit={handleCreateTag} className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Tag name (e.g. Tax-Deductible)..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
            >
              Add Tag
            </button>
          </form>
        </div>

        {/* Tag pills list */}
        <div>
          {tags.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">No global tags configured yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {tags.map((tag) => {
                const count = tagUsageMap[tag.name] || 0;
                return (
                  <div
                    key={tag.name}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-transparent text-xs font-medium transition ${getTagColorClass(tag.name)}`}
                  >
                    <span>{tag.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-600">
                      {count}
                    </span>
                    <button
                      onClick={() => handleDeleteTagConfirm(tag.name)}
                      className="text-slate-400 hover:text-rose-600 transition ml-0.5"
                      title="Delete tag"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
