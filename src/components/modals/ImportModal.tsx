import React, { useState } from 'react';
import Papa from 'papaparse';
import { X, Upload, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Transaction } from '../../types';
import { saveTransactions, uploadDocuments } from '../../api';
import { CustomSelect } from '../CustomSelect';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  accounts: string[];
  onSuccess: (count: number) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  categories = [],
  accounts = [],
  onSuccess,
}) => {
  const safeCategories = categories && categories.length > 0 ? categories : ['Needs review', 'Housing', 'Groceries', 'Utilities', 'Dining', 'Transportation', 'Entertainment', 'Healthcare', 'Income'];
  const safeAccounts = accounts && accounts.length > 0 ? accounts : ['Main Checking', 'Savings', 'Everyday Visa'];
  const [tab, setTab] = useState<'csv' | 'document'>('csv');

  // CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<{
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
  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload');

  // Document State
  const [docFiles, setDocFiles] = useState<FileList | null>(null);
  const [docUploading, setDocUploading] = useState<boolean>(false);

  // Result state
  const [importResult, setImportResult] = useState<{
    inserted: number;
    duplicates: number;
    skipped: number;
    needsReview: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAll = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setStep('upload');
    setDocFiles(null);
    setImportResult(null);
    setError(null);
  };

  const handleCsvFileSelect = (file: File) => {
    setCsvFile(file);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 100,
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setError('Could not detect column headers in CSV.');
          return;
        }

        const fields = results.meta.fields;
        setCsvHeaders(fields);
        setCsvRows(results.data);

        // Auto-detect mappings based on header names
        const lower = fields.map((f) => f.toLowerCase());
        const findField = (terms: string[]) => {
          const idx = lower.findIndex((l) => terms.some((t) => l.includes(t)));
          return idx !== -1 ? fields[idx] : '';
        };

        const detectedDate = findField(['date', 'posted', 'transaction date', 'time']);
        const detectedMerchant = findField(['merchant', 'description', 'payee', 'name', 'details', 'memo']);
        const detectedAmount = findField(['amount', 'total', 'net']);
        const detectedDebit = findField(['debit', 'withdrawal', 'charge']);
        const detectedCredit = findField(['credit', 'deposit', 'payment']);
        const detectedCategory = findField(['category', 'type', 'group']);
        const detectedAccount = findField(['account', 'card', 'source']);

        setColumnMapping({
          date: detectedDate,
          merchant: detectedMerchant,
          amount: detectedAmount,
          debit: detectedDebit,
          credit: detectedCredit,
          category: detectedCategory,
          account: detectedAccount,
        });

        setStep('map');
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleExecuteCsvImport = async () => {
    if (!csvFile) return;
    setLoading(true);
    setError(null);

    try {
      // Parse full file
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedTxs: Partial<Transaction>[] = [];

          for (const row of results.data as Record<string, any>[]) {
            // 1. Date
            const rawDate = row[columnMapping.date];
            if (!rawDate) continue;
            let dateStr = String(rawDate).trim();
            // Normalize dates to YYYY-MM-DD
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
              dateStr = d.toISOString().split('T')[0];
            }

            // 2. Merchant
            const merchantStr = String(row[columnMapping.merchant] || '').trim();
            if (!merchantStr) continue;

            // 3. Amount & Type
            let amountVal = 0;
            let txType: 'expense' | 'income' = 'expense';

            if (columnMapping.debit && row[columnMapping.debit] && parseFloat(row[columnMapping.debit]) > 0) {
              amountVal = parseFloat(row[columnMapping.debit]);
              txType = 'expense';
            } else if (columnMapping.credit && row[columnMapping.credit] && parseFloat(row[columnMapping.credit]) > 0) {
              amountVal = parseFloat(row[columnMapping.credit]);
              txType = 'income';
            } else if (columnMapping.amount && row[columnMapping.amount]) {
              const cleaned = String(row[columnMapping.amount]).replace(/[$,]/g, '').trim();
              const num = parseFloat(cleaned);
              if (!isNaN(num)) {
                if (num < 0) {
                  amountVal = Math.abs(num);
                  txType = 'expense';
                } else {
                  amountVal = num;
                  txType = 'expense'; // Default bank statement convention or positive debit
                }
              }
            }

            if (isNaN(amountVal) || amountVal <= 0) continue;

            // 4. Category
            let cat = 'Needs review';
            if (columnMapping.category && row[columnMapping.category]) {
              const candidate = String(row[columnMapping.category]).trim();
              const matched = categories.find((c) => c.toLowerCase() === candidate.toLowerCase());
              if (matched) cat = matched;
            }

            // 5. Account
            let acc = accounts[0] || 'Imported account';
            if (columnMapping.account && row[columnMapping.account]) {
              acc = String(row[columnMapping.account]).trim();
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
            setError('No valid transactions could be parsed from the mapped columns.');
            setLoading(false);
            return;
          }

          const res = await saveTransactions(parsedTxs);
          setImportResult({
            inserted: res.inserted,
            duplicates: res.duplicates,
            skipped: res.skipped,
            needsReview: res.needsReview,
          });
          setStep('result');
          onSuccess(res.inserted);
          setLoading(false);
        },
      });
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setLoading(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!docFiles || docFiles.length === 0) return;
    setDocUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < docFiles.length; i++) {
        formData.append('files', docFiles[i]);
      }
      const res = await uploadDocuments(formData);
      setImportResult({
        inserted: res.extractedTransactions?.length || 0,
        duplicates: 0,
        skipped: 0,
        needsReview: res.documents.filter((d) => d.status === 'review').length,
      });
      setStep('result');
      onSuccess(res.extractedTransactions?.length || 0);
    } catch (err: any) {
      setError(err.message || 'Document upload failed');
    } finally {
      setDocUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div
        id="modal-import"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Import Financial Data</h3>
              <p className="text-xs text-slate-500">CSV Bank Statements, Invoices & Receipts</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        {step !== 'result' && (
          <div className="flex border-b border-slate-100 px-6 pt-3">
            <button
              onClick={() => {
                setTab('csv');
                resetAll();
              }}
              className={`pb-3 text-xs font-bold transition border-b-2 mr-6 ${
                tab === 'csv'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              CSV Bank Statement
            </button>
            <button
              onClick={() => {
                setTab('document');
                resetAll();
              }}
              className={`pb-3 text-xs font-bold transition border-b-2 ${
                tab === 'document'
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Receipts / Documents Vault
            </button>
          </div>
        )}

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* TAB 1: CSV */}
          {tab === 'csv' && step === 'upload' && (
            <div className="space-y-4 text-center">
              <label
                htmlFor="csv-file-input"
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-violet-50/20 transition"
              >
                <FileSpreadsheet className="w-12 h-12 text-violet-500 mb-3" />
                <span className="text-sm font-bold text-slate-800">
                  Select or drop your bank CSV statement
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Supports checking, savings, and credit card CSV exports (Max 20MB)
                </span>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsvFileSelect(e.target.files[0]);
                    }
                  }}
                />
              </label>
            </div>
          )}

          {tab === 'csv' && step === 'map' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Map CSV Columns</h4>
                  <p className="text-xs text-slate-500">
                    File: <span className="font-semibold text-slate-700">{csvFile?.name}</span> ({csvRows.length} sample rows previewed)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="text-xs font-semibold text-violet-600 hover:underline"
                >
                  Change file
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Column <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    value={columnMapping.date}
                    onChange={(val) => setColumnMapping({ ...columnMapping, date: val })}
                    options={[
                      { value: '', label: '-- Select Date Column --' },
                      ...csvHeaders.map((h) => ({ value: h, label: h })),
                    ]}
                    placeholder="Select Date Column"
                    fullWidth
                    size="sm"
                  />
                </div>

                {/* Merchant / Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Merchant / Description <span className="text-rose-500">*</span>
                  </label>
                  <CustomSelect
                    value={columnMapping.merchant}
                    onChange={(val) => setColumnMapping({ ...columnMapping, merchant: val })}
                    options={[
                      { value: '', label: '-- Select Merchant Column --' },
                      ...csvHeaders.map((h) => ({ value: h, label: h })),
                    ]}
                    placeholder="Select Merchant Column"
                    fullWidth
                    size="sm"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount Column (Single Amount)
                  </label>
                  <CustomSelect
                    value={columnMapping.amount}
                    onChange={(val) => setColumnMapping({ ...columnMapping, amount: val })}
                    options={[
                      { value: '', label: '-- None / Use Debit & Credit --' },
                      ...csvHeaders.map((h) => ({ value: h, label: h })),
                    ]}
                    placeholder="Select Amount Column"
                    fullWidth
                    size="sm"
                  />
                </div>

                {/* Debit & Credit */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Debit (-)</label>
                    <CustomSelect
                      value={columnMapping.debit || ''}
                      onChange={(val) => setColumnMapping({ ...columnMapping, debit: val })}
                      options={[
                        { value: '', label: '-- None --' },
                        ...csvHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                      placeholder="Debit Column"
                      fullWidth
                      size="sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Credit (+)</label>
                    <CustomSelect
                      value={columnMapping.credit || ''}
                      onChange={(val) => setColumnMapping({ ...columnMapping, credit: val })}
                      options={[
                        { value: '', label: '-- None --' },
                        ...csvHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                      placeholder="Credit Column"
                      fullWidth
                      size="sm"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category (Optional)</label>
                  <CustomSelect
                    value={columnMapping.category || ''}
                    onChange={(val) => setColumnMapping({ ...columnMapping, category: val })}
                    options={[
                      { value: '', label: '-- None (use Needs review) --' },
                      ...csvHeaders.map((h) => ({ value: h, label: h })),
                    ]}
                    placeholder="Category Column"
                    fullWidth
                    size="sm"
                  />
                </div>

                {/* Account */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account (Optional)</label>
                  <CustomSelect
                    value={columnMapping.account || ''}
                    onChange={(val) => setColumnMapping({ ...columnMapping, account: val })}
                    options={[
                      { value: '', label: '-- None (use default) --' },
                      ...csvHeaders.map((h) => ({ value: h, label: h })),
                    ]}
                    placeholder="Account Column"
                    fullWidth
                    size="sm"
                  />
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  id="btn-confirm-csv-import"
                  type="button"
                  disabled={loading || !columnMapping.date || !columnMapping.merchant || (!columnMapping.amount && !columnMapping.debit && !columnMapping.credit)}
                  onClick={handleExecuteCsvImport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition disabled:opacity-50"
                >
                  {loading ? 'Importing Statement...' : 'Import Statement'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Document Vault Upload */}
          {tab === 'document' && step === 'upload' && (
            <div className="space-y-4">
              <label
                htmlFor="doc-files-input"
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-violet-50/20 transition text-center"
              >
                <FileText className="w-12 h-12 text-violet-500 mb-3" />
                <span className="text-sm font-bold text-slate-800">
                  Select receipts, statements, invoices, PDFs or images
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Upload multiple documents directly to your encrypted R2 vault (Max 20MB per file)
                </span>
                <input
                  id="doc-files-input"
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.csv,.xlsx"
                  className="hidden"
                  onChange={(e) => setDocFiles(e.target.files)}
                />
              </label>

              {docFiles && docFiles.length > 0 && (
                <div className="p-3 bg-violet-50/50 border border-violet-100 rounded-xl">
                  <p className="text-xs font-semibold text-violet-900 mb-1">
                    {docFiles.length} file(s) selected:
                  </p>
                  <ul className="text-[11px] text-slate-600 space-y-0.5 max-h-24 overflow-y-auto">
                    {Array.from(docFiles).map((f: File, i: number) => (
                      <li key={i}>
                        • {f.name} ({(f.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={docUploading || !docFiles || docFiles.length === 0}
                  onClick={handleDocumentUpload}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition disabled:opacity-50"
                >
                  {docUploading ? 'Storing Documents...' : `Store ${docFiles?.length || 0} Document(s)`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 'result' && importResult && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Import Processing Complete</h4>
                  <p className="text-xs text-emerald-700">
                    D1 database and R2 storage updated with duplicate protection.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-slate-900">
                    {importResult.inserted}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Inserted</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-amber-600">
                    {importResult.duplicates}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Duplicates Skipped</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-violet-600">
                    {importResult.needsReview}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Needs Review</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="block text-2xl font-bold text-slate-500">
                    {importResult.skipped}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">Ignored/Blank</span>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  id="btn-finish-import"
                  type="button"
                  onClick={() => {
                    resetAll();
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-violet-200"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
