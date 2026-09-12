import { createWorker } from 'tesseract.js';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { db } from './db.js';

let tesseractWorkerPromise: Promise<any> | null = null;

async function getOCRWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return tesseractWorkerPromise;
}

export interface ExtractedTx {
  date: string;
  merchant: string;
  amount: number;
  type: 'expense' | 'income';
  category: string;
  account: string;
  tags: string[];
  receipt: number;
  source: string;
}

export function parseTransactionFromText(text: string, filename = '', userAccounts: string[] = []): ExtractedTx | null {
  const fullText = text.replace(/\r/g, '');
  if (!fullText.trim()) return null;

  // 1. Detect platform / source
  const isPhonePe = /phonepe|transaction successful|debited from/i.test(fullText);
  const isGPay = /google pay|gpay|upi transaction id/i.test(fullText);
  const isPaytm = /paytm/i.test(fullText);

  // 2. Extract Date
  let date = new Date().toISOString().split('T')[0];
  const months: Record<string, string> = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const longDateMatch = fullText.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
  if (longDateMatch) {
    const day = longDateMatch[1].padStart(2, '0');
    const month = months[longDateMatch[2].toLowerCase()];
    const year = longDateMatch[3];
    if (month) date = `${year}-${month}-${day}`;
  } else {
    const numDateMatch = fullText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (numDateMatch) {
      let y = numDateMatch[3];
      if (y.length === 2) y = `20${y}`;
      const m = numDateMatch[2].padStart(2, '0');
      const d = numDateMatch[1].padStart(2, '0');
      date = `${y}-${m}-${d}`;
    } else {
      const isoMatch = fullText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (isoMatch) {
        date = isoMatch[1];
      }
    }
  }

  // 3. Extract Amount
  let amount = 0;
  // Specific PhonePe / UPI patterns:
  const paidToAmountMatch = fullText.match(/Paid to[\s\S]*?(?:[₹¥$€£]|Rs\.?|INR|\b)\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
  if (paidToAmountMatch && parseFloat(paidToAmountMatch[1].replace(/,/g, '')) > 0) {
    amount = parseFloat(paidToAmountMatch[1].replace(/,/g, ''));
  } else {
    // Look for total / amount / debited patterns
    const totalMatch = fullText.match(/(?:total|amount|debited|grand total|net amount|paid)[:\s]*[₹¥$€£RsINR.]*\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
    if (totalMatch && parseFloat(totalMatch[1].replace(/,/g, '')) > 0) {
      amount = parseFloat(totalMatch[1].replace(/,/g, ''));
    } else {
      const anyNumMatch = fullText.match(/[₹¥$€£]\s*(\d+(?:,\d+)*(?:\.\d{1,2})?)/i);
      if (anyNumMatch) {
        amount = parseFloat(anyNumMatch[1].replace(/,/g, ''));
      }
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    // If no explicit amount found, fallback
    amount = 0;
  }

  // 4. Extract Merchant / Payee
  let merchant = '';
  const paidToMatch = fullText.match(/Paid to\s*\n+([^\n@]+)/i);
  if (paidToMatch) {
    let candidate = paidToMatch[1].replace(/^[al*~>\s]+/, '').trim();
    // remove trailing amount or currency symbols
    candidate = candidate.replace(/[₹¥$€£\d.,]+$/, '').trim();
    if (candidate) merchant = candidate;
  }

  // Check if message/note provides helpful name
  const messageMatch = fullText.match(/Message\s*\n+([^\n]+)/i);
  if (messageMatch) {
    const note = messageMatch[1].trim();
    if (note && !merchant) {
      merchant = note;
    } else if (note && merchant && !merchant.toLowerCase().includes(note.toLowerCase())) {
      merchant = `${merchant} (${note})`;
    }
  }

  if (!merchant) {
    const billToMatch = fullText.match(/(?:Billed to|Merchant|Vendor|Payee|To):\s*([^\n]+)/i);
    if (billToMatch) {
      merchant = billToMatch[1].trim();
    }
  }

  if (!merchant) {
    merchant = isPhonePe ? 'PhonePe Payment' : (filename ? filename.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Receipt Expense');
  }

  // 5. Type
  const isIncome = /received from|credited to|deposit|cashback received|refund/i.test(fullText);
  const type: 'income' | 'expense' = isIncome ? 'income' : 'expense';

  // 6. Category
  let category = 'Needs review';
  const combined = `${merchant} ${fullText}`.toLowerCase();
  if (/hospital|speech|hearing|clinic|doctor|pharmacy|medical|dental|medicine|health/i.test(combined)) {
    category = 'Health';
  } else if (/food|restaurant|cafe|swiggy|zomato|dining|momo|tea|tiffin|bakery|snacks|dinner|lunch|breakfast/i.test(combined)) {
    category = 'Dining';
  } else if (/groceries|supermarket|mart|vegetable|bazaar|blinkit|zepto|instamart|reliance/i.test(combined)) {
    category = 'Groceries';
  } else if (/uber|ola|rapido|petrol|fuel|diesel|transport|metro|bus|train|irctc/i.test(combined)) {
    category = 'Transportation';
  } else if (/rent|house|electricity|water|wifi|bill|recharge|jio|airtel/i.test(combined)) {
    category = 'Utilities';
  } else if (/netflix|movie|cinema|entertainment|bookmyshow|spotify|prime/i.test(combined)) {
    category = 'Entertainment';
  } else if (/amazon|flipkart|myntra|clothes|shopping/i.test(combined)) {
    category = 'Shopping';
  }

  // 7. Account Detection
  let account = userAccounts[0] || 'ICICI Savings';
  if (/icici/i.test(fullText) || /icici/i.test(account)) {
    account = userAccounts.find(a => /icici/i.test(a)) || 'ICICI Savings';
  } else if (/hdfc/i.test(fullText)) {
    account = userAccounts.find(a => /hdfc/i.test(a)) || 'HDFC Bank';
  } else if (/sbi/i.test(fullText)) {
    account = userAccounts.find(a => /sbi/i.test(a)) || 'SBI Account';
  }

  // 8. Tags
  const tags = ['Receipt-backed'];
  if (isPhonePe) tags.push('PhonePe');
  if (isGPay) tags.push('GPay');
  if (isPaytm) tags.push('Paytm');

  return {
    date,
    merchant,
    amount,
    type,
    category,
    account,
    tags,
    receipt: 1,
    source: 'document',
  };
}

export async function extractTransactionsFromDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  userAccounts: string[] = []
): Promise<ExtractedTx[]> {
  const isImage = mimeType.includes('image') || /\.(jpe?g|png|webp|bmp)$/i.test(filename);
  const isPdf = mimeType.includes('pdf') || /\.pdf$/i.test(filename);
  const isSpreadsheet = mimeType.includes('spreadsheet') || mimeType.includes('excel') || /\.(xlsx|xls)$/i.test(filename);
  const isCsv = mimeType.includes('csv') || /\.csv$/i.test(filename);

  if (isImage) {
    try {
      const worker = await getOCRWorker();
      const ret = await worker.recognize(buffer);
      const parsed = parseTransactionFromText(ret.data.text, filename, userAccounts);
      if (parsed && parsed.amount > 0) {
        return [parsed];
      }
    } catch (e: any) {
      console.error('OCR Extraction error:', e);
    }
  } else if (isPdf) {
    try {
      // Dynamic import pdf-parse
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const data = await pdfParse(buffer);
      const parsed = parseTransactionFromText(data.text, filename, userAccounts);
      if (parsed && parsed.amount > 0) {
        return [parsed];
      }
    } catch (e: any) {
      console.error('PDF Parse error:', e);
    }
  } else if (isSpreadsheet) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }) as Record<string, any>[];
      // Convert rows to transactions using column matching
      const txs: ExtractedTx[] = [];
      for (const row of rows) {
        const keys = Object.keys(row);
        const findField = (terms: string[]) => keys.find(k => terms.some(t => k.toLowerCase().includes(t))) || '';
        const dKey = findField(['date', 'time']);
        const mKey = findField(['merchant', 'description', 'payee', 'name', 'particulars', 'narration']);
        const aKey = findField(['amount', 'total', 'debit', 'withdrawal']);
        if (dKey && mKey && aKey && row[aKey]) {
          const num = parseFloat(String(row[aKey]).replace(/[^0-9.]/g, ''));
          if (num > 0) {
            txs.push({
              date: String(row[dKey]).split('T')[0] || new Date().toISOString().split('T')[0],
              merchant: String(row[mKey]).trim() || 'Imported Transaction',
              amount: num,
              type: 'expense',
              category: 'Needs review',
              account: userAccounts[0] || 'ICICI Savings',
              tags: ['File Import'],
              receipt: 1,
              source: 'document',
            });
          }
        }
      }
      return txs;
    } catch (e: any) {
      console.error('Spreadsheet extraction error:', e);
    }
  } else if (isCsv) {
    try {
      const str = buffer.toString('utf-8');
      const parsed = Papa.parse(str, { header: true, skipEmptyLines: true });
      const txs: ExtractedTx[] = [];
      for (const row of parsed.data as any[]) {
        const keys = Object.keys(row);
        const findField = (terms: string[]) => keys.find(k => terms.some(t => k.toLowerCase().includes(t))) || '';
        const dKey = findField(['date', 'time']);
        const mKey = findField(['merchant', 'description', 'payee', 'name', 'particulars']);
        const aKey = findField(['amount', 'total', 'debit', 'withdrawal']);
        if (dKey && mKey && aKey && row[aKey]) {
          const num = parseFloat(String(row[aKey]).replace(/[^0-9.]/g, ''));
          if (num > 0) {
            txs.push({
              date: String(row[dKey]).split('T')[0] || new Date().toISOString().split('T')[0],
              merchant: String(row[mKey]).trim() || 'Imported Transaction',
              amount: num,
              type: 'expense',
              category: 'Needs review',
              account: userAccounts[0] || 'ICICI Savings',
              tags: ['CSV Import'],
              receipt: 1,
              source: 'document',
            });
          }
        }
      }
      return txs;
    } catch (e: any) {
      console.error('CSV parse error:', e);
    }
  }

  return [];
}
