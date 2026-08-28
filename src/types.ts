export type TransactionType = 'expense' | 'income';
export type TransactionSource = 'manual' | 'csv' | 'document' | 'google-drive';
export type DocumentStatus = 'queued' | 'stored' | 'review';
export type DocumentSource = 'upload' | 'google-drive';
export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
export type DatePeriod = 'all-time' | 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  amount: number; // positive magnitude
  type: TransactionType;
  account: string;
  tags: string[];
  receipt: number; // 0 or 1
  source: TransactionSource;
  fingerprint: string;
  createdAt: string;
}

export interface Tag {
  name: string;
  createdAt: string;
}

export interface Rule {
  id: string;
  whenText: string;
  thenText: string;
  enabled: number; // 1 or 0
  createdAt: string;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  objectKey: string;
  status: DocumentStatus;
  source: DocumentSource;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  active: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  dueDate?: string;
  note?: string;
}

export interface Loan {
  id: string;
  personName: string;
  type: 'lent' | 'borrowed';
  amount: number;
  paidAmount: number;
  dueDate?: string;
  note?: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  cadence: Cadence;
  nextDate: string;
  account?: string;
  active: boolean;
}

export interface SubscriptionItem {
  id: string;
  service: string;
  group: string;
  amount: number;
  cadence: Cadence;
  nextRenewalDate: string;
  account?: string;
  active: boolean;
}

export interface DetectedPattern {
  key: string;
  normalizedMerchant: string;
  displayMerchant: string;
  category: string;
  cadence: Cadence;
  occurrenceCount: number;
  averageAmount: number;
  monthlyEquivalent: number;
  confidence: 'high' | 'likely';
  nextExpectedDate: string;
  isSubscription: boolean;
  lastTransactionDate: string;
  amountVariation: number;
}

export interface DriveSyncStats {
  imported: number;
  duplicates: number;
  filesStored: number;
  review: number;
  errors: string[];
}

export interface Settings {
  categories: string[];
  accounts: string[];
  goals: Goal[];
  budgets: Budget[];
  subscriptions: SubscriptionItem[];
  recurring: RecurringItem[];
  loans: Loan[];
  dismissedPatterns: string[];
  assetsTotal: number;
  liabilitiesTotal: number;
  netWorthConfigured: boolean;
  selectedPeriod: DatePeriod;
  driveProvider?: 'onedrive' | 'google-drive';
  driveFolderName: string;
  driveFolderId: string;
  driveFolderUrl: string;
  driveScheduleTime: string;
  driveScheduleTimezone: string;
  driveScheduleCadence: string;
  driveLastSync: string | null;
  driveLastStatus: string | null;
  driveLastStats: DriveSyncStats | null;
  processedFileIds: string[];
  driveResetAt: string | null;
  freshStart: boolean;
}

export interface AppState {
  transactions: Transaction[];
  tags: Tag[];
  rules: Rule[];
  settings: Settings;
  documents: DocumentRecord[];
}

export const STARTER_CATEGORIES: string[] = [
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

export const STARTER_ACCOUNTS: string[] = [
  'Main Checking',
  'Everyday Visa',
  'Rewards Card',
  'Cash',
];

export const DEFAULT_SETTINGS: Settings = {
  categories: [...STARTER_CATEGORIES],
  accounts: [...STARTER_ACCOUNTS],
  goals: [],
  budgets: [],
  subscriptions: [],
  recurring: [],
  loans: [],
  dismissedPatterns: [],
  assetsTotal: 0,
  liabilitiesTotal: 0,
  netWorthConfigured: false,
  selectedPeriod: 'all-time',
  driveFolderName: 'Ledgerly Financial Inbox',
  driveFolderId: 'ledgerly_inbox_folder_default',
  driveFolderUrl: 'https://drive.google.com/drive/folders/ledgerly_inbox_folder',
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

export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'recurring'
  | 'subscriptions'
  | 'budgets'
  | 'goals'
  | 'loans'
  | 'documents'
  | 'rules'
  | 'rules-tags'
  | 'settings';
