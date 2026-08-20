import React from 'react';
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
} from 'lucide-react';
import { AppState, DocumentRecord } from '../types';
import { formatFileSize, formatDateDisplay } from '../utils/currency';
import { deleteDocument } from '../api';

interface DocumentsViewProps {
  state: AppState;
  onOpenImport: () => void;
  onDocumentDeleted: (id: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  state,
  onOpenImport,
  onDocumentDeleted,
}) => {
  const documents = state.documents || [];

  const handleDelete = async (doc: DocumentRecord) => {
    try {
      await deleteDocument(doc.id);
      onDocumentDeleted(doc.id);
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. PRIMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Upload documents */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Upload Statements & Receipts</h3>
                <p className="text-xs text-slate-500">
                  Store original receipts, invoices, statements & CSVs (Max 20MB)
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              Import CSV bank statements or upload receipts and invoices. Files are safely stored and indexed for transaction linking.
            </p>
          </div>

          <div className="pt-6">
            <button
              onClick={onOpenImport}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-violet-200 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV Statement or Documents</span>
            </button>
          </div>
        </div>

        {/* Card 2: Document Security & Audit info */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Financial Document Vault</h3>
                  <p className="text-xs text-slate-500">Secure Storage & Audit Readiness</p>
                </div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Encrypted
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100 my-2">
              <div>
                <span className="text-slate-400 block font-medium">Total Files:</span>
                <span className="font-semibold text-slate-800">
                  {documents.length} document(s)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Vault Status:</span>
                <span className="font-semibold text-emerald-700">
                  Active & Synced
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <p className="text-xs text-slate-500">
              Drag-and-drop CSV files to auto-extract transactions with duplicate protection.
            </p>
          </div>
        </div>
      </div>


      {/* 2. DOCUMENT VAULT LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Document Vault</h3>
            <p className="text-xs text-slate-500">Encrypted Cloudflare R2 bucket file ledger</p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{documents.length} file(s)</span>
        </div>

        {documents.length === 0 ? (
          <div className="py-16 text-center px-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600">No documents yet.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload a file or add one to your Drive inbox to store financial statements, receipts,
              and invoices.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-3.5 px-6">Filename</th>
                  <th className="py-3.5 px-4">Source</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Imported Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="font-bold text-slate-900 truncate max-w-xs block">
                          {doc.filename}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 capitalize text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        {doc.source}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">{formatFileSize(doc.size)}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          doc.status === 'stored'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.status === 'review'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateDisplay(doc.createdAt.split('T')[0])}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          download={doc.filename}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-violet-600 hover:bg-violet-50 flex items-center justify-center transition"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                          title="Delete from vault"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
