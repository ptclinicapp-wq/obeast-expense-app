import { db } from "./db";
import type {
  AppSettingRecord,
  BudgetRecord,
  CategoryRecord,
  PaymentMethodRecord,
  ProjectRecord,
  RecurringRuleRecord,
  SavingsPocketRecord,
  TransactionRecord,
} from "@/types/models";

const now = () => new Date().toISOString();
const currentMonth = () => new Date().toISOString().slice(0, 7);

const stamp = <T extends object>(record: T) => {
  const timestamp = now();
  return { ...record, createdAt: timestamp, updatedAt: timestamp };
};

const expenseCategories = [
  ["cat_food", "อาหาร", "🍚"],
  ["cat_drinks", "กาแฟ / เครื่องดื่ม", "☕"],
  ["cat_grocery", "ของใช้ / Grocery", "🧺"],
  ["cat_transport", "เดินทาง", "🚗"],
  ["cat_stay", "ที่พัก", "🏨"],
  ["cat_home", "บ้าน / คอนโด", "🏠"],
  ["cat_utilities", "ค่าน้ำไฟ / Internet", "💡"],
  ["cat_shopping", "Shopping", "🛍️"],
  ["cat_entertainment", "Entertainment", "🎢"],
  ["cat_travel", "ท่องเที่ยว", "✈️"],
  ["cat_health", "สุขภาพ", "🏥"],
  ["cat_gifts", "ของขวัญ", "🎁"],
  ["cat_subscription", "Subscription", "📱"],
  ["cat_finance", "Finance / Fee", "💳"],
  ["cat_other_expense", "อื่นๆ", "🧾"],
] as const;

const incomeCategories = [
  ["cat_salary", "เงินเดือน", "💼"],
  ["cat_bonus", "Bonus", "🎉"],
  ["cat_freelance", "Freelance", "💻"],
  ["cat_investment", "Investment", "📈"],
  ["cat_refund", "Refund", "↩"],
  ["cat_received", "เงินได้รับ", "💵"],
  ["cat_other_income", "อื่นๆ", "💵"],
] as const;

const savingCategories = [
  ["cat_saving_general", "เงินเก็บ", "💰"],
  ["cat_saving_emergency", "Emergency Fund", "🛟"],
  ["cat_saving_travel", "Travel Saving", "✈️"],
  ["cat_saving_house", "House Saving", "🏠"],
] as const;

