import { AppState, Settings, Transaction, DocumentRecord, Tag, Rule } from './types';

const BASE_URL = '/api';
const TOKEN_STORAGE_KEY = 'ledgerly_auth_token';

// Token Management Helpers
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });
  
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('ledgerly:unauthorized'));
  }

  return res;
}

// Auth API Methods
export async function getAuthConfig(): Promise<{ googleClientId: string }> {
  try {
    const res = await fetch(`${BASE_URL}/auth/config`);
    if (!res.ok) return { googleClientId: '' };
    const data = await res.json();
    return { googleClientId: data.googleClientId || '' };
  } catch {
    return { googleClientId: '' };
  }
}

export async function checkAuthStatus(): Promise<{
  initialized: boolean;
  authenticated: boolean;
  user?: { id: string; username: string; email?: string; picture?: string };
  userHint?: { username: string; email?: string; picture?: string } | null;
}> {
  try {
    const res = await authFetch(`${BASE_URL}/auth/status`, { cache: 'no-store' });
    if (!res.ok) {
      return { initialized: true, authenticated: false };
    }
    const data = await res.json();
    return {
      initialized: data.initialized ?? true,
      authenticated: data.authenticated ?? false,
      user: data.user,
      userHint: data.userHint ?? null,
    };
  } catch {
    return { initialized: true, authenticated: false };
  }
}

export async function setupMasterAccount(
  password: string,
  username = 'Admin'
): Promise<{ success: boolean; token: string; user: { id: string; username: string; email?: string; picture?: string } }> {
  const res = await fetch(`${BASE_URL}/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to complete initial setup.');
  }

  setAuthToken(data.token);
  return data;
}

export async function registerUser(
  password: string,
  username: string,
  recoveryQuestion?: string,
  recoveryAnswer?: string
): Promise<{ success: boolean; token: string; user: { id: string; username: string; email?: string; picture?: string } }> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, recoveryQuestion, recoveryAnswer }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Registration failed.');
  }

  setAuthToken(data.token);
  return data;
}

export async function getRecoveryQuestion(
  username: string
): Promise<{ success: boolean; username: string; question: string }> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to find account or recovery question.');
  }
  return data;
}

export async function resetPasswordWithRecovery(
  username: string,
  recoveryAnswer: string,
  newPassword: string
): Promise<{ success: boolean; message: string; token: string; user: { id: string; username: string; email?: string; picture?: string } }> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, recoveryAnswer, newPassword }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Password reset failed.');
  }

  setAuthToken(data.token);
  return data;
}

export async function login(
  password: string,
  username?: string
): Promise<{ success: boolean; token: string; user: { id: string; username: string; email?: string; picture?: string } }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid password or username.');
  }

  setAuthToken(data.token);
  return data;
}

export async function loginWithGoogle(
  credential: string
): Promise<{ success: boolean; token: string; user: { id: string; username: string; email?: string; picture?: string } }> {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Google authentication failed.');
  }

  setAuthToken(data.token);
  return data;
}

export async function loginWithGoogleDemo(): Promise<{
  success: boolean;
  token: string;
  user: { id: string; username: string; email?: string; picture?: string };
}> {
  const res = await fetch(`${BASE_URL}/auth/google/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Demo Google authentication failed.');
  }

  setAuthToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await authFetch(`${BASE_URL}/auth/logout`, { method: 'POST' });
  } catch (err) {
    console.warn('Error during logout API call:', err);
  } finally {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('ledgerly:unauthorized'));
  }
}

export async function fetchState(): Promise<AppState> {
  const res = await authFetch(`${BASE_URL}/state`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch state: ${res.statusText}`);
  }
  const data = await res.json();
  const rawSettings = data.settings || {};
  return {
    transactions: data.transactions || [],
    tags: data.tags || [],
    rules: data.rules || [],
    settings: {
      categories: rawSettings.categories || [],
      accounts: rawSettings.accounts || [],
      budgets: rawSettings.budgets || [],
      recurring: rawSettings.recurring || [],
      subscriptions: rawSettings.subscriptions || [],
      goals: rawSettings.goals || [],
      loans: rawSettings.loans || [],
      assets: rawSettings.assets || [],
      liabilities: rawSettings.liabilities || [],
      netWorthHistory: rawSettings.netWorthHistory || [],
      ...rawSettings,
    },
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
  const res = await authFetch(`${BASE_URL}/transactions`, {
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
  const res = await authFetch(`${BASE_URL}/transactions`, {
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
  const res = await authFetch(`${BASE_URL}/transactions/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete transaction: ${res.statusText}`);
  }
  const data = await res.json();
  return data.success;
}

export async function savePreferences(preferences: Partial<Settings>): Promise<Settings> {
  const res = await authFetch(`${BASE_URL}/preferences`, {
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
  const res = await authFetch(`${BASE_URL}/documents`, {
    method: 'POST',
    // Do NOT set Content-Type, fetch will automatically set it with the correct boundary for FormData
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Failed to upload document');
  }
  return res.json();
}

export async function extractDocumentTransaction(documentId: string): Promise<{
  success: boolean;
  transactions: Transaction[];
  duplicates?: number;
  message?: string;
}> {
  const res = await authFetch(`${BASE_URL}/documents/${documentId}/extract`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || 'Failed to extract transaction from document');
  }
  return res.json();
}

export async function deleteDocument(id: string): Promise<boolean> {
  const res = await authFetch(`${BASE_URL}/documents/${id}`, {
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
  const res = await authFetch(`${BASE_URL}/state`, {
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
  const res = await authFetch(`${BASE_URL}/rules`, {
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
  const res = await authFetch(`${BASE_URL}/rules/${id}`, {
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
  const res = await authFetch(`${BASE_URL}/rules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete rule');
  }
  const data = await res.json();
  return data.success;
}

export async function createTag(name: string): Promise<Tag> {
  const res = await authFetch(`${BASE_URL}/tags`, {
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
  const res = await authFetch(`${BASE_URL}/tags/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete tag');
  }
  const data = await res.json();
  return data.success;
}

export async function parseExpenseWithAI(text: string): Promise<Partial<Transaction>> {
  const res = await authFetch(`${BASE_URL}/parse-expense`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    // Ignore JSON parse error
  }

  if (!res.ok || !data.success) {
    let errMsg = data.error || res.statusText || 'Failed to parse expense';
    if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
      try {
        const parsedErr = JSON.parse(errMsg);
        errMsg = parsedErr?.error?.message || parsedErr?.message || errMsg;
      } catch {
        // use raw
      }
    }
    throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
  }
  return data.data;
}
