export type Currency = "THB" | "JPY";
export type TransactionType = "expense" | "income" | "saving";
export type Person = "Pao" | "Tim";
export type TransactionOwner = Person | "Both";
export type SplitMode = "none" | "half" | "custom";
export type RecurringFrequency = "daily" | "weekly" | "monthly";
export type ProjectStatus = "Planning" | "Active" | "Completed" | "Archived";
export type ThemeMode = "light" | "dark";
export type CategoryType = "expense" | "income" | "saving";
export type PaymentMethodKind =
  | "cash"
  | "bank"
  | "credit_card"
  | "promptpay"
  | "ewallet"
  | "other";

export interface MoneySplit {
  mode: SplitMode;
  paoShare: number;
  timShare: number;
}

export interface TransactionRecord {
  id: string;
  type: TransactionType;
  amount: number;
  currency?: Currency;
  datetime: string;
  categoryId?: string | null;
  paymentMethodId?: string | null;
  note: string;
  projectId?: string | null;
  savingsPocketId?: string | null;
  payer?: Person | null;
  owner: TransactionOwner;
  split?: MoneySplit | null;
  recurringRuleId?: string | null;
  recurringOccurrenceKey?: string | null;
  recurringGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  type: CategoryType;
  name: string;
  icon: string;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodRecord {
  id: string;
  name: string;
  kind: PaymentMethodKind;
  isDefault: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRecord {
  id: string;
  month: string;
  categoryId?: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsPocketRecord {
  id: string;
  name: string;
  icon: string;
  targetAmount: number;
  openingBalance: number;
  linkedProjectId?: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  icon: string;
  currency?: Currency;
  budget: number;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export type RecurringTransactionTemplate = Omit<
  TransactionRecord,
  | "id"
  | "datetime"
  | "recurringRuleId"
  | "recurringOccurrenceKey"
  | "recurringGenerated"
  | "createdAt"
  | "updatedAt"
>;

export interface RecurringRuleRecord {
  id: string;
  enabled: boolean;
  frequency: RecurringFrequency;
  nextRunAt: string;
  template: RecurringTransactionTemplate;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringOccurrenceRecord {
  id: string;
  occurrenceKey: string;
  ruleId: string;
  transactionId: string;
  scheduledFor: string;
  createdAt: string;
}

export interface AppSettingRecord {
  key: string;
  value:
    | string
    | number
    | boolean
    | null
    | Record<string, unknown>
    | unknown[];
  updatedAt: string;
}

export interface AppBackup {
  version: number;
  exportedAt: string;
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  paymentMethods: PaymentMethodRecord[];
  budgets: BudgetRecord[];
  savingsPockets: SavingsPocketRecord[];
  projects: ProjectRecord[];
  recurringRules: RecurringRuleRecord[];
  recurringOccurrences: RecurringOccurrenceRecord[];
  appSettings: AppSettingRecord[];
}

export interface AppData {
  transactions: TransactionRecord[];
  categories: CategoryRecord[];
  paymentMethods: PaymentMethodRecord[];
  budgets: BudgetRecord[];
  savingsPockets: SavingsPocketRecord[];
  projects: ProjectRecord[];
  recurringRules: RecurringRuleRecord[];
  recurringOccurrences: RecurringOccurrenceRecord[];
  appSettings: AppSettingRecord[];
}
