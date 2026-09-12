import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export interface DBTransaction {
  id: string;
  user_id: string;
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
  created_at: string;
}

export interface DBTag {
  name: string;
  user_id: string;
  created_at: string;
}

export interface DBRule {
  id: string;
  user_id: string;
  when_text: string;
  then_text: string;
  enabled: number;
  created_at: string;
}

export interface DBDocument {
  id: string;
  user_id: string;
  filename: string;
  mime_type: string;
  size: number;
  object_key: string;
  status: 'queued' | 'stored' | 'review';
  source: 'upload' | 'google-drive';
  created_at: string;
}

export interface DBSetting {
  key: string;
  user_id: string;
  value: string;
  updated_at: string;
}

export interface DBUser {
  id: string;
  username: string;
  email?: string;
  picture?: string;
  google_id?: string;
  password_hash?: string;
  salt?: string;
  created_at: string;
}

export interface DBSession {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: number;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const compBuf = Buffer.from(computedHash, 'hex');
    if (hashBuf.length !== compBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, compBuf);
  } catch {
    return false;
  }
}

interface LocalDBState {
  transactions: DBTransaction[];
  tags: DBTag[];
  rules: DBRule[];
  documents: DBDocument[];
  settings: Record<string, Record<string, any>>; // userId -> settings object
  users?: DBUser[];
  sessions?: DBSession[];
}

