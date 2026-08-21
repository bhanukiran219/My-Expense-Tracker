import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ SUPABASE_URL and SUPABASE_KEY are not set. The database will not work properly until you set them.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

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
  created_at: string;
}

export interface DBTag {
  name: string;
  created_at: string;
}

export interface DBRule {
  id: string;
  when_text: string;
  then_text: string;
  enabled: number;
  created_at: string;
}

export interface DBDocument {
  id: string;
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
  value: string;
  updated_at: string;
}

export class SupabaseDatabase {
  // --- Transactions ---
  public buildFingerprint(date: string, merchant: string, amount: number, account: string): string {
    const d = (date || '').trim();
    const m = (merchant || '').trim().toLowerCase();
    const a = Number(amount).toFixed(2);
    const acc = (account || 'Imported account').trim().toLowerCase();
    return `${d}|${m}|${a}|${acc}`;
  }

  public async getTransactions(limit = 5000): Promise<any[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    // Convert snake_case back to camelCase for the frontend if needed, but we'll map createdAt
    return (data || []).map(row => ({
      ...row,
      createdAt: row.created_at
    }));
  }

  public async insertTransaction(tx: any): Promise<{ success: boolean; transaction?: any; isDuplicate?: boolean }> {
    const fingerprint = this.buildFingerprint(tx.date, tx.merchant, tx.amount, tx.account);
    
    // Check for duplicates
    const { data: existing } = await supabase
      .from('transactions')
      .select('*')
      .eq('fingerprint', fingerprint)
      .single();

    if (existing) {
      return { success: false, isDuplicate: true, transaction: { ...existing, createdAt: existing.created_at } };
    }

    const id = tx.id || crypto.randomUUID();

    // Apply rules
    let category = tx.category || 'Needs review';
    let tagsList: string[] = [];
    try {
      tagsList = JSON.parse(tx.tags || '[]');
    } catch {
      tagsList = [];
    }

    const rules = await this.getRules();
    const activeRules = rules.filter((r: any) => r.enabled === 1);
    for (const rule of activeRules) {
      if (rule.whenText && tx.merchant.toLowerCase().includes(rule.whenText.toLowerCase())) {
        if (rule.thenText) {
          category = rule.thenText;
        }
      }
    }

    const newTx = {
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
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTx])
      .select()
      .single();

    if (error) {
      console.error('Error inserting transaction:', error);
      return { success: false };
    }

