import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DBTransaction {
  id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  tags: string; // JSON array
  receipt: number;
  source: string;
  fingerprint: string;
  createdAt: string;
}

export interface DBTag {
  name: string;
  createdAt: string;
}

export interface DBRule {
  id: string;
  whenText: string;
  thenText: string;
  enabled: number;
  createdAt: string;
}

export interface DBDocument {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  objectKey: string;
  status: 'queued' | 'stored' | 'review';
  source: 'upload' | 'google-drive';
  createdAt: string;
}

export interface DBSetting {
  key: string;
  value: string;
  updatedAt: string;
}

interface DBSchema {
  transactions: DBTransaction[];
  tags: DBTag[];
  rules: DBRule[];
  documents: DBDocument[];
  settings: Record<string, { value: string; updatedAt: string }>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'ledgerly_d1.json');
const STORAGE_DIR = path.join(DATA_DIR, 'storage');

const STARTER_CATEGORIES = [
  'Housing',
  'Groceries',
  'Shopping',
  'Dining',
  'Transportation',
  'Utilities',
  'Subscriptions',
  'Insurance',
  'Health',
  'Entertainment',
  'Income',
  'Needs review',
  'Other',
];

const STARTER_ACCOUNTS = [
  'Main Checking',
  'Everyday Visa',
  'Rewards Card',
  'Cash',
];

export class D1Database {
  private schema: DBSchema;

  constructor() {
    this.ensureDirectories();
    this.schema = this.loadDatabase();
    this.initDefaultSettings();
  }

