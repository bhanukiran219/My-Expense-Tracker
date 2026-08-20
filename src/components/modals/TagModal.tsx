import React, { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';
import { Transaction } from '../../types';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  allTags: string[];
  onSaveTags: (txId: string, tags: string[]) => void;
  onCreateTag: (tagName: string) => void;
}

export const TagModal: React.FC<TagModalProps> = ({
  isOpen,
  onClose,
  transaction,
  allTags = [],
  onSaveTags,
  onCreateTag,
}) => {
  if (!isOpen || !transaction) return null;

  const safeTags = allTags || [];

  const [selectedTags, setSelectedTags] = useState<string[]>(transaction.tags || []);
  const [newTagText, setNewTagText] = useState<string>('');

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagText.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    onCreateTag(trimmed);
    setNewTagText('');
  };

  const handleSave = () => {
    onSaveTags(transaction.id, selectedTags);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="modal-tags"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Manage Tags</h3>
            <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
              {transaction.merchant} (${transaction.amount.toFixed(2)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Select tags for this transaction:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
              {safeTags.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tags created yet.</p>
              ) : (
                safeTags.map((t) => {
                  const isSelected = selectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {t}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Add new tag field (simple tag name only) */}
          <form onSubmit={handleAddNewTag} className="pt-2 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Create new tag name..."
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
            >
              Add
            </button>
          </form>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="btn-save-transaction-tags"
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition"
            >
              Apply Tags
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
