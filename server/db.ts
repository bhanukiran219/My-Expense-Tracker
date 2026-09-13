import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist for local file storage
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
  tags: string; // JSON array string
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

function getDefaultSettings(): Record<string, any> {
  return {
    categories: [
      'Housing',
      'Groceries',
      'Dining',
      'Shopping',
      'Transportation',
      'Utilities',
      'Subscriptions',
      'Entertainment',
      'Healthcare',
      'Income',
      'Other',
    ],
    accounts: [
      'Main Checking',
      'Savings Account',
      'Credit Card',
      'Cash',
    ],
    budgets: [],
    recurring: [],
    subscriptions: [],
    goals: [],
    loans: [],
    assets: [],
    liabilities: [],
    netWorthHistory: [],
    assetsTotal: 0,
    liabilitiesTotal: 0,
    netWorthConfigured: false,
    expectedMonthlyIncome: 0,
    incomePayday: 1,
    safetyBufferAmount: 0,
    forecastDays: 30,
    driveProvider: 'onedrive',
    driveFolderUrl: 'https://onedrive.live.com',
  };
}

// ----------------------------------------------------
// Supabase Database Implementation
// ----------------------------------------------------
export class SupabaseDatabase {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
    console.log('✅ Supabase Client initialized with URL:', url);
  }

  public buildFingerprint(date: string, merchant: string, amount: number, account: string): string {
    const d = (date || '').trim();
    const m = (merchant || '').trim().toLowerCase();
    const a = Number(amount).toFixed(2);
    const acc = (account || 'Imported account').trim().toLowerCase();
    return `${d}|${m}|${a}|${acc}`;
  }

  // --- Transactions ---
  public async getTransactions(userId: string, limit = 5000): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Supabase getTransactions error:', error);
        return [];
      }
      return (data || []).map(row => ({
        ...row,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Supabase getTransactions exception:', err);
      return [];
    }
  }

  public async insertTransaction(userId: string, tx: any): Promise<{ success: boolean; transaction?: any; isDuplicate?: boolean }> {
    try {
      const isManual = tx.source === 'manual' || !tx.source;
      const baseFingerprint = this.buildFingerprint(tx.date, tx.merchant, tx.amount, tx.account);
      const fingerprint = isManual ? `${baseFingerprint}|${tx.id || crypto.randomUUID()}` : baseFingerprint;

      if (!isManual) {
        const { data: existing } = await this.client
          .from('transactions')
          .select('*')
          .eq('user_id', userId)
          .eq('fingerprint', baseFingerprint)
          .maybeSingle();

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

      // Check active rules
      const rules = await this.getRules(userId);
      const activeRules = rules.filter(r => r.enabled === 1);
      for (const rule of activeRules) {
        if (rule.whenText && tx.merchant.toLowerCase().includes(rule.whenText.toLowerCase())) {
          if (rule.thenText) {
            category = rule.thenText;
          }
        }
      }

      const newTx = {
        id,
        user_id: userId,
        date: tx.date,
        merchant: tx.merchant.trim(),
        category: category.trim(),
        amount: Math.abs(Number(tx.amount)),
        type: tx.type === 'income' ? 'income' : 'expense',
        account: (tx.account || 'Imported account').trim(),
        tags: JSON.stringify(Array.from(new Set(tagsList.map((t: string) => t.trim()).filter(Boolean)))),
        receipt: tx.receipt ? 1 : 0,
        source: tx.source || 'manual',
        fingerprint,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('transactions')
        .insert([newTx])
        .select()
        .single();

      if (error) {
        console.error('Supabase insertTransaction error:', error);
        return { success: false };
      }

      return { success: true, transaction: { ...data, createdAt: data.created_at } };
    } catch (err) {
      console.error('Supabase insertTransaction exception:', err);
      return { success: false };
    }
  }

  public async updateTransaction(userId: string, id: string, updates: any): Promise<any | null> {
    try {
      const { data: existing, error: fetchErr } = await this.client
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchErr || !existing) return null;

      const payload: any = {};
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
        const finalDate = payload.date || existing.date;
        const finalMerchant = payload.merchant || existing.merchant;
        const finalAmount = payload.amount !== undefined ? payload.amount : existing.amount;
        const finalAccount = payload.account || existing.account;
        payload.fingerprint = this.buildFingerprint(finalDate, finalMerchant, finalAmount, finalAccount);
      }

      const { data, error } = await this.client
        .from('transactions')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        console.error('Supabase updateTransaction error:', error);
        return null;
      }
      return { ...data, createdAt: data.created_at };
    } catch (err) {
      console.error('Supabase updateTransaction exception:', err);
      return null;
    }
  }

  public async deleteTransaction(userId: string, id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.error('Supabase deleteTransaction exception:', err);
      return false;
    }
  }

  // --- Tags ---
  public async getTags(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('tags')
        .select('*')
        .eq('user_id', userId);

      if (error || !data) return [];
      return data.map(row => ({ ...row, createdAt: row.created_at }));
    } catch (err) {
      console.error('Supabase getTags exception:', err);
      return [];
    }
  }

  public async insertTag(userId: string, name: string): Promise<boolean> {
    try {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const { error } = await this.client
        .from('tags')
        .upsert([{ user_id: userId, name: trimmed, created_at: new Date().toISOString() }]);

      return !error;
    } catch (err) {
      console.error('Supabase insertTag exception:', err);
      return false;
    }
  }

  public async deleteTag(userId: string, name: string): Promise<boolean> {
    try {
      const trimmed = name.trim();
      const { error } = await this.client
        .from('tags')
        .delete()
        .eq('user_id', userId)
        .ilike('name', trimmed);

      return !error;
    } catch (err) {
      console.error('Supabase deleteTag exception:', err);
      return false;
    }
  }

  // --- Rules ---
  public async getRules(userId: string): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('rules')
        .select('*')
        .eq('user_id', userId);

      if (error || !data) return [];
      return data.map(row => ({
        id: row.id,
        whenText: row.when_text,
        thenText: row.then_text,
        enabled: row.enabled,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Supabase getRules exception:', err);
      return [];
    }
  }

  public async insertRule(userId: string, whenText: string, thenText: string, enabled = 1): Promise<any> {
    try {
      const newRule = {
        id: crypto.randomUUID(),
        user_id: userId,
        when_text: whenText.trim(),
        then_text: thenText.trim(),
        enabled: enabled ? 1 : 0,
        created_at: new Date().toISOString()
      };
      const { data, error } = await this.client
        .from('rules')
        .insert([newRule])
        .select()
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        whenText: data.when_text,
        thenText: data.then_text,
        enabled: data.enabled,
        createdAt: data.created_at
      };
    } catch (err) {
      console.error('Supabase insertRule exception:', err);
      return null;
    }
  }

  public async updateRule(userId: string, id: string, updates: any): Promise<any> {
    try {
      const payload: any = {};
      if (updates.whenText !== undefined) payload.when_text = updates.whenText.trim();
      if (updates.thenText !== undefined) payload.then_text = updates.thenText.trim();
      if (updates.enabled !== undefined) payload.enabled = updates.enabled ? 1 : 0;

      const { data, error } = await this.client
        .from('rules')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        whenText: data.when_text,
        thenText: data.then_text,
        enabled: data.enabled,
        createdAt: data.created_at
      };
    } catch (err) {
      console.error('Supabase updateRule exception:', err);
      return null;
    }
  }

  public async deleteRule(userId: string, id: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('rules')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.error('Supabase deleteRule exception:', err);
      return false;
    }
  }

  // --- Documents ---
  public async getDocuments(userId: string, limit = 100): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map(row => ({
        id: row.id,
        filename: row.filename,
        mimeType: row.mime_type,
        size: row.size,
        objectKey: row.object_key,
        status: row.status,
        source: row.source,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Supabase getDocuments exception:', err);
      return [];
    }
  }

  public async insertDocument(userId: string, doc: any): Promise<any> {
    try {
      const newDoc = {
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
      const { data, error } = await this.client
        .from('documents')
        .insert([newDoc])
        .select()
        .single();

      if (error || !data) return null;
      return {
        id: data.id,
        filename: data.filename,
        mimeType: data.mime_type,
        size: data.size,
        objectKey: data.object_key,
        status: data.status,
        source: data.source,
        createdAt: data.created_at
      };
    } catch (err) {
      console.error('Supabase insertDocument exception:', err);
      return null;
    }
  }

  public async getDocumentById(userId: string, id: string): Promise<any> {
    try {
      const { data, error } = await this.client
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return {
        id: data.id,
        filename: data.filename,
        mimeType: data.mime_type,
        size: data.size,
        objectKey: data.object_key,
        status: data.status,
        source: data.source,
        createdAt: data.created_at
      };
    } catch (err) {
      console.error('Supabase getDocumentById exception:', err);
      return null;
    }
  }

  public async deleteDocument(userId: string, id: string): Promise<boolean> {
    try {
      const doc = await this.getDocumentById(userId, id);
      if (!doc) return false;

      await this.deleteR2Object(userId, doc.objectKey);

      const { error } = await this.client
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.error('Supabase deleteDocument exception:', err);
      return false;
    }
  }

  // --- Local disk uploads storage ---
  public async saveR2Object(userId: string, objectKey: string, buffer: Buffer): Promise<string> {
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
    try {
      const { data, error } = await this.client
        .from('settings')
        .select('*')
        .eq('user_id', userId);

      const result: Record<string, any> = {};
      if (!error && data && data.length > 0) {
        for (const row of data) {
          try {
            result[row.key] = JSON.parse(row.value);
          } catch {
            result[row.key] = row.value;
          }
        }
      }

      // If user has no settings yet or is missing keys, populate defaults without overwriting
      const defaults = getDefaultSettings();
      const missingDefaults: Record<string, any> = {};
      for (const [k, v] of Object.entries(defaults)) {
        if (result[k] === undefined) {
          result[k] = v;
          missingDefaults[k] = v;
        }
      }

      if (Object.keys(missingDefaults).length > 0) {
        this.updatePreferences(userId, missingDefaults).catch(console.error);
      }

      if (!result.driveProvider) result.driveProvider = 'onedrive';
      if (!result.driveFolderUrl || (typeof result.driveFolderUrl === 'string' && result.driveFolderUrl.includes('ledgerly_inbox_folder'))) {
        result.driveFolderUrl = result.driveProvider === 'onedrive' ? 'https://onedrive.live.com' : 'https://drive.google.com';
      }

      return result;
    } catch (err) {
      console.error('Supabase getSettings exception:', err);
      return getDefaultSettings();
    }
  }

  public async setSetting(userId: string, key: string, value: any): Promise<void> {
    try {
      await this.client.from('settings').upsert({
        user_id: userId,
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Supabase setSetting exception:', err);
    }
  }

  public async updatePreferences(userId: string, preferences: Record<string, any>): Promise<void> {
    try {
      const upserts = [];
      for (const [k, v] of Object.entries(preferences)) {
        if (v !== undefined) {
          upserts.push({
            user_id: userId,
            key: k,
            value: JSON.stringify(v),
            updated_at: new Date().toISOString()
          });
        }
      }
      if (upserts.length > 0) {
        await this.client.from('settings').upsert(upserts);
      }
    } catch (err) {
      console.error('Supabase updatePreferences exception:', err);
    }
  }

  // --- Complete State Wipe ---
  public async wipeAllData(userId: string): Promise<boolean> {
    try {
      await this.client.from('transactions').delete().eq('user_id', userId);
      await this.client.from('documents').delete().eq('user_id', userId);
      await this.client.from('rules').delete().eq('user_id', userId);
      await this.client.from('tags').delete().eq('user_id', userId);

      const now = new Date().toISOString();
      await this.updatePreferences(userId, {
        driveLastSync: null,
        driveLastStatus: null,
        driveLastStats: null,
        processedFileIds: [],
        driveResetAt: now,
      });

      await this.clearR2Storage(userId);
      return true;
    } catch (err) {
      console.error('Supabase wipeAllData exception:', err);
      return false;
    }
  }

  // --- Users & Authentication ---
  public async getUsersCount(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Supabase getUsersCount error:', error);
        return 0;
      }
      return count || 0;
    } catch (err) {
      console.error('Supabase getUsersCount exception:', err);
      return 0;
    }
  }

  public async getUserByUsername(username: string): Promise<DBUser | null> {
    try {
      const trimmed = username.trim().toLowerCase();
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .ilike('username', trimmed)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Supabase getUserByUsername exception:', err);
      return null;
    }
  }

  public async getFirstUser(): Promise<DBUser | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Supabase getFirstUser exception:', err);
      return null;
    }
  }

  public async getUserById(id: string): Promise<DBUser | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Supabase getUserById exception:', err);
      return null;
    }
  }

  public async getUserByGoogleId(googleId: string): Promise<DBUser | null> {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Supabase getUserByGoogleId exception:', err);
      return null;
    }
  }

  public async getUserByEmail(email: string): Promise<DBUser | null> {
    try {
      const trimmed = email.trim().toLowerCase();
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .ilike('email', trimmed)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Supabase getUserByEmail exception:', err);
      return null;
    }
  }

  public async getUserByUsernameOrEmail(identifier: string): Promise<DBUser | null> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return null;
    const user = await this.getUserByUsername(trimmed);
    if (user) return user;
    return await this.getUserByEmail(trimmed);
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

    const { data, error } = await this.client
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      console.error('Supabase createGoogleUser error:', error);
      throw error;
    }
    return data;
  }

  public async linkGoogleAccount(userId: string, googleId: string, email: string, picture?: string, name?: string): Promise<DBUser | null> {
    const updates: any = {
      google_id: googleId,
      email: email.trim().toLowerCase(),
    };
    if (picture) updates.picture = picture;
    if (name && (userId !== 'local-user')) {
      updates.username = name.trim();
    }

    const { data, error } = await this.client
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Supabase linkGoogleAccount error:', error);
      return null;
    }
    return data;
  }

  public async createUser(username: string, password: string): Promise<DBUser> {
    const trimmed = username.trim();
    const existing = await this.getUserByUsername(trimmed);
    if (existing) {
      throw new Error(`User with username "${trimmed}" already exists.`);
    }

    const { hash, salt } = hashPassword(password);
    const count = await this.getUsersCount();
    const userId = count === 0 ? 'local-user' : `user_${crypto.randomBytes(8).toString('hex')}`;

    const newUser: DBUser = {
      id: userId,
      username: trimmed,
      password_hash: hash,
      salt: salt,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await this.client
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      console.error('Supabase createUser error:', error);
      throw error;
    }
    return data;
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

    await this.client.from('sessions').insert([session]);
    return token;
  }

  public async getSession(token: string): Promise<DBSession | null> {
    if (!token) return null;
    try {
      const { data, error } = await this.client
        .from('sessions')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error || !data) return null;
      if (data.expires_at < Date.now()) {
        await this.deleteSession(token);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Supabase getSession exception:', err);
      return null;
    }
  }

  public async deleteSession(token: string): Promise<void> {
    if (!token) return;
    try {
      await this.client.from('sessions').delete().eq('token', token);
    } catch (err) {
      console.error('Supabase deleteSession exception:', err);
    }
  }

  public async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const { hash, salt } = hashPassword(newPassword);
      const { error } = await this.client
        .from('users')
        .update({
          password_hash: hash,
          salt: salt,
        })
        .eq('id', userId);

      if (error) {
        console.error('Supabase updateUserPassword error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Supabase updateUserPassword exception:', err);
      return false;
    }
  }

  public async setRecoveryConfig(userId: string, question: string, answerOrPin: string): Promise<void> {
    const cleanAnswer = (answerOrPin || '').trim().toLowerCase();
    const answerHash = crypto.createHash('sha256').update(cleanAnswer).digest('hex');
    await this.setSetting(userId, 'recovery_question', question.trim());
    await this.setSetting(userId, 'recovery_answer_hash', answerHash);
  }

  public async getRecoveryConfig(userId: string): Promise<{ question: string; hasRecovery: boolean } | null> {
    const settings = await this.getSettings(userId);
    const question = settings.recovery_question || (userId === 'local-user' ? 'What is your secret 4-digit PIN or primary bank name?' : null);
    if (!question) return null;
    return {
      question,
      hasRecovery: true
    };
  }

  public async verifyRecoveryAnswer(userId: string, answerOrPin: string): Promise<boolean> {
    const cleanAnswer = (answerOrPin || '').trim().toLowerCase();
    const settings = await this.getSettings(userId);
    const storedHash = settings.recovery_answer_hash;

    // For local-user default support: PIN 1234, icici, or bhanu if no custom answer is set yet
    if (!storedHash && userId === 'local-user') {
      if (cleanAnswer === '1234' || cleanAnswer === 'icici' || cleanAnswer === 'bhanu') {
        return true;
      }
    }

    if (!storedHash) return false;
    const computedHash = crypto.createHash('sha256').update(cleanAnswer).digest('hex');
    return storedHash === computedHash;
  }
}

