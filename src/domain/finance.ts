import type {
  AppData,
  Currency,
  BudgetRecord,
  CategoryRecord,
  ProjectRecord,
  SavingsPocketRecord,
  TransactionRecord,
} from "@/types/models";
import { transactionMonthKey } from "./dates.ts";

export const formatMoney = (value: number, currency: Currency = "THB") =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(Number.isFinite(value) ? value : 0);

export function transactionsInCurrency(transactions: TransactionRecord[], currency: Currency) {
  return transactions.filter((item) => (item.currency ?? "THB") === currency);
}

export function defaultExpenseProject(data: Pick<AppData, "appSettings" | "projects">) {
  const id = data.appSettings.find((item) => item.key === "defaultProjectId")?.value;
  return data.projects.find((item) => item.id === id && item.status !== "Archived" && item.status !== "Completed");
}

export function calculateCoupleBalance(transactions: TransactionRecord[]) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (balance, transaction) => {
        const paoShare = transaction.split?.paoShare ?? 0;
        const timShare = transaction.split?.timShare ?? 0;

        if (transaction.payer === "Pao" && timShare > 0) {
          balance.timOwesPao += timShare;
        }

        if (transaction.payer === "Tim" && paoShare > 0) {
          balance.paoOwesTim += paoShare;
        }

        balance.net = balance.timOwesPao - balance.paoOwesTim;
        return balance;
      },
      { timOwesPao: 0, paoOwesTim: 0, net: 0 },
    );
}

export function summarizeMonth(transactions: TransactionRecord[]) {
  const summary = transactions.reduce(
    (total, transaction) => {
      if (transaction.type === "income") total.income += transaction.amount;
      if (transaction.type === "expense") total.expense += transaction.amount;
      if (transaction.type === "saving") total.saving += transaction.amount;
      return total;
    },
    { income: 0, expense: 0, saving: 0 },
  );

  return {
    ...summary,
    available: summary.income - summary.expense - summary.saving,
    savingsRate: summary.income > 0 ? summary.saving / summary.income : 0,
  };
}

export function monthTransactions(transactions: TransactionRecord[], month: string) {
  return transactions
    .filter((transaction) => transactionMonthKey(transaction.datetime) === month)
    .sort((a, b) => b.datetime.localeCompare(a.datetime));
}

export function categoryById(categories: CategoryRecord[], id?: string | null) {
  return categories.find((category) => category.id === id);
}

export function projectById(projects: ProjectRecord[], id?: string | null) {
  return projects.find((project) => project.id === id);
}

export function pocketById(pockets: SavingsPocketRecord[], id?: string | null) {
  return pockets.find((pocket) => pocket.id === id);
}

export function paymentName(data: AppData, id?: string | null) {
  return data.paymentMethods.find((method) => method.id === id)?.name ?? "";
}

export function categoryName(data: AppData, id?: string | null) {
  return data.categories.find((category) => category.id === id)?.name ?? "";
}

export function categoryIcon(data: AppData, id?: string | null) {
  return data.categories.find((category) => category.id === id)?.icon ?? "🧾";
}

export function projectName(data: AppData, id?: string | null) {
  return data.projects.find((project) => project.id === id)?.name ?? "";
}

export function projectIcon(data: AppData, id?: string | null) {
  return data.projects.find((project) => project.id === id)?.icon ?? "▣";
}

export function pocketBalance(
  pocket: SavingsPocketRecord,
  transactions: TransactionRecord[],
) {
  return (
    pocket.openingBalance +
    transactions
      .filter(
        (transaction) =>
          transaction.type === "saving" &&
          transaction.savingsPocketId === pocket.id && (transaction.currency ?? "THB") === "THB",
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
}

export function projectSpending(
  projectId: string,
  transactions: TransactionRecord[],
) {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.projectId === projectId,
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function projectSaving(
  projectId: string,
  pockets: SavingsPocketRecord[],
  transactions: TransactionRecord[],
) {
  return pockets
    .filter((pocket) => pocket.linkedProjectId === projectId)
    .reduce((sum, pocket) => sum + pocketBalance(pocket, transactions), 0);
}

export function spendingByCategory(
  transactions: TransactionRecord[],
  categories: CategoryRecord[],
) {
  const totals = new Map<string, number>();

  transactions
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const key = transaction.categoryId ?? "uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + transaction.amount);
    });

  return [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      category: categories.find((item) => item.id === categoryId),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function budgetRows(
  month: string,
  transactions: TransactionRecord[],
  budgets: BudgetRecord[],
  categories: CategoryRecord[],
) {
  const monthBudget = budgets.filter((budget) => budget.month === month);
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const categoryIds = new Set([
    ...monthBudget
      .map((budget) => budget.categoryId)
      .filter((id): id is string => Boolean(id)),
    ...expenseTransactions
      .map((transaction) => transaction.categoryId)
      .filter((id): id is string => Boolean(id)),
  ]);

  return [...categoryIds]
    .map((categoryId) => {
      const budget = monthBudget.find((item) => item.categoryId === categoryId);
      const actual = expenseTransactions
        .filter((transaction) => transaction.categoryId === categoryId)
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const limit = budget?.amount ?? 0;
      const remaining = Math.max(0, limit - actual);
      const over = limit > 0 ? Math.max(0, actual - limit) : 0;
      const progress = limit > 0 ? Math.min(100, (actual / limit) * 100) : 0;

      return {
        categoryId,
        category: categories.find((item) => item.id === categoryId),
        budget: limit,
        actual,
        remaining,
        over,
        progress,
      };
    })
    .sort((a, b) => b.over - a.over || b.actual - a.actual);
}

export function debtTransactions(transactions: TransactionRecord[]) {
  return transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => ({
      transaction,
      timOwesPao:
        transaction.payer === "Pao" ? transaction.split?.timShare ?? 0 : 0,
      paoOwesTim:
        transaction.payer === "Tim" ? transaction.split?.paoShare ?? 0 : 0,
    }))
    .filter((row) => row.timOwesPao > 0 || row.paoOwesTim > 0)
    .sort((a, b) => b.transaction.datetime.localeCompare(a.transaction.datetime));
}