export class LocalDatabase {
  private state: LocalDBState = {
    transactions: [],
    tags: [],
    rules: [],
    documents: [],
    settings: {},
    users: [],
    sessions: []
  };

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(data);
        if (!this.state.users) this.state.users = [];
        if (!this.state.sessions) this.state.sessions = [];
      } else {
        this.saveState();
      }
    } catch (err) {
      console.error('Error loading local DB state:', err);
    }
  }

  private saveState() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving local DB state:', err);
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

  public async getTransactions(userId: string, limit = 5000): Promise<any[]> {
    const userTxs = this.state.transactions.filter(t => t.user_id === userId);
    const sorted = [...userTxs].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA === dateB) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return dateB - dateA;
    });
    
    return sorted.slice(0, limit).map(row => ({
      ...row,
      createdAt: row.created_at
    }));
  }

  public async insertTransaction(userId: string, tx: any): Promise<{ success: boolean; transaction?: any; isDuplicate?: boolean }> {
    const isManual = tx.source === 'manual' || !tx.source;
    const baseFingerprint = this.buildFingerprint(tx.date, tx.merchant, tx.amount, tx.account);
    const fingerprint = isManual ? `${baseFingerprint}|${tx.id || crypto.randomUUID()}` : baseFingerprint;
    
    if (!isManual) {
      const existing = this.state.transactions.find(t => t.user_id === userId && t.fingerprint === baseFingerprint);
      if (existing) {
        return { success: false, isDuplicate: true, transaction: { ...existing, createdAt: existing.created_at } };
      }
    }

    const id = tx.id || crypto.randomUUID();
    let category = tx.category || 'Needs review';
    let tagsList: string[] = [];
    try {
      tagsList = JSON.parse(tx.tags || '[]');
    } catch {
      tagsList = [];
    }

    const activeRules = this.state.rules.filter(r => r.user_id === userId && r.enabled === 1);
    for (const rule of activeRules) {
      if (rule.when_text && tx.merchant.toLowerCase().includes(rule.when_text.toLowerCase())) {
        if (rule.then_text) {
          category = rule.then_text;
        }
      }
    }

    const newTx: DBTransaction = {
      id,
      user_id: userId,
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
      created_at: new Date().toISOString()
    };

    this.state.transactions.push(newTx);
    this.saveState();

    return { success: true, transaction: { ...newTx, createdAt: newTx.created_at } };
  }

  public async updateTransaction(userId: string, id: string, updates: any): Promise<any | null> {
    const index = this.state.transactions.findIndex(t => t.id === id && t.user_id === userId);
    if (index === -1) return null;

    const existing = this.state.transactions[index];
    const payload = { ...existing };
    let fingerprintChanged = false;

    if (updates.date !== undefined) {
      payload.date = updates.date;
      fingerprintChanged = true;
    }
    if (updates.merchant !== undefined) {
      payload.merchant = updates.merchant.trim();
      fingerprintChanged = true;
    }
    if (updates.category !== undefined) {
      payload.category = updates.category.trim();
    }
    if (updates.amount !== undefined) {
      payload.amount = Math.abs(Number(updates.amount));
      fingerprintChanged = true;
    }
    if (updates.type !== undefined) {
      payload.type = updates.type;
    }
    if (updates.account !== undefined) {
      payload.account = updates.account.trim();
      fingerprintChanged = true;
    }
    if (updates.tags !== undefined) {
      const normalized = Array.from(new Set(updates.tags.map((t: string) => t.trim()).filter(Boolean)));
      payload.tags = JSON.stringify(normalized);
      for (const tagName of normalized) {
        await this.insertTag(userId, tagName as string);
      }
    }

    if (fingerprintChanged) {
      payload.fingerprint = this.buildFingerprint(payload.date, payload.merchant, payload.amount, payload.account);
    }

    this.state.transactions[index] = payload;
    this.saveState();

    return { ...payload, createdAt: payload.created_at };
  }

  public async deleteTransaction(userId: string, id: string): Promise<boolean> {
    const initialLen = this.state.transactions.length;
    this.state.transactions = this.state.transactions.filter(t => !(t.id === id && t.user_id === userId));
    if (this.state.transactions.length !== initialLen) {
      this.saveState();
      return true;
    }
    return false;
  }

  // --- Tags ---
  public async getTags(userId: string): Promise<any[]> {
    return this.state.tags.filter(t => t.user_id === userId).map(row => ({ ...row, createdAt: row.created_at }));
  }

  public async insertTag(userId: string, name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (!this.state.tags.some(t => t.name.toLowerCase() === trimmed.toLowerCase() && t.user_id === userId)) {
      this.state.tags.push({ name: trimmed, user_id: userId, created_at: new Date().toISOString() });
      this.saveState();
    }
    return true;
  }

  public async deleteTag(userId: string, name: string): Promise<boolean> {
    const trimmed = name.trim().toLowerCase();
    const initialLen = this.state.tags.length;
    this.state.tags = this.state.tags.filter(t => !(t.name.toLowerCase() === trimmed && t.user_id === userId));
    if (this.state.tags.length !== initialLen) {
      this.saveState();
      return true;
    }
    return false;
  }

  // --- Rules ---
  public async getRules(userId: string): Promise<any[]> {
    return this.state.rules.filter(r => r.user_id === userId).map(row => ({
      id: row.id,
      whenText: row.when_text,
      thenText: row.then_text,
      enabled: row.enabled,
      createdAt: row.created_at
    }));
  }

  public async insertRule(userId: string, whenText: string, thenText: string, enabled = 1): Promise<any> {
    const newRule: DBRule = {
      id: crypto.randomUUID(),
      user_id: userId,
      when_text: whenText.trim(),
      then_text: thenText.trim(),
      enabled: enabled ? 1 : 0,
      created_at: new Date().toISOString()
    };
    this.state.rules.push(newRule);
    this.saveState();
    return {
      id: newRule.id,
      whenText: newRule.when_text,
      thenText: newRule.then_text,
      enabled: newRule.enabled,
      createdAt: newRule.created_at
    };
  }

  public async updateRule(userId: string, id: string, updates: any): Promise<any> {
    const index = this.state.rules.findIndex(r => r.id === id && r.user_id === userId);
    if (index === -1) return null;

    if (updates.whenText !== undefined) this.state.rules[index].when_text = updates.whenText.trim();
    if (updates.thenText !== undefined) this.state.rules[index].then_text = updates.thenText.trim();
    if (updates.enabled !== undefined) this.state.rules[index].enabled = updates.enabled ? 1 : 0;

    this.saveState();
    const data = this.state.rules[index];
    return {
      id: data.id,
      whenText: data.when_text,
      thenText: data.then_text,
      enabled: data.enabled,
      createdAt: data.created_at
    };
  }

  public async deleteRule(userId: string, id: string): Promise<boolean> {
    const initialLen = this.state.rules.length;
    this.state.rules = this.state.rules.filter(r => !(r.id === id && r.user_id === userId));
    if (this.state.rules.length !== initialLen) {
      this.saveState();
      return true;
    }
    return false;
  }

  // --- Documents (Local Storage) ---
  public async getDocuments(userId: string, limit = 100): Promise<any[]> {
    const userDocs = this.state.documents.filter(d => d.user_id === userId);
    const sorted = [...userDocs].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return sorted.slice(0, limit).map(row => ({
      id: row.id,
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size,
      objectKey: row.object_key,
      status: row.status,
      source: row.source,
      createdAt: row.created_at
    }));
  }

  public async insertDocument(userId: string, doc: any): Promise<any> {
    const newDoc: DBDocument = {
      id: crypto.randomUUID(),
      user_id: userId,
      filename: doc.filename,
      mime_type: doc.mimeType,
      size: doc.size,
      object_key: doc.objectKey,
      status: doc.status,
      source: doc.source,
      created_at: new Date().toISOString()
    };
    this.state.documents.push(newDoc);
    this.saveState();
    return {
      id: newDoc.id,
      filename: newDoc.filename,
      mimeType: newDoc.mime_type,
      size: newDoc.size,
      objectKey: newDoc.object_key,
      status: newDoc.status,
      source: newDoc.source,
      createdAt: newDoc.created_at
    };
  }

  public async getDocumentById(userId: string, id: string): Promise<any> {
    const doc = this.state.documents.find(d => d.id === id && d.user_id === userId);
    if (!doc) return null;
    return {
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mime_type,
      size: doc.size,
      objectKey: doc.object_key,
      status: doc.status,
      source: doc.source,
      createdAt: doc.created_at
    };
  }

  public async deleteDocument(userId: string, id: string): Promise<boolean> {
    const doc = await this.getDocumentById(userId, id);
    if (!doc) return false;
    
    // Delete from Local Storage
    await this.deleteR2Object(userId, doc.objectKey);
    
    this.state.documents = this.state.documents.filter(d => !(d.id === id && d.user_id === userId));
    this.saveState();
    return true;
  }

  // --- Local Storage operations ---
  public async saveR2Object(userId: string, objectKey: string, buffer: Buffer): Promise<string> {
    // objectKey here includes "uploads/" which we can remove or use as subpath
    const basename = path.basename(objectKey);
    const dest = path.join(UPLOADS_DIR, `${userId}_${basename}`);
    fs.writeFileSync(dest, buffer);
    return objectKey;
  }

  public async getR2Object(userId: string, objectKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
    const basename = path.basename(objectKey);
    const dest = path.join(UPLOADS_DIR, `${userId}_${basename}`);
    if (fs.existsSync(dest)) {
      return { buffer: fs.readFileSync(dest), exists: true };
    }
    return { buffer: Buffer.from([]), exists: false };
  }

  public async deleteR2Object(userId: string, objectKey: string): Promise<boolean> {
    const basename = path.basename(objectKey);
    const dest = path.join(UPLOADS_DIR, `${userId}_${basename}`);
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
      return true;
    }
    return false;
  }

  public async clearR2Storage(userId: string): Promise<void> {
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      for (const file of files) {
        if (file.startsWith(`${userId}_`)) {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
        }
      }
    } catch (e) {
      console.error('Error clearing uploads:', e);
    }
  }

  // --- Settings ---
  public async getSettings(userId: string): Promise<Record<string, any>> {
    if (!this.state.settings[userId]) {
      this.state.settings[userId] = {};
    }
    const result = { ...this.state.settings[userId] };
    if (!result.driveProvider) result.driveProvider = 'onedrive';
    
    let urlStr = result.driveFolderUrl;
    if (urlStr && typeof urlStr === 'object' && urlStr.value) {
      urlStr = urlStr.value;
    }
    
    if (!urlStr || (typeof urlStr === 'string' && urlStr.includes('ledgerly_inbox_folder'))) {
      const defaultUrl = (result.driveProvider && result.driveProvider.value && result.driveProvider.value.includes('onedrive')) || result.driveProvider === 'onedrive'
        ? 'https://onedrive.live.com' 
        : 'https://drive.google.com';
      if (typeof result.driveFolderUrl === 'object') {
        result.driveFolderUrl.value = `"${defaultUrl}"`;
      } else {
        result.driveFolderUrl = defaultUrl;
      }
    }
    return result;
  }

  public async setSetting(userId: string, key: string, value: any): Promise<void> {
    if (!this.state.settings[userId]) {
      this.state.settings[userId] = {};
    }
    this.state.settings[userId][key] = value;
    this.saveState();
  }

  public async updatePreferences(userId: string, preferences: Record<string, any>): Promise<void> {
    if (!this.state.settings[userId]) {
      this.state.settings[userId] = {};
    }
    for (const [k, v] of Object.entries(preferences)) {
      if (v !== undefined) {
        this.state.settings[userId][k] = v;
      }
    }
    this.saveState();
  }

  // --- Complete State Wipe ---
  public async wipeAllData(userId: string): Promise<boolean> {
    this.state.transactions = this.state.transactions.filter(t => t.user_id !== userId);
    this.state.documents = this.state.documents.filter(d => d.user_id !== userId);
    this.state.tags = this.state.tags.filter(t => t.user_id !== userId);
    this.state.rules = this.state.rules.filter(r => r.user_id !== userId);
    
    // reset only document sync related settings
    const now = new Date().toISOString();
    await this.updatePreferences(userId, {
      driveLastSync: null,
      driveLastStatus: null,
      driveLastStats: null,
      processedFileIds: [],
      driveResetAt: now,
    });
    
    await this.clearR2Storage(userId);
    this.saveState();
    
    return true;
  }

  // --- Users & Authentication ---
  public async getUsersCount(): Promise<number> {
    return (this.state.users || []).length;
  }

  public async getUserByUsername(username: string): Promise<DBUser | null> {
    const users = this.state.users || [];
    return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
  }

  public async getFirstUser(): Promise<DBUser | null> {
    const users = this.state.users || [];
    return users.length > 0 ? users[0] : null;
  }

  public async getUserById(id: string): Promise<DBUser | null> {
    const users = this.state.users || [];
    return users.find(u => u.id === id) || null;
  }

  public async getUserByGoogleId(googleId: string): Promise<DBUser | null> {
    const users = this.state.users || [];
    return users.find(u => u.google_id === googleId) || null;
  }

  public async getUserByEmail(email: string): Promise<DBUser | null> {
    const users = this.state.users || [];
    return users.find(u => u.email && u.email.toLowerCase() === email.trim().toLowerCase()) || null;
  }

  public async createGoogleUser(googleId: string, email: string, name: string, picture?: string): Promise<DBUser> {
    const userId = `user_${crypto.randomBytes(8).toString('hex')}`;

    const newUser: DBUser = {
      id: userId,
      username: name.trim() || email.split('@')[0],
      email: email.trim().toLowerCase(),
      picture,
      google_id: googleId,
      created_at: new Date().toISOString(),
    };

    if (!this.state.users) this.state.users = [];
    this.state.users.push(newUser);
    this.saveState();
    return newUser;
  }

  public async linkGoogleAccount(userId: string, googleId: string, email: string, picture?: string, name?: string): Promise<DBUser | null> {
    const user = await this.getUserById(userId);
    if (!user) return null;
    user.google_id = googleId;
    user.email = email.trim().toLowerCase();
    if (picture) user.picture = picture;
    if (name && (user.id !== 'local-user' || !user.username || user.username === 'Admin')) {
      user.username = name.trim();
    }
    this.saveState();
    return user;
  }

  public async createUser(username: string, password: string): Promise<DBUser> {
    const trimmed = username.trim();
    const existing = await this.getUserByUsername(trimmed);
    if (existing) {
      throw new Error(`User with username "${trimmed}" already exists.`);
    }

    const { hash, salt } = hashPassword(password);
    // If this is the very first user, link to 'local-user' so all previous data is immediately inherited
    const isFirstUser = (!this.state.users || this.state.users.length === 0);
    const userId = isFirstUser ? 'local-user' : `user_${crypto.randomBytes(8).toString('hex')}`;

    const newUser: DBUser = {
      id: userId,
      username: trimmed,
      password_hash: hash,
      salt: salt,
      created_at: new Date().toISOString(),
    };

    if (!this.state.users) this.state.users = [];
    this.state.users.push(newUser);
    this.saveState();
    return newUser;
  }

  public async createSession(userId: string, expiresInDays = 30): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
    
    const session: DBSession = {
      token,
      user_id: userId,
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    if (!this.state.sessions) this.state.sessions = [];
    // Clean up expired sessions
    this.state.sessions = this.state.sessions.filter(s => s.expires_at > Date.now());
    this.state.sessions.push(session);
    this.saveState();
    return token;
  }

  public async getSession(token: string): Promise<DBSession | null> {
    if (!token || !this.state.sessions) return null;
    const session = this.state.sessions.find(s => s.token === token);
    if (!session) return null;
    if (session.expires_at < Date.now()) {
      await this.deleteSession(token);
      return null;
    }
    return session;
  }

  public async deleteSession(token: string): Promise<void> {
    if (!this.state.sessions) return;
    this.state.sessions = this.state.sessions.filter(s => s.token !== token);
    this.saveState();
  }
}

export const db = new LocalDatabase();