    return { success: true, transaction: { ...data, createdAt: data.created_at } };
  }

  public async updateTransaction(id: string, updates: any): Promise<any | null> {
    // First get existing transaction to calculate new fingerprint if needed
    const { data: existing } = await supabase.from('transactions').select('*').eq('id', id).single();
    if (!existing) return null;

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
        await this.insertTag(tagName as string);
      }
    }

    if (fingerprintChanged) {
      const tx = { ...existing, ...payload };
      payload.fingerprint = this.buildFingerprint(tx.date, tx.merchant, tx.amount, tx.account);
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return null;
    }

    return { ...data, createdAt: data.created_at };
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
    return true;
  }

  // --- Tags ---
  public async getTags(): Promise<any[]> {
    const { data, error } = await supabase.from('tags').select('*');
    if (error) return [];
    return data.map(row => ({ ...row, createdAt: row.created_at }));
  }

  public async insertTag(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const { error } = await supabase.from('tags').insert([{ name: trimmed }]).select();
    return !error;
  }

  public async deleteTag(name: string): Promise<boolean> {
    const trimmed = name.trim();
    const { error } = await supabase.from('tags').delete().ilike('name', trimmed);
    return !error;
  }

  // --- Rules ---
  public async getRules(): Promise<any[]> {
    const { data, error } = await supabase.from('rules').select('*');
    if (error) return [];
    return data.map(row => ({
      id: row.id,
      whenText: row.when_text,
      thenText: row.then_text,
      enabled: row.enabled,
      createdAt: row.created_at
    }));
  }

  public async insertRule(whenText: string, thenText: string, enabled = 1): Promise<any> {
    const { data, error } = await supabase
      .from('rules')
      .insert([{ when_text: whenText.trim(), then_text: thenText.trim(), enabled: enabled ? 1 : 0 }])
      .select()
      .single();

    if (error) return null;
    return {
      id: data.id,
      whenText: data.when_text,
      thenText: data.then_text,
      enabled: data.enabled,
      createdAt: data.created_at
    };
  }

  public async updateRule(id: string, updates: any): Promise<any> {
    const payload: any = {};
    if (updates.whenText !== undefined) payload.when_text = updates.whenText.trim();
    if (updates.thenText !== undefined) payload.then_text = updates.thenText.trim();
    if (updates.enabled !== undefined) payload.enabled = updates.enabled ? 1 : 0;

    const { data, error } = await supabase
      .from('rules')
      .update(payload)
      .eq('id', id)
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
  }

  public async deleteRule(id: string): Promise<boolean> {
    const { error } = await supabase.from('rules').delete().eq('id', id);
    return !error;
  }

  // --- Documents (Supabase Storage) ---
  public async getDocuments(limit = 100): Promise<any[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
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
  }

  public async insertDocument(doc: any): Promise<any> {
    const { data, error } = await supabase
      .from('documents')
      .insert([{
        filename: doc.filename,
        mime_type: doc.mimeType,
        size: doc.size,
        object_key: doc.objectKey,
        status: doc.status,
        source: doc.source
      }])
      .select()
      .single();

    if (error) return null;
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
  }

  public async getDocumentById(id: string): Promise<any> {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
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
  }

  public async deleteDocument(id: string): Promise<boolean> {
    const doc = await this.getDocumentById(id);
    if (!doc) return false;
    
    // Delete from Supabase Storage
    await this.deleteR2Object(doc.objectKey);
    
    const { error } = await supabase.from('documents').delete().eq('id', id);
    return !error;
  }

  // --- Supabase Storage operations ---
  public async saveR2Object(objectKey: string, buffer: Buffer): Promise<string> {
    const { error } = await supabase.storage.from('ledgerly-storage').upload(objectKey, buffer, {
      upsert: true
    });
    if (error) {
      console.error('Error uploading file to Supabase Storage:', error);
    }
    return objectKey;
  }

  public async getR2Object(objectKey: string): Promise<{ buffer: Buffer; exists: boolean }> {
    const { data, error } = await supabase.storage.from('ledgerly-storage').download(objectKey);
    if (error || !data) {
      return { buffer: Buffer.from([]), exists: false };
    }
    const arrayBuffer = await data.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), exists: true };
  }

  public async deleteR2Object(objectKey: string): Promise<boolean> {
    const { error } = await supabase.storage.from('ledgerly-storage').remove([objectKey]);
    return !error;
  }

  public async clearR2Storage(): Promise<void> {
    // Note: Emptying a bucket via API requires listing all files and deleting them.
    // For safety, this function will simply skip in this basic setup.
    console.log('Skipping bucket wipe for safety on Supabase');
  }

  // --- Settings ---
  public async getSettings(): Promise<Record<string, any>> {
    const { data, error } = await supabase.from('settings').select('*');
    const result: Record<string, any> = {};
    if (!error && data) {
      for (const row of data) {
        try {
          result[row.key] = JSON.parse(row.value);
        } catch {
          result[row.key] = row.value;
        }
      }
    }

    if (!result.driveProvider) result.driveProvider = 'onedrive';
    if (!result.driveFolderUrl || result.driveFolderUrl.includes('ledgerly_inbox_folder')) {
      result.driveFolderUrl = result.driveProvider === 'onedrive' 
        ? 'https://onedrive.live.com' 
        : 'https://drive.google.com';
    }
    return result;
  }

  public async setSetting(key: string, value: any): Promise<void> {
    await supabase.from('settings').upsert({
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString()
    });
  }

  public async updatePreferences(preferences: Record<string, any>): Promise<void> {
    const upserts = [];
    for (const [k, v] of Object.entries(preferences)) {
      if (v !== undefined) {
        upserts.push({ key: k, value: JSON.stringify(v), updated_at: new Date().toISOString() });
      }
    }
    if (upserts.length > 0) {
      await supabase.from('settings').upsert(upserts);
    }
  }

  // --- Complete State Wipe ---
  public async wipeAllData(): Promise<boolean> {
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('tags').delete().neq('name', 'none');
    
    // reset settings
    const now = new Date().toISOString();
    await this.updatePreferences({
      assetsTotal: 0,
      liabilitiesTotal: 0,
      netWorthConfigured: false,
      driveLastSync: null,
      driveLastStatus: null,
      driveLastStats: null,
      processedFileIds: [],
      driveResetAt: now,
      freshStart: true,
    });
    
    return true;
  }
}

export const db = new SupabaseDatabase();