  private ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DBSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          rules: Array.isArray(parsed.rules) ? parsed.rules : [],
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {},
        };
      } catch (err) {
        console.error('Error loading DB file, reinitializing', err);
      }
    }
    return {
      transactions: [],
      tags: [],
      rules: [],
      documents: [],
      settings: {},
    };
  }

  private saveDatabase() {
    const tmp = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(this.schema, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  }

  private initDefaultSettings() {
    const now = new Date().toISOString();
    const defaults: Record<string, any> = {
      categories: STARTER_CATEGORIES,
      accounts: STARTER_ACCOUNTS,
      goals: [],
      budgets: [],
      subscriptions: [],
      recurring: [],
      dismissedPatterns: [],
      assetsTotal: 0,
      liabilitiesTotal: 0,
      netWorthConfigured: false,
      selectedPeriod: 'all-time',
      driveProvider: 'google-drive',
      driveFolderName: 'Google Drive Financial Inbox',
      driveFolderId: '1tdh8R2wIgyZayESKTiKrnvoLHTvg40mL',
      driveFolderUrl: 'https://drive.google.com/drive/folders/1tdh8R2wIgyZayESKTiKrnvoLHTvg40mL',
      driveScheduleTime: '08:00',
      driveScheduleTimezone: 'America/Los_Angeles',
      driveScheduleCadence: 'daily',
      driveLastSync: null,
      driveLastStatus: null,
      driveLastStats: null,
      processedFileIds: [],
      driveResetAt: null,
      freshStart: true,
    };

    let modified = false;
    for (const [k, v] of Object.entries(defaults)) {
      if (!this.schema.settings[k]) {
        this.schema.settings[k] = {
          value: JSON.stringify(v),
          updatedAt: now,
        };
        modified = true;
      }
    }
    if (modified) {
      this.saveDatabase();
    }
  }

  // --- Transactions ---
  public buildFingerprint(date: string, merchant: string, amount: number, account: string): string {
    const d = (date || '').trim();
    const m = (merchant || '').trim().toLowerCase();
    const a = Number(amount).toFixed(2);
    const acc = (account || 'Imported account').trim().toLowerCase();
    return `${d}|${m}|${a}|${acc}`;
  }

  public getTransactions(limit = 5000): DBTransaction[] {
    return [...this.schema.transactions]
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);
  }

  public insertTransaction(tx: Omit<DBTransaction, 'id' | 'createdAt' | 'fingerprint'> & { id?: string; createdAt?: string }): { success: boolean; transaction?: DBTransaction; isDuplicate?: boolean } {
    const fingerprint = this.buildFingerprint(tx.date, tx.merchant, tx.amount, tx.account);
    const existing = this.schema.transactions.find((t) => t.fingerprint === fingerprint);
    if (existing) {
      return { success: false, isDuplicate: true, transaction: existing };
    }

    const id = tx.id || crypto.randomUUID();
    const createdAt = tx.createdAt || new Date().toISOString();

    // Apply rules after duplicate check
    let category = tx.category || 'Needs review';
    let tagsList: string[] = [];
    try {
      tagsList = JSON.parse(tx.tags || '[]');
    } catch {
      tagsList = [];
    }

    const activeRules = this.schema.rules.filter((r) => r.enabled === 1);
    for (const rule of activeRules) {
      if (rule.whenText && tx.merchant.toLowerCase().includes(rule.whenText.toLowerCase())) {
        if (rule.thenText) {
          // If thenText is a category name
          category = rule.thenText;
        }
      }
    }

    const newTx: DBTransaction = {
      id,
      date: tx.date,
      merchant: tx.merchant.trim(),
      category: category.trim(),
      amount: Math.abs(Number(tx.amount)),
      type: tx.type === 'income' ? 'income' : 'expense',
      account: (tx.account || 'Imported account').trim(),
      tags: JSON.stringify(Array.from(new Set(tagsList.map((t) => t.trim()).filter(Boolean)))),
      receipt: tx.receipt ? 1 : 0,
      source: tx.source || 'manual',
      fingerprint,
      createdAt,
    };

    this.schema.transactions.push(newTx);
    this.saveDatabase();
    return { success: true, transaction: newTx };
  }

  public updateTransaction(id: string, updates: { date?: string; merchant?: string; category?: string; amount?: number; type?: 'income' | 'expense'; account?: string; tags?: string[] }): DBTransaction | null {
    const index = this.schema.transactions.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const tx = this.schema.transactions[index];
    
    let fingerprintChanged = false;

    if (updates.date !== undefined) {
      tx.date = updates.date;
      fingerprintChanged = true;
    }
    if (updates.merchant !== undefined) {
      tx.merchant = updates.merchant.trim();
      fingerprintChanged = true;
    }
    if (updates.category !== undefined) {
      tx.category = updates.category.trim();
    }
    if (updates.amount !== undefined) {
      tx.amount = Math.abs(Number(updates.amount));
      fingerprintChanged = true;
    }
    if (updates.type !== undefined) {
      tx.type = updates.type;
    }
    if (updates.account !== undefined) {
      tx.account = updates.account.trim();
      fingerprintChanged = true;
    }
    if (updates.tags !== undefined) {
      const normalized = Array.from(new Set(updates.tags.map((t) => t.trim()).filter(Boolean)));
      tx.tags = JSON.stringify(normalized);
      // Ensure all tags exist in tags table
      for (const tagName of normalized) {
        this.insertTag(tagName);
      }
    }
    
    if (fingerprintChanged) {
      tx.fingerprint = this.buildFingerprint(tx.date, tx.merchant, tx.amount, tx.account);
    }

    this.saveDatabase();
    return tx;
  }

  public deleteTransaction(id: string): boolean {
    const initLen = this.schema.transactions.length;
    this.schema.transactions = this.schema.transactions.filter((t) => t.id !== id);
    if (this.schema.transactions.length !== initLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Tags ---
  public getTags(): DBTag[] {
    return [...this.schema.tags];
  }

  public insertTag(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const exists = this.schema.tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) return false;
    this.schema.tags.push({
      name: trimmed,
      createdAt: new Date().toISOString(),
    });
    this.saveDatabase();
    return true;
  }

  public deleteTag(name: string): boolean {
    const trimmed = name.trim();
    const initLen = this.schema.tags.length;
    this.schema.tags = this.schema.tags.filter((t) => t.name.toLowerCase() !== trimmed.toLowerCase());
    if (this.schema.tags.length !== initLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Rules ---
  public getRules(): DBRule[] {
    return [...this.schema.rules];
  }

  public insertRule(whenText: string, thenText: string, enabled = 1): DBRule {
    const rule: DBRule = {
      id: crypto.randomUUID(),
      whenText: whenText.trim(),
      thenText: thenText.trim(),
      enabled: enabled ? 1 : 0,
      createdAt: new Date().toISOString(),
    };
    this.schema.rules.push(rule);
    this.saveDatabase();
    return rule;
  }

  public updateRule(id: string, updates: Partial<Pick<DBRule, 'whenText' | 'thenText' | 'enabled'>>): DBRule | null {
    const rule = this.schema.rules.find((r) => r.id === id);
    if (!rule) return null;
    if (updates.whenText !== undefined) rule.whenText = updates.whenText.trim();
    if (updates.thenText !== undefined) rule.thenText = updates.thenText.trim();
    if (updates.enabled !== undefined) rule.enabled = updates.enabled ? 1 : 0;
    this.saveDatabase();
    return rule;
  }

  public deleteRule(id: string): boolean {
    const initLen = this.schema.rules.length;
    this.schema.rules = this.schema.rules.filter((r) => r.id !== id);
    if (this.schema.rules.length !== initLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Documents (D1 + R2) ---
  public getDocuments(limit = 100): DBDocument[] {
    return [...this.schema.documents]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public insertDocument(doc: {
    filename: string;
    mimeType: string;
    size: number;
    objectKey: string;
    status: 'queued' | 'stored' | 'review';
    source: 'upload' | 'google-drive';
  }): DBDocument {
    const record: DBDocument = {
      id: crypto.randomUUID(),
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      objectKey: doc.objectKey,
      status: doc.status,
      source: doc.source,
      createdAt: new Date().toISOString(),
    };
    this.schema.documents.push(record);
    this.saveDatabase();
    return record;
  }

  public getDocumentById(id: string): DBDocument | null {
    return this.schema.documents.find((d) => d.id === id) || null;
  }

  public deleteDocument(id: string): boolean {
    const doc = this.getDocumentById(id);
    if (!doc) return false;
    this.schema.documents = this.schema.documents.filter((d) => d.id !== id);
    this.saveDatabase();
    // Also delete from R2 storage
    this.deleteR2Object(doc.objectKey);
    return true;
  }

  // --- R2 Storage operations ---
  public saveR2Object(objectKey: string, buffer: Buffer): string {
    const fullPath = path.join(STORAGE_DIR, objectKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return objectKey;
  }

  public getR2Object(objectKey: string): { buffer: Buffer; exists: boolean } {
    const fullPath = path.join(STORAGE_DIR, objectKey);
    if (fs.existsSync(fullPath)) {
      return { buffer: fs.readFileSync(fullPath), exists: true };
    }
    return { buffer: Buffer.from([]), exists: false };
  }

  public deleteR2Object(objectKey: string): boolean {
    try {
      const fullPath = path.join(STORAGE_DIR, objectKey);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
    } catch (e) {
      console.error('Error deleting R2 object:', e);
    }
    return false;
  }

  public clearR2Storage() {
    try {
      if (fs.existsSync(STORAGE_DIR)) {
        fs.rmSync(STORAGE_DIR, { recursive: true, force: true });
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('Error clearing R2 storage:', e);
    }
  }

  // --- Settings ---
  public getSettings(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(this.schema.settings)) {
      try {
        result[k] = JSON.parse(v.value);
      } catch {
        result[k] = v.value;
      }
    }

    // Sanitize any broken mock folder URLs that return 404
    if (!result.driveProvider) {
      result.driveProvider = 'onedrive';
    }
    if (
      !result.driveFolderUrl ||
      result.driveFolderUrl.includes('ledgerly_inbox_folder') ||
      result.driveFolderUrl === 'https://drive.google.com/drive/folders/ledgerly_inbox_folder'
    ) {
      result.driveFolderUrl = result.driveProvider === 'onedrive' 
        ? 'https://onedrive.live.com' 
        : 'https://drive.google.com';
    }

    return result;
  }

  public setSetting(key: string, value: any) {
    this.schema.settings[key] = {
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString(),
    };
    this.saveDatabase();
  }

  public updatePreferences(preferences: Record<string, any>) {
    const now = new Date().toISOString();
    for (const [k, v] of Object.entries(preferences)) {
      if (v !== undefined) {
        this.schema.settings[k] = {
          value: JSON.stringify(v),
          updatedAt: now,
        };
      }
    }
    this.saveDatabase();
  }

  // --- Complete State Wipe ---
  public wipeAllData(): boolean {
    const now = new Date().toISOString();
    this.schema.transactions = [];
    this.schema.documents = [];
    this.schema.rules = [];
    this.schema.tags = [];

    // Clear R2 bucket files
    this.clearR2Storage();

    // Reset settings to fresh clean start
    this.schema.settings = {
      categories: { value: JSON.stringify(STARTER_CATEGORIES), updatedAt: now },
      accounts: { value: JSON.stringify(STARTER_ACCOUNTS), updatedAt: now },
      goals: { value: JSON.stringify([]), updatedAt: now },
      budgets: { value: JSON.stringify([]), updatedAt: now },
      subscriptions: { value: JSON.stringify([]), updatedAt: now },
      recurring: { value: JSON.stringify([]), updatedAt: now },
      dismissedPatterns: { value: JSON.stringify([]), updatedAt: now },
      assetsTotal: { value: JSON.stringify(0), updatedAt: now },
      liabilitiesTotal: { value: JSON.stringify(0), updatedAt: now },
      netWorthConfigured: { value: JSON.stringify(false), updatedAt: now },
      selectedPeriod: { value: JSON.stringify('all-time'), updatedAt: now },
      driveProvider: { value: JSON.stringify('google-drive'), updatedAt: now },
      driveFolderName: { value: JSON.stringify('Google Drive Financial Inbox'), updatedAt: now },
      driveFolderId: { value: JSON.stringify('1tdh8R2wIgyZayESKTiKrnvoLHTvg40mL'), updatedAt: now },
      driveFolderUrl: { value: JSON.stringify('https://drive.google.com/drive/folders/1tdh8R2wIgyZayESKTiKrnvoLHTvg40mL'), updatedAt: now },
      driveScheduleTime: { value: JSON.stringify('08:00'), updatedAt: now },
      driveScheduleTimezone: { value: JSON.stringify('America/Los_Angeles'), updatedAt: now },
      driveScheduleCadence: { value: JSON.stringify('daily'), updatedAt: now },
      driveLastSync: { value: JSON.stringify(null), updatedAt: now },
      driveLastStatus: { value: JSON.stringify(null), updatedAt: now },
      driveLastStats: { value: JSON.stringify(null), updatedAt: now },
      processedFileIds: { value: JSON.stringify([]), updatedAt: now },
      driveResetAt: { value: JSON.stringify(now), updatedAt: now },
      freshStart: { value: JSON.stringify(true), updatedAt: now },
    };

    this.saveDatabase();
    return true;
  }
}

export const db = new D1Database();
