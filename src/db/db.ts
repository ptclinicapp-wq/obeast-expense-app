import Dexie, { type Table } from "dexie";
import type {
  AppSettingRecord,
  BudgetRecord,
  CategoryRecord,
  PaymentMethodRecord,
  ProjectRecord,
  RecurringOccurrenceRecord,
  RecurringRuleRecord,
  SavingsPocketRecord,
  TransactionRecord,
} from "@/types/models";

export class MoneyDatabase extends Dexie {
  transactions!: Table<TransactionRecord, string>;
  categories!: Table<CategoryRecord, string>;
  paymentMethods!: Table<PaymentMethodRecord, string>;
  budgets!: Table<BudgetRecord, string>;
  savingsPockets!: Table<SavingsPocketRecord, string>;
  projects!: Table<ProjectRecord, string>;
  recurringRules!: Table<RecurringRuleRecord, string>;
  recurringOccurrences!: Table<RecurringOccurrenceRecord, string>;
  appSettings!: Table<AppSettingRecord, string>;

  constructor() {
    super("paoTimMoney");

    this.version(1).stores({
      transactions:
        "&id, type, datetime, categoryId, paymentMethodId, projectId, savingsPocketId, recurringRuleId, recurringOccurrenceKey, [type+datetime], [projectId+datetime], [categoryId+datetime]",
      categories: "&id, type, name, sortOrder, archived",
      paymentMethods: "&id, name, kind, isDefault, archived",
      budgets: "&id, month, categoryId, [month+categoryId]",
      savingsPockets: "&id, name, linkedProjectId, archived",
      projects: "&id, name, status",
      recurringRules: "&id, enabled, frequency, nextRunAt",
      recurringOccurrences:
        "&id, &occurrenceKey, ruleId, transactionId, scheduledFor",
      appSettings: "&key",
    });
  }
}

export const db = new MoneyDatabase();