// ----------------------------------------------------
// Local JSON File Database Implementation (Fallback)
// ----------------------------------------------------
interface LocalDBState {
  transactions: DBTransaction[];
  tags: DBTag[];
  rules: DBRule[];
  documents: DBDocument[];
  settings: Record<string, Record<string, any>>;
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
    
    await this.deleteR2Object(userId, doc.objectKey);
    
    this.state.documents = this.state.documents.filter(d => !(d.id === id && d.user_id === userId));
    this.saveState();
    return true;
  }

  public async saveR2Object(userId: string, objectKey: string, buffer: Buffer): Promise<string> {
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

  public async getSettings(userId: string): Promise<Record<string, any>> {
    if (!this.state.settings[userId]) {
      this.state.settings[userId] = getDefaultSettings();
      this.saveState();
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

  public async wipeAllData(userId: string): Promise<boolean> {
    this.state.transactions = this.state.transactions.filter(t => t.user_id !== userId);
    this.state.documents = this.state.documents.filter(d => d.user_id !== userId);
    this.state.tags = this.state.tags.filter(t => t.user_id !== userId);
    this.state.rules = this.state.rules.filter(r => r.user_id !== userId);
    
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

  public async getUserByUsernameOrEmail(identifier: string): Promise<DBUser | null> {
    const trimmed = (identifier || '').trim();
    if (!trimmed) return null;
    const user = await this.getUserByUsername(trimmed);
    if (user) return user;
    return await this.getUserByEmail(trimmed);
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

  public async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    if (!this.state.users) return false;
    const user = this.state.users.find(u => u.id === userId);
    if (!user) return false;

    const { hash, salt } = hashPassword(newPassword);
    user.password_hash = hash;
    user.salt = salt;
    this.saveState();
    return true;
  }

  public async setRecoveryConfig(userId: string, question: string, answerOrPin: string): Promise<void> {
    const cleanAnswer = (answerOrPin || '').trim().toLowerCase();
    const answerHash = crypto.createHash('sha256').update(cleanAnswer).digest('hex');
    await this.setSetting(userId, 'recovery_question', question.trim());
    await this.setSetting(userId, 'recovery_answer_hash', answerHash);
  }

  public async getRecoveryConfig(userId: string): Promise<{ question: string; hasRecovery: boolean } | null> {
    const settings = await this.getSettings(userId);
    const question = settings.recovery_question || (userId === 'local-user' ? 'What is your secret 4-digit PIN or primary bank name?' : null);
    if (!question) return null;
    return {
      question,
      hasRecovery: true
    };
  }

  public async verifyRecoveryAnswer(userId: string, answerOrPin: string): Promise<boolean> {
    const cleanAnswer = (answerOrPin || '').trim().toLowerCase();
    const settings = await this.getSettings(userId);
    const storedHash = settings.recovery_answer_hash;

    // For local-user default support: PIN 1234, icici, or bhanu if no custom answer is set yet
    if (!storedHash && userId === 'local-user') {
      if (cleanAnswer === '1234' || cleanAnswer === 'icici' || cleanAnswer === 'bhanu') {
        return true;
      }
    }

    if (!storedHash) return false;
    const computedHash = crypto.createHash('sha256').update(cleanAnswer).digest('hex');
    return storedHash === computedHash;
  }
}

// ----------------------------------------------------
// Database Factory & Export
// ----------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export const db: LocalDatabase | SupabaseDatabase = (supabaseUrl && supabaseKey)
  ? new SupabaseDatabase(supabaseUrl, supabaseKey)
  : new LocalDatabase();

if (supabaseUrl && supabaseKey) {
  console.log('📦 Persistence Mode: SUPABASE POSTGRESQL');
} else {
  console.log('📁 Persistence Mode: LOCAL FILE (data/db.json)');
}
