import { AppState, Settings, Transaction, DocumentRecord, Tag, Rule } from './types';

export async function fetchState(): Promise<AppState> {
  const res = await fetch('/api/state');
  if (!res.ok) {
    throw new Error(`Failed to fetch state: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    transactions: data.transactions || [],
    tags: data.tags || [],
    rules: data.rules || [],
    settings: data.settings || {},
    documents: data.documents || [],
  };
}

export const fetchAppState = fetchState;

export async function saveTransactions(transactions: Partial<Transaction>[]): Promise<{
  success: boolean;
  inserted: number;
  duplicates: number;
  skipped: number;
  needsReview: number;
  items: Transaction[];
}> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to save transactions: ${errorText || res.statusText}`);
  }
  return res.json();
}

export const importBatch = saveTransactions;

export async function createTransaction(tx: Partial<Transaction>): Promise<Transaction> {
  const res = await saveTransactions([tx]);
  if (!res.items || res.items.length === 0) {
    throw new Error('Transaction was skipped or was a duplicate');
  }
  return res.items[0];
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction> {
  const res = await fetch('/api/transactions', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update transaction: ${errorText || res.statusText}`);
  }
  const data = await res.json();
  return data.transaction;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete transaction: ${res.statusText}`);
  }
  const data = await res.json();
  return data.success;
}

export async function savePreferences(preferences: Partial<Settings>): Promise<Settings> {
  const res = await fetch('/api/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to save preferences: ${errorText || res.statusText}`);
  }
  const data = await res.json();
  return data.settings;
}

export const updatePreferences = savePreferences;

export async function uploadDocuments(formData: FormData): Promise<{
  documents: DocumentRecord[];
  extractedTransactions: Transaction[];
}> {
  const res = await fetch('/api/documents', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Failed to upload document');
  }
  return res.json();
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await fetch(`/api/documents/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete document: ${res.statusText}`);
  }
  const data = await res.json();
  return data.success;
}

export async function wipeState(
  confirmation: string
): Promise<{ success: boolean; message: string; driveResetAt: string }> {
  const res = await fetch('/api/state', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirmation }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Failed to erase data');
  }
  return res.json();
}

export async function wipeAllData(): Promise<boolean> {
  await wipeState('DELETE ALL LEDGERLY DATA');
  return true;
}

export async function createRule(rule: Partial<Rule>): Promise<Rule> {
  const res = await fetch('/api/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!res.ok) {
    throw new Error('Failed to create rule');
  }
  const data = await res.json();
  return data.rule;
}

export async function updateRule(id: string, updates: Partial<Rule>): Promise<Rule> {
  const res = await fetch(`/api/rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    throw new Error('Failed to update rule');
  }
  const data = await res.json();
  return data.rule;
}

export async function deleteRule(id: string): Promise<boolean> {
  const res = await fetch(`/api/rules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete rule');
  }
  const data = await res.json();
  return data.success;
}

export async function createTag(name: string): Promise<Tag> {
  const res = await fetch('/api/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error('Failed to create tag');
  }
  const data = await res.json();
  return data.tag;
}

export async function deleteTag(name: string): Promise<boolean> {
  const res = await fetch(`/api/tags/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete tag');
  }
  const data = await res.json();
  return data.success;
}
