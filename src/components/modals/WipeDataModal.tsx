import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { wipeState } from '../../api';

interface WipeDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWipeComplete: () => void;
}

export const WipeDataModal: React.FC<WipeDataModalProps> = ({
  isOpen,
  onClose,
  onWipeComplete,
}) => {
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmInput.trim() === 'DELETE';

  const handleWipe = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);

    try {
      await wipeState('DELETE ALL LEDGERLY DATA');
      onWipeComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to erase data');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        id="modal-wipe-data"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-rose-50 border-b border-rose-100">
          <div className="flex items-center gap-2.5 text-rose-700 font-bold">
            <AlertTriangle className="w-5 h-5" />
            <span>Erase Transactions & Documents</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          <p className="text-xs text-slate-600 leading-relaxed">
            This action will permanently delete all <strong>transactions and documents</strong>. Your budgets, goals, recurring rules, and custom settings will remain untouched.
          </p>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <span className="font-semibold text-slate-900">Note:</span> Original files in your Google Drive folder will <strong>not</strong> be deleted, and future sync runs will only import files modified after this reset.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Type <span className="font-mono text-rose-600 font-bold">DELETE</span> to confirm:
            </label>
            <input
              id="input-wipe-confirm"
              type="text"
              placeholder="DELETE"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-rose-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono tracking-wider"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-wipe"
              type="button"
              disabled={!isConfirmed || loading}
              onClick={handleWipe}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-rose-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              <span>{loading ? 'Wiping All Data...' : 'Erase Everything'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