const dateInCurrentMonth = (day: number, hour: number, minute = 0) => {
  const date = new Date();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const defaultCategories = (): CategoryRecord[] => [
  ...expenseCategories.map(([id, name, icon], sortOrder) =>
    stamp({
      id,
      type: "expense" as const,
      name,
      icon,
      sortOrder,
      archived: false,
    }),
  ),
  ...incomeCategories.map(([id, name, icon], sortOrder) =>
    stamp({
      id,
      type: "income" as const,
      name,
      icon,
      sortOrder,
      archived: false,
    }),
  ),
  ...savingCategories.map(([id, name, icon], sortOrder) =>
    stamp({
      id,
      type: "saving" as const,
      name,
      icon,
      sortOrder,
      archived: false,
    }),
  ),
];

const defaultPaymentMethods = (): PaymentMethodRecord[] => [
  stamp({
    id: "pay_cash",
    name: "Cash",
    kind: "cash",
    isDefault: false,
    archived: false,
  }),
  stamp({
    id: "pay_bank",
    name: "Bank",
    kind: "bank",
    isDefault: true,
    archived: false,
  }),
  stamp({
    id: "pay_credit_card",
    name: "Credit Card",
    kind: "credit_card",
    isDefault: false,
    archived: false,
  }),
  stamp({
    id: "pay_promptpay",
    name: "PromptPay",
    kind: "promptpay",
    isDefault: false,
    archived: false,
  }),
  stamp({
    id: "pay_ewallet",
    name: "E-wallet",
    kind: "ewallet",
    isDefault: false,
    archived: false,
  }),
];

const defaultProjects = (): ProjectRecord[] => [
  stamp({
    id: "proj_japan_2026",
    name: "Japan Trip 2026",
    icon: "🇯🇵",
    budget: 80000,
    status: "Active",
  }),
];

const defaultPockets = (): SavingsPocketRecord[] => [
  stamp({
    id: "pocket_emergency",
    name: "Emergency Fund",
    icon: "🛟",
    targetAmount: 150000,
    openingBalance: 80000,
    linkedProjectId: null,
    archived: false,
  }),
  stamp({
    id: "pocket_japan",
    name: "Japan Trip",
    icon: "🇯🇵",
    targetAmount: 50000,
    openingBalance: 12000,
    linkedProjectId: "proj_japan_2026",
    archived: false,
  }),
  stamp({
    id: "pocket_house",
    name: "House",
    icon: "🏠",
    targetAmount: 500000,
    openingBalance: 120000,
    linkedProjectId: null,
    archived: false,
  }),
];

const defaultBudgets = (): BudgetRecord[] => {
  const month = currentMonth();
  return [
    stamp({
      id: `budget_${month}_overall`,
      month,
      categoryId: null,
      amount: 60000,
    }),
    stamp({
      id: `budget_${month}_cat_food`,
      month,
      categoryId: "cat_food",
      amount: 10000,
    }),
    stamp({
      id: `budget_${month}_cat_transport`,
      month,
      categoryId: "cat_transport",
      amount: 6000,
    }),
    stamp({
      id: `budget_${month}_cat_shopping`,
      month,
      categoryId: "cat_shopping",
      amount: 6000,
    }),
    stamp({
      id: `budget_${month}_cat_subscription`,
      month,
      categoryId: "cat_subscription",
      amount: 2000,
    }),
  ];
};

const defaultTransactions = (): TransactionRecord[] => [
  stamp({
    id: "tx_seed_salary",
    type: "income",
    amount: 65000,
    datetime: dateInCurrentMonth(1, 9),
    categoryId: "cat_salary",
    paymentMethodId: "pay_bank",
    note: "เงินเดือน",
    projectId: null,
    savingsPocketId: null,
    payer: null,
    owner: "Pao",
    split: null,
    recurringRuleId: null,
    recurringOccurrenceKey: null,
    recurringGenerated: false,
  }),
  stamp({
    id: "tx_seed_shabu",
    type: "expense",
    amount: 1200,
    datetime: dateInCurrentMonth(Math.max(1, new Date().getDate() - 1), 19, 42),
    categoryId: "cat_food",
    paymentMethodId: "pay_credit_card",
    note: "Shabu",
    projectId: null,
    savingsPocketId: null,
    payer: "Pao",
    owner: "Both",
    split: { mode: "half", paoShare: 600, timShare: 600 },
    recurringRuleId: null,
    recurringOccurrenceKey: null,
    recurringGenerated: false,
  }),
  stamp({
    id: "tx_seed_flight",
    type: "expense",
    amount: 18000,
    datetime: dateInCurrentMonth(3, 20),
    categoryId: "cat_transport",
    paymentMethodId: "pay_credit_card",
    note: "ตั๋วเครื่องบิน",
    projectId: "proj_japan_2026",
    savingsPocketId: null,
    payer: "Pao",
    owner: "Both",
    split: { mode: "half", paoShare: 9000, timShare: 9000 },
    recurringRuleId: null,
    recurringOccurrenceKey: null,
    recurringGenerated: false,
  }),
  stamp({
    id: "tx_seed_hotel",
    type: "expense",
    amount: 12000,
    datetime: dateInCurrentMonth(4, 21),
    categoryId: "cat_stay",
    paymentMethodId: "pay_bank",
    note: "Hotel Tokyo",
    projectId: "proj_japan_2026",
    savingsPocketId: null,
    payer: "Tim",
    owner: "Both",
    split: { mode: "half", paoShare: 6000, timShare: 6000 },
    recurringRuleId: null,
    recurringOccurrenceKey: null,
    recurringGenerated: false,
  }),
  stamp({
    id: "tx_seed_japan_saving",
    type: "saving",
    amount: 10000,
    datetime: dateInCurrentMonth(2, 9),
    categoryId: "cat_saving_travel",
    paymentMethodId: "pay_bank",
    note: "เก็บเงินเที่ยวญี่ปุ่น",
    projectId: "proj_japan_2026",
    savingsPocketId: "pocket_japan",
    payer: null,
    owner: "Pao",
    split: null,
    recurringRuleId: null,
    recurringOccurrenceKey: null,
    recurringGenerated: false,
  }),
];

const defaultRecurringRules = (): RecurringRuleRecord[] => {
  const nextNetflix = new Date();
  nextNetflix.setMonth(nextNetflix.getMonth() + 1, 10);
  nextNetflix.setHours(8, 0, 0, 0);

  const nextJapanSaving = new Date();
  nextJapanSaving.setMonth(nextJapanSaving.getMonth() + 1, 2);
  nextJapanSaving.setHours(9, 0, 0, 0);

  return [
    stamp({
      id: "rec_netflix",
      enabled: true,
      frequency: "monthly",
      nextRunAt: nextNetflix.toISOString(),
      template: {
        type: "expense",
        amount: 419,
        categoryId: "cat_subscription",
        paymentMethodId: "pay_credit_card",
        note: "Netflix",
        projectId: null,
        savingsPocketId: null,
        payer: "Pao",
        owner: "Both",
        split: { mode: "half", paoShare: 209.5, timShare: 209.5 },
      },
    }),
    stamp({
      id: "rec_japan_saving",
      enabled: true,
      frequency: "monthly",
      nextRunAt: nextJapanSaving.toISOString(),
      template: {
        type: "saving",
        amount: 10000,
        categoryId: "cat_saving_travel",
        paymentMethodId: "pay_bank",
        note: "เก็บเงินเที่ยวญี่ปุ่น",
        projectId: "proj_japan_2026",
        savingsPocketId: "pocket_japan",
        payer: null,
        owner: "Pao",
        split: null,
      },
    }),
  ];
};

const defaultSettings = (): AppSettingRecord[] => {
  const timestamp = now();
  return [
    { key: "theme", value: "light", updatedAt: timestamp },
    { key: "currency", value: "THB", updatedAt: timestamp },
    { key: "defaultPaymentMethodId", value: "pay_bank", updatedAt: timestamp },
    { key: "seededAt", value: timestamp, updatedAt: timestamp },
  ];
};

const missingById = <T extends { id: string }>(records: T[], existingIds: Set<string>) =>
  records.filter((record) => !existingIds.has(record.id));

const missingByKey = <T extends { key: string }>(records: T[], existingKeys: Set<string>) =>
  records.filter((record) => !existingKeys.has(record.key));

export async function seedDatabase() {
  const [
    categories,
    paymentMethods,
    projects,
    pockets,
    budgets,
    transactionsCount,
    recurringCount,
    settings,
  ] = await Promise.all([
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.projects.toArray(),
    db.savingsPockets.toArray(),
    db.budgets.toArray(),
    db.transactions.count(),
    db.recurringRules.count(),
    db.appSettings.toArray(),
  ]);

  const categorySeeds = missingById(
    defaultCategories(),
    new Set(categories.map((record) => record.id)),
  );
  const paymentSeeds = missingById(
    defaultPaymentMethods(),
    new Set(paymentMethods.map((record) => record.id)),
  );
  const projectSeeds = missingById(
    defaultProjects(),
    new Set(projects.map((record) => record.id)),
  );
  const pocketSeeds = missingById(
    defaultPockets(),
    new Set(pockets.map((record) => record.id)),
  );
  const budgetSeeds = missingById(
    defaultBudgets(),
    new Set(budgets.map((record) => record.id)),
  );
  const settingSeeds = missingByKey(
    defaultSettings(),
    new Set(settings.map((record) => record.key)),
  );

  await db.transaction(
    "rw",
    [
      db.categories,
      db.paymentMethods,
      db.projects,
      db.savingsPockets,
      db.budgets,
      db.transactions,
      db.recurringRules,
      db.appSettings,
    ],
    async () => {
      if (categorySeeds.length) await db.categories.bulkAdd(categorySeeds);
      if (paymentSeeds.length) await db.paymentMethods.bulkAdd(paymentSeeds);
      if (projectSeeds.length) await db.projects.bulkAdd(projectSeeds);
      if (pocketSeeds.length) await db.savingsPockets.bulkAdd(pocketSeeds);
      if (budgetSeeds.length) await db.budgets.bulkAdd(budgetSeeds);
      if (settingSeeds.length) await db.appSettings.bulkAdd(settingSeeds);
      if (transactionsCount === 0) {
        await db.transactions.bulkAdd(defaultTransactions());
      }
      if (recurringCount === 0) {
        await db.recurringRules.bulkAdd(defaultRecurringRules());
      }
    },
  );
}
