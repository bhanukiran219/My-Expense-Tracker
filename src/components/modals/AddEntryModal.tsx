import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  X,
  Upload,
  Plus,
  Tag as TagIcon,
  Check,
  FileSpreadsheet,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Transaction, TransactionType } from '../../types';
import { saveTransactions, uploadDocuments } from '../../api';
import { formatCurrency } from '../../utils/currency';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  accounts: string[];
  existingTags: string[];
  onSuccess: (newTx?: Transaction) => void;
  onAddTag: (tagName: string) => void;
  onBulkSuccess?: () => void;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isOpen,
  onClose,
  categories = [],
  accounts = [],
  existingTags = [],
  onSuccess,
  onAddTag,
  onBulkSuccess,
}) => {
  const safeCategories =
    categories.length > 0
      ? categories
      : ['Needs review', 'Housing', 'Groceries', 'Utilities', 'Dining', 'Transportation', 'Entertainment', 'Healthcare', 'Income'];
  const safeAccounts = accounts.length > 0 ? accounts : ['Main Checking', 'Savings', 'Credit Card'];
  const safeTags = existingTags || [];

  // Mode: 'manual' single entry vs 'csv' batch import
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');

  // Manual Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>(safeCategories[0] || 'Needs review');
  const [account, setAccount] = useState<string>(safeAccounts[0] || 'Main Checking');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [hasReceipt, setHasReceipt] = useState<boolean>(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvMapping, setCsvMapping] = useState<{
    date: string;
    merchant: string;
    amount: string;
    debit?: string;
    credit?: string;
    category?: string;
    account?: string;
  }>({
    date: '',
    merchant: '',
    amount: '',
    debit: '',
    credit: '',
    category: '',
    account: '',
  });
  const [csvTargetAccount, setCsvTargetAccount] = useState<string>(safeAccounts[0] || 'Main Checking');
  const [csvStep, setCsvStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [csvImportResult, setCsvImportResult] = useState<{
    inserted: number;
    duplicates: number;
    skipped: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetManualForm = () => {
    setType('expense');
    setAmount('');
    setMerchant('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(safeCategories[0] || 'Needs review');
    setAccount(safeAccounts[0] || 'Main Checking');
    setSelectedTags([]);
    setNewTagInput('');
    setHasReceipt(false);
    setReceiptFile(null);
  };

  const resetCsvState = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvStep('upload');
    setCsvImportResult(null);
    setError(null);
  };

  const handleModalClose = () => {
    resetManualForm();
    resetCsvState();
    setMode('manual');
    setError(null);
    onClose();
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreateNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    onAddTag(trimmed);
    setNewTagInput('');
  };

  // Process CSV file
  const processCsvFile = (file: File) => {
    setCsvFile(file);
    setError(null);
    setMode('csv');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 50,
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setError('Could not detect column headers in the CSV file.');
          setCsvStep('upload');
          return;
        }

        const fields = results.meta.fields;
        setCsvHeaders(fields);
        setCsvRows(results.data);

        // Auto-detect mappings based on standard header names
        const lower = fields.map((f) => f.toLowerCase());
        const findField = (terms: string[]) => {
          const idx = lower.findIndex((l) => terms.some((t) => l.includes(t)));
          return idx !== -1 ? fields[idx] : '';
        };

        const detectedDate = findField(['date', 'posted', 'transaction date', 'time', 'txn date']);
        const detectedMerchant = findField(['merchant', 'description', 'payee', 'name', 'details', 'memo', 'narration', 'particulars']);
        const detectedAmount = findField(['amount', 'total', 'net', 'transaction amount']);
        const detectedDebit = findField(['debit', 'withdrawal', 'charge', 'dr']);
        const detectedCredit = findField(['credit', 'deposit', 'payment', 'cr']);
        const detectedCategory = findField(['category', 'type', 'group']);
        const detectedAccount = findField(['account', 'card', 'source']);

        setCsvMapping({
          date: detectedDate || fields[0] || '',
          merchant: detectedMerchant || fields[1] || '',
          amount: detectedAmount || (!detectedDebit && !detectedCredit ? fields[2] || '' : ''),
          debit: detectedDebit,
          credit: detectedCredit,
          category: detectedCategory,
          account: detectedAccount,
        });

        setCsvStep('preview');
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
        setCsvStep('upload');
      },
    });
  };

  // Submit manual single transaction
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }

    if (!date) {
      setError('Please select a valid transaction date.');
      return;
    }

    setLoading(true);
    try {
      let receiptBacked = hasReceipt && !!receiptFile;
      if (hasReceipt && receiptFile) {
        const formData = new FormData();
        formData.append('files', receiptFile);
        await uploadDocuments(formData);
      }

      const res = await saveTransactions([
        {
          date,
          merchant: merchant.trim(),
          category: category || 'Needs review',
          amount: parsedAmount,
          type,
          account: account || 'Main Checking',
          tags: selectedTags,
          receipt: receiptBacked ? 1 : 0,
          source: 'manual',
        },
      ]);

      if (res.items && res.items.length > 0) {
        onSuccess(res.items[0]);
        handleModalClose();
      } else if (res.duplicates > 0) {
        setError('This transaction is an exact duplicate and was not re-added.');
      } else {
        setError('Failed to save transaction. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  // Execute CSV bulk import
  const handleExecuteCsvImport = async () => {
    if (!csvFile) return;
    setLoading(true);
    setError(null);

    try {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedTxs: Partial<Transaction>[] = [];

          for (const row of results.data as Record<string, any>[]) {
            // 1. Date
            const rawDate = row[csvMapping.date];
            if (!rawDate) continue;
            let dateStr = String(rawDate).trim();
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split('T')[0];
            }

            // 2. Merchant
            const merchantStr = String(row[csvMapping.merchant] || '').trim();
            if (!merchantStr) continue;

            // 3. Amount & Type
            let amountVal = 0;
            let txType: 'expense' | 'income' = 'expense';

            if (csvMapping.debit && row[csvMapping.debit] && parseFloat(row[csvMapping.debit]) > 0) {
              amountVal = Math.abs(parseFloat(row[csvMapping.debit]));
              txType = 'expense';
            } else if (csvMapping.credit && row[csvMapping.credit] && parseFloat(row[csvMapping.credit]) > 0) {
              amountVal = Math.abs(parseFloat(row[csvMapping.credit]));
              txType = 'income';
            } else if (csvMapping.amount && row[csvMapping.amount]) {
              const cleaned = String(row[csvMapping.amount]).replace(/[₹$,]/g, '').trim();
              const num = parseFloat(cleaned);
              if (!isNaN(num)) {
                if (num < 0) {
                  amountVal = Math.abs(num);
                  txType = 'expense';
                } else {
                  amountVal = num;
                  txType = 'expense';
                }
              }
            }

            if (isNaN(amountVal) || amountVal <= 0) continue;

            // 4. Category
            let cat = 'Needs review';
            if (csvMapping.category && row[csvMapping.category]) {
              const candidate = String(row[csvMapping.category]).trim();
              const matched = safeCategories.find((c) => c.toLowerCase() === candidate.toLowerCase());
              if (matched) cat = matched;
            }

            // 5. Account
            let acc = csvTargetAccount || safeAccounts[0] || 'Main Checking';
            if (csvMapping.account && row[csvMapping.account]) {
              acc = String(row[csvMapping.account]).trim();
            }

            parsedTxs.push({
              date: dateStr,
              merchant: merchantStr,
              amount: amountVal,
              type: txType,
              category: cat,
              account: acc,
              tags: ['CSV Import'],
              receipt: 0,
              source: 'csv',
            });
          }

          if (parsedTxs.length === 0) {
            setError('No valid transactions could be parsed from the selected CSV columns. Please check your column mappings.');
            setLoading(false);
            return;
          }

          const res = await saveTransactions(parsedTxs);
          setCsvImportResult({
            inserted: res.inserted,
            duplicates: res.duplicates,
            skipped: res.skipped,
          });
          setCsvStep('result');
          if (onBulkSuccess) {
            onBulkSuccess();
          } else {
            onSuccess();
          }
          setLoading(false);
        },
      });
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div
        id="modal-add-entry"
        className={`w-full bg-white rounded-3xl shadow-2xl border border-slate-200 my-8 transition-all relative ${
          mode === 'csv' ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              {mode === 'csv' ? <FileSpreadsheet className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === 'csv' ? 'Import Transactions from CSV' : 'Add Transaction Entry'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'csv'
                  ? 'Bulk upload bank statements and statements'
                  : 'Record a single manual transaction or upload CSV'}
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-3 bg-white">
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              setError(null);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-bold transition border-b-2 mr-6 ${
              mode === 'manual'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('csv');
              setError(null);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-bold transition border-b-2 ${
              mode === 'csv'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Upload CSV File</span>
            {csvFile && <span className="w-2 h-2 rounded-full bg-violet-600"></span>}
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* ================= MODE 1: MANUAL SINGLE ENTRY ================= */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
            {/* Type segmented control */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Type</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    type === 'expense'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 text-xs font-bold rounded-lg transition ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Income (+)
                </button>
              </div>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-entry-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <CustomDatePicker
                  id="input-entry-date"
                  value={date}
                  onChange={setDate}
                  align="right"
                  required
                />
              </div>
            </div>

            {/* Merchant / Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Merchant / Source <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-entry-merchant"
                type="text"
                placeholder="e.g. Swiggy, Amazon, Employer Payroll, Rent"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            {/* Category & Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                <CustomSelect
                  id="select-entry-category"
                  value={category}
                  onChange={setCategory}
                  options={safeCategories.map((c) => ({ value: c, label: c }))}
                  placeholder="Select category"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Account</label>
                <CustomSelect
                  id="select-entry-account"
                  value={account}
                  onChange={setAccount}
                  options={safeAccounts.map((a) => ({ value: a, label: a }))}
                  placeholder="Select account"
                  fullWidth
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {safeTags.map((t) => {
                  const isSelected = selectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleToggleTag(t)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add new tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={handleCreateNewTag}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition"
                >
                  Add tag
                </button>
              </div>
            </div>

            {/* Document / Receipt attachment */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  id="checkbox-has-receipt"
                  type="checkbox"
                  checked={hasReceipt}
                  onChange={(e) => setHasReceipt(e.target.checked)}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                />
                <span>Attach receipt image or document</span>
              </label>

              {hasReceipt && (
                <div className="mt-2.5 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  <input
                    id="file-receipt-upload"
                    type="file"
                    accept="image/*,application/pdf,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const selected = e.target.files[0];
                        if (selected.name.endsWith('.csv')) {
                          processCsvFile(selected);
                        } else {
                          setReceiptFile(selected);
                        }
                      }
                    }}
                    className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                  />
                  {receiptFile && (
                    <p className="text-[11px] text-emerald-600 mt-1 font-medium">
                      Attached: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMode('csv')}
                className="text-xs font-semibold text-violet-600 hover:text-violet-800 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Upload CSV instead</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-entry"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ================= MODE 2: UPLOAD CSV FILE (NO MANUAL FORM FIELDS) ================= */}
        {mode === 'csv' && (
          <div className="p-6 space-y-5">
            {/* STEP 1: UPLOAD DROPZONE */}
            {csvStep === 'upload' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      processCsvFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-violet-200 hover:border-violet-400 bg-violet-50/40 rounded-3xl p-8 text-center transition flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => document.getElementById('csv-file-picker-input')?.click()}
                >
                  <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">
                    Upload Bank Statement or CSV file
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    Drag and drop your bank or card export, or browse files from your device.
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Select CSV File
                  </button>
                  <input
                    id="csv-file-picker-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processCsvFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-600" />
                    <span>Supported Formats & Auto-Detection:</span>
                  </div>
                  <p className="text-slate-500">
                    Works automatically with standard exports from HDFC, SBI, ICICI, Chase, Amex, PayPal, Apple Card, and any custom spreadsheet containing Date, Description, and Amount columns.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: COLUMN MAPPING & LIVE PREVIEW (NO MANUAL INPUTS) */}
            {csvStep === 'preview' && csvFile && (
              <div className="space-y-4">
                {/* File Info Bar */}
                <div className="flex items-center justify-between p-3.5 bg-violet-50/70 border border-violet-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{csvFile.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {(csvFile.size / 1024).toFixed(1)} KB • {csvRows.length} detected rows
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetCsvState}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                  >
                    Change file
                  </button>
                </div>

                {/* Column Mappings */}
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Detected Column Mapping
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Date */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Date Column <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        value={csvMapping.date}
                        onChange={(val) => setCsvMapping({ ...csvMapping, date: val })}
                        options={csvHeaders.map((h) => ({ value: h, label: h }))}
                        placeholder="Select date column"
                        fullWidth
                        size="sm"
                      />
                    </div>

                    {/* Merchant / Description */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Merchant / Description <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        value={csvMapping.merchant}
                        onChange={(val) => setCsvMapping({ ...csvMapping, merchant: val })}
                        options={csvHeaders.map((h) => ({ value: h, label: h }))}
                        placeholder="Select merchant column"
                        fullWidth
                        size="sm"
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Amount Column <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        value={csvMapping.amount}
                        onChange={(val) => setCsvMapping({ ...csvMapping, amount: val })}
                        options={[
                          { value: '', label: '-- Single Amount Column --' },
                          ...csvHeaders.map((h) => ({ value: h, label: h })),
                        ]}
                        placeholder="Select amount column"
                        fullWidth
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Target Account */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Import Into Account
                      </label>
                      <CustomSelect
                        value={csvTargetAccount}
                        onChange={setCsvTargetAccount}
                        options={safeAccounts.map((a) => ({ value: a, label: a }))}
                        placeholder="Select target account"
                        fullWidth
                        size="sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Optional Category Column
                      </label>
                      <CustomSelect
                        value={csvMapping.category || ''}
                        onChange={(val) => setCsvMapping({ ...csvMapping, category: val })}
                        options={[
                          { value: '', label: 'Auto-categorize by rules' },
                          ...csvHeaders.map((h) => ({ value: h, label: h })),
                        ]}
                        placeholder="Select category column"
                        fullWidth
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Preview Table */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Parsed Preview (First {Math.min(csvRows.length, 4)} rows)</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Total: {csvRows.length} rows ready
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Merchant / Description</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {csvRows.slice(0, 4).map((row, idx) => {
                          const dateVal = row[csvMapping.date] || '-';
                          const merchVal = row[csvMapping.merchant] || '-';
                          const amtVal = row[csvMapping.amount] || row[csvMapping.debit] || row[csvMapping.credit] || '0';
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                {String(dateVal)}
                              </td>
                              <td className="px-3 py-2 font-medium text-slate-800 truncate max-w-[200px]">
                                {String(merchVal)}
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                                {String(amtVal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Import Action */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetCsvState}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCsvImport}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Import {csvRows.length} Transactions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: RESULT CONFIRMATION */}
            {csvStep === 'result' && csvImportResult && (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Import Completed Successfully!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your records and charts have been refreshed.
                  </p>
                </div>

                <div className="inline-flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <div>
                    <div className="text-base font-bold text-emerald-600">{csvImportResult.inserted}</div>
                    <div className="text-slate-500 font-medium">Added</div>
                  </div>
                  {csvImportResult.duplicates > 0 && (
                    <div className="border-l border-slate-200 pl-4">
                      <div className="text-base font-bold text-amber-600">{csvImportResult.duplicates}</div>
                      <div className="text-slate-500 font-medium">Duplicates skipped</div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                  >
                    Done & View Records
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
