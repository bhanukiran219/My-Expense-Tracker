import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  ShieldCheck,
  Sparkles,
  Loader2,
  ArrowRight,
  Check,
} from 'lucide-react';
import { AppState, DocumentRecord, Transaction } from '../types';
import { formatFileSize, formatDateDisplay, formatCurrency } from '../utils/currency';
import { deleteDocument, extractDocumentTransaction, uploadDocuments } from '../api';

interface DocumentsViewProps {
  state: AppState;
  onOpenImport: () => void;
  onDocumentDeleted: (id: string) => void;
  onRefreshState?: () => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  state,
  onOpenImport,
  onDocumentDeleted,
  onRefreshState,
}) => {
  const documents = state.documents || [];
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);
  const [extractErrorMsg, setExtractErrorMsg] = useState<string | null>(null);
  const [quickUploadLoading, setQuickUploadLoading] = useState<boolean>(false);

  const handleDelete = async (doc: DocumentRecord) => {
    try {
      await deleteDocument(doc.id);
      onDocumentDeleted(doc.id);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleExtract = async (doc: DocumentRecord) => {
    setExtractingId(doc.id);
    setExtractSuccessMsg(null);
    setExtractErrorMsg(null);

    try {
      const res = await extractDocumentTransaction(doc.id);
      if (res.success && res.transactions && res.transactions.length > 0) {
        const tx = res.transactions[0];
        setExtractSuccessMsg(
          `✨ Extracted & Added: ${formatCurrency(tx.amount)} for "${tx.merchant}" on ${tx.date} (${tx.category})`
        );
        if (onRefreshState) {
          onRefreshState();
        }
      } else if (res.duplicates && res.duplicates > 0) {
        setExtractSuccessMsg(`Transaction already exists in your ledger (duplicate protection active).`);
      } else {
        setExtractErrorMsg(res.message || 'Could not detect financial data from this document.');
      }
    } catch (err: any) {
      setExtractErrorMsg(err.message || 'Extraction failed.');
    } finally {
      setExtractingId(null);
    }
  };

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = e.target.files;
    setQuickUploadLoading(true);
    setExtractSuccessMsg(null);
    setExtractErrorMsg(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('extractTransaction', 'true');

      const res = await uploadDocuments(formData);
      if (res.extractedTransactions && res.extractedTransactions.length > 0) {
        setExtractSuccessMsg(
          `✨ Uploaded & Auto-extracted ${res.extractedTransactions.length} transaction(s) directly into your ledger!`
        );
      } else {
        setExtractSuccessMsg(`✨ Uploaded ${res.documents.length} document(s) to your Vault.`);
      }

      if (onRefreshState) {
        onRefreshState();
      }
    } catch (err: any) {
      setExtractErrorMsg(err.message || 'Upload failed');
    } finally {
      setQuickUploadLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Success / Error Notification */}
      {extractSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">Extraction & Sync Complete</p>
              <p className="text-xs text-emerald-800">{extractSuccessMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setExtractSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {extractErrorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-950">Notice</p>
              <p className="text-xs text-rose-800">{extractErrorMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setExtractErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950 text-xs font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. PRIMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Card 1: Upload PhonePe / Statement / Receipt */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">AI Statement & Receipt Scanner</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                  Upload PhonePe, GPay, Paytm receipts, bills & PDFs
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Automatic OCR & OCR-to-Ledger parser extracts the merchant, date, amount, and category instantly into your transactions.
            </p>
          </div>

          <div className="pt-4 sm:pt-6 space-y-2">
            <label
              htmlFor="direct-vault-upload"
              className={`w-full flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition cursor-pointer ${
                quickUploadLoading ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {quickUploadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scanning & Adding Transactions...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Scan & Upload PhonePe / Receipt</span>
                </>
              )}
              <input
                id="direct-vault-upload"
                type="file"
                multiple
                accept="image/*,application/pdf,.csv,.xlsx,.xls"
                className="hidden"
                onChange={handleDirectFileUpload}
                disabled={quickUploadLoading}
              />
            </label>

            <button
              onClick={onOpenImport}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <span>Or Open Full CSV / Excel Batch Importer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: Document Security & Audit info */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Financial Document Vault</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">Secure Storage & Automatic Ledger Sync</p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Encrypted
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100 my-2">
              <div>
                <span className="text-slate-400 block font-medium">Total Files:</span>
                <span className="font-semibold text-slate-800">
                  {documents.length} document(s)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Auto-Extract:</span>
                <span className="font-semibold text-emerald-700">
                  Enabled (PhonePe/UPI/PDF)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 sm:pt-4">
            <p className="text-[11px] sm:text-xs text-slate-500">
              Click &quot;Scan &amp; Add to Ledger&quot; on any stored document below to extract its transaction anytime.
            </p>
          </div>
        </div>
      </div>

      {/* 2. DOCUMENT VAULT LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Document Vault</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Saved receipts, invoices, statements and screenshots</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{documents.length} file(s)</span>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 sm:py-16 text-center px-4 sm:px-6 space-y-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600">No documents yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload a PhonePe payment screenshot, receipt, invoice, or PDF statement above to auto-extract transactions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3 sm:py-3.5 px-3 sm:px-6">Filename</th>
                  <th className="py-3 sm:py-3.5 px-2.5 sm:px-4">Source</th>
                  <th className="py-3 sm:py-3.5 px-2.5 sm:px-4">Size</th>
                  <th className="py-3 sm:py-3.5 px-2.5 sm:px-4">Imported Date</th>
                  <th className="py-3 sm:py-3.5 px-2.5 sm:px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {documents.map((doc) => {
                  const isExtracting = extractingId === doc.id;
                  const isImageOrPdf =
                    doc.mimeType.includes('image') ||
                    doc.mimeType.includes('pdf') ||
                    /\.(jpe?g|png|webp|pdf|csv|xlsx|xls)$/i.test(doc.filename);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition group">
                      <td className="py-3 sm:py-3.5 px-3 sm:px-6">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                          <span className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs block text-xs">
                            {doc.filename}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 sm:py-3.5 px-2.5 sm:px-4 capitalize text-slate-600 text-xs whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Upload className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {doc.source}
                        </span>
                      </td>

                      <td className="py-3 sm:py-3.5 px-2.5 sm:px-4 text-slate-500 text-xs whitespace-nowrap">{formatFileSize(doc.size)}</td>

                      <td className="py-3 sm:py-3.5 px-2.5 sm:px-4 text-slate-500 text-xs whitespace-nowrap">
                        {formatDateDisplay(doc.createdAt.split('T')[0])}
                      </td>

                      <td className="py-3 sm:py-3.5 px-2.5 sm:px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          {/* Scan & Extract Transaction Action Button */}
                          {isImageOrPdf && (
                            <button
                              onClick={() => handleExtract(doc)}
                              disabled={isExtracting}
                              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] sm:text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-2xs border border-violet-200 shrink-0"
                              title="Scan with OCR and add transaction to ledger"
                            >
                              {isExtracting ? (
                                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600" />
                              )}
                              <span className="hidden xs:inline sm:inline">{isExtracting ? 'Scanning...' : 'Scan & Add'}</span>
                            </button>
                          )}

                          <a
                            href={`/api/documents/${doc.id}/download`}
                            download={doc.filename}
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition shrink-0"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition opacity-100 sm:opacity-0 group-hover:opacity-100 shrink-0"
                            title="Delete from vault"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
