import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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

  const handleCsvFileSelect = (file: File, isFastImport = false) => {
    setCsvFile(file);
    setError(null);

    const handleData = (fields: string[], data: any[]) => {
      if (!fields || fields.length === 0) {
        setError('Could not detect column headers in the file.');
        return;
      }

      setCsvHeaders(fields);
      setCsvRows(data);

      const lower = fields.map((f) => f.toLowerCase());
      const findField = (terms: string[]) => {
        const idx = lower.findIndex((l) => terms.some((t) => l.includes(t)));
        return idx !== -1 ? fields[idx] : '';
      };

      const detectedDate = findField(['date', 'posted', 'transaction date', 'time']);
      const detectedMerchant = findField(['merchant', 'description', 'payee', 'name', 'details', 'memo', 'narration', 'remarks']);
      let detectedAmount = findField(['amount', 'total', 'net']);
      const detectedDebit = findField(['debit', 'withdrawal', 'charge']);
      const detectedCredit = findField(['credit', 'deposit', 'payment']);
      const detectedCategory = findField(['category', 'type', 'group']);
      const detectedAccount = findField(['account', 'card', 'source']);

      // If we clearly found both Debit and Credit columns, it's a two-column statement.
      // Don't auto-map the Single Amount column to avoid confusion.
      if (detectedDebit && detectedCredit) {
        detectedAmount = '';
      }

      const mapping = {
        date: detectedDate || '',
        merchant: detectedMerchant || '',
        amount: detectedAmount || '',
        debit: detectedDebit || '',
        credit: detectedCredit || '',
        category: detectedCategory || '',
        account: detectedAccount || '',
      };

      if (isFastImport && detectedDate && detectedMerchant && (detectedAmount || detectedDebit || detectedCredit)) {
        executeImport(data, mapping);
      } else {
        setColumnMapping(mapping);
        setStep('map');
      }
    };

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          // Parse as 2D array to heuristically find the true header row
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
          
          if (rows.length === 0) {
            setError('Could not detect any data in the Excel file.');
            return;
          }

          let headerRowIdx = 0;
          let maxScore = -1;

          // Scan the first 30 rows to find the best header row (ignoring title/summary rows)
          for (let i = 0; i < Math.min(30, rows.length); i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            const rowStr = row.join(' ').toLowerCase();
            let score = 0;
            if (rowStr.includes('date') || rowStr.includes('time') || rowStr.includes('txn')) score += 2;
            if (rowStr.includes('amount') || rowStr.includes('debit') || rowStr.includes('credit')) score += 2;
            if (rowStr.includes('merchant') || rowStr.includes('description') || rowStr.includes('particulars') || rowStr.includes('narration') || rowStr.includes('details')) score += 2;
            if (rowStr.includes('balance')) score += 1;
            
            // Favor wider rows
            const nonEmptyCount = row.filter(c => String(c).trim() !== '').length;
            score += nonEmptyCount * 0.1;

            if (score > maxScore) {
              maxScore = score;
              headerRowIdx = i;
            }
          }

          // Fallback: if no obvious header keywords, pick the first row with at least 3 columns
          if (maxScore < 2) {
             for (let i = 0; i < Math.min(30, rows.length); i++) {
                if (rows[i].filter(c => String(c).trim() !== '').length >= 3) {
                   headerRowIdx = i;
                   break;
                }
             }
          }

          const headerRow = rows[headerRowIdx] || [];
          
          // Ensure unique field names
          const fields: string[] = [];
          const seen = new Set<string>();
          headerRow.forEach((h, idx) => {
             let val = String(h).trim();
             if (!val) val = `__EMPTY_${idx}`;
             let finalVal = val;
             let counter = 1;
             while (seen.has(finalVal)) {
               finalVal = `${val}_${counter}`;
               counter++;
             }
             seen.add(finalVal);
             fields.push(finalVal);
          });

          // Build objects from subsequent data rows
          const json: Record<string, any>[] = [];
          for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const rowArr = rows[i];
            // Skip completely empty rows
            if (!rowArr || rowArr.every(c => String(c).trim() === '')) continue;
            
            const obj: Record<string, any> = {};
            fields.forEach((field, idx) => {
              obj[field] = rowArr[idx] !== undefined ? rowArr[idx] : '';
            });
            json.push(obj);
          }

          if (json.length === 0) {
            setError('Could not detect any valid data rows after the header in the Excel file.');
            return;
          }
          
          handleData(fields, json);
        } catch (err: any) {
          setError(`Failed to parse Excel file: ${err.message}`);
        }
      };
      reader.onerror = () => {
        setError('Failed to read the Excel file.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          handleData(results.meta.fields || [], results.data);
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
        },
      });
    }
  };

  const executeImport = async (data: any[], mapping: any) => {
    if (!data || data.length === 0) return;
    setLoading(true);
    setError(null);

    const processData = async (dataArray: any[]) => {
      const parsedTxs: Partial<Transaction>[] = [];

      for (const row of dataArray as Record<string, any>[]) {
        // 1. Date
        const rawDate = row[mapping.date];
        if (!rawDate) continue;
        let dateStr = String(rawDate).trim();
        let dObj = new Date(dateStr);
        if (isNaN(dObj.getTime())) {
          // Try parsing DD/MM/YYYY or DD-MM-YYYY
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            let y = parts[2];
            if (y.length === 2) y = `20${y}`;
            const m = parts[1];
            const d = parts[0];
            dObj = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
          }
        }
        if (!isNaN(dObj.getTime())) {
          dateStr = dObj.toISOString().split('T')[0];
        } else {
          dateStr = new Date().toISOString().split('T')[0];
        }

        // 2. Merchant
        const merchantStr = String(row[mapping.merchant] || '').trim();
        if (!merchantStr) continue;

        // 3. Amount & Type
        let amountVal = 0;
        let txType: 'expense' | 'income' = 'expense';

        const parseAmountString = (val: any) => {
          if (!val) return 0;
          const cleaned = String(val).replace(/[$,]/g, '').trim();
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const debitVal = parseAmountString(row[mapping.debit]);
        const creditVal = parseAmountString(row[mapping.credit]);
        const singleVal = parseAmountString(row[mapping.amount]);

        if (mapping.debit && debitVal > 0) {
          amountVal = debitVal;
          txType = 'expense';
        } else if (mapping.credit && creditVal > 0) {
          amountVal = creditVal;
          txType = 'income';
        } else if (mapping.amount && singleVal !== 0) {
          if (singleVal < 0) {
            amountVal = Math.abs(singleVal);
            txType = 'income'; // Negative usually means refund/payment
          } else {
            amountVal = singleVal;
            txType = 'expense'; // Positive usually means charge/spending
          }
        }

        if (amountVal <= 0) continue;

        // 4. Category
        let cat = 'Needs review';
        if (mapping.category && row[mapping.category]) {
          const candidate = String(row[mapping.category]).trim();
          const matched = categories.find((c) => c.toLowerCase() === candidate.toLowerCase());
          if (matched) cat = matched;
        }

        // 5. Account
        let acc = accounts[0] || 'Imported account';
        if (mapping.account && row[mapping.account]) {
          acc = String(row[mapping.account]).trim();
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
    };

    try {
      await processData(data);
    } catch (err: any) {
      setError(err.message || 'Import failed');
      setLoading(false);
    }
  };

  const handleExecuteCsvImport = () => {
    executeImport(csvRows, columnMapping);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
              {/* Option 1: Normal Import */}
              <label
                htmlFor="csv-file-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-violet-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-violet-50/20 transition h-full"
              >
                <FileSpreadsheet className="w-10 h-10 text-violet-500 mb-3" />
                <span className="text-sm font-bold text-slate-800">
                  Import & Review Mapping
                </span>
                <span className="text-[11px] text-slate-500 mt-2">
                  Manually review and map your columns (Safest)
                </span>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsvFileSelect(e.target.files[0], false);
                    }
                  }}
                />
              </label>

              {/* Option 2: Fast Import */}
              <label
                htmlFor="csv-fast-input"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl cursor-pointer bg-emerald-50/30 hover:bg-emerald-100/30 transition h-full"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <ArrowRight className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-slate-800">
                  Fast Import (Skip Mapping)
                </span>
                <span className="text-[11px] text-slate-500 mt-2">
                  Auto-detects columns and skips mapping step if successful
                </span>
                <input
                  id="csv-fast-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsvFileSelect(e.target.files[0], true);
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
                  <h4 className="text-sm font-bold text-slate-900">Map Columns</h4>
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
