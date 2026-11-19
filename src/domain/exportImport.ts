import { db } from "@/db/db";
import type { AppBackup } from "@/types/models";

export async function createJsonBackup(): Promise<AppBackup> {
  const [
    transactions,
    categories,
    paymentMethods,
    budgets,
    savingsPockets,
    projects,
    recurringRules,
    recurringOccurrences,
    appSettings,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.budgets.toArray(),
    db.savingsPockets.toArray(),
    db.projects.toArray(),
    db.recurringRules.toArray(),
    db.recurringOccurrences.toArray(),
    db.appSettings.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    paymentMethods,
    budgets,
    savingsPockets,
    projects,
    recurringRules,
    recurringOccurrences,
    appSettings,
  };
}

export async function restoreJsonBackup(backup: AppBackup) {
  if (!backup || backup.version !== 1 || !Array.isArray(backup.transactions)) {
    throw new Error("Invalid backup file.");
  }

  await db.transaction(
    "rw",
    [
      db.transactions,
      db.categories,
      db.paymentMethods,
      db.budgets,
      db.savingsPockets,
      db.projects,
      db.recurringRules,
      db.recurringOccurrences,
      db.appSettings,
    ],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.paymentMethods.clear(),
        db.budgets.clear(),
        db.savingsPockets.clear(),
        db.projects.clear(),
        db.recurringRules.clear(),
        db.recurringOccurrences.clear(),
        db.appSettings.clear(),
      ]);

      await Promise.all([
        db.transactions.bulkPut(backup.transactions),
        db.categories.bulkPut(backup.categories),
        db.paymentMethods.bulkPut(backup.paymentMethods),
        db.budgets.bulkPut(backup.budgets),
        db.savingsPockets.bulkPut(backup.savingsPockets),
        db.projects.bulkPut(backup.projects),
        db.recurringRules.bulkPut(backup.recurringRules),
        db.recurringOccurrences.bulkPut(backup.recurringOccurrences),
        db.appSettings.bulkPut(backup.appSettings),
      ]);
    },
  );
}

export function transactionsToCsv(
  transactions: AppBackup["transactions"],
  categories: AppBackup["categories"],
  paymentMethods: AppBackup["paymentMethods"],
  projects: AppBackup["projects"],
  pockets: AppBackup["savingsPockets"],
) {
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const paymentName = new Map(paymentMethods.map((method) => [method.id, method.name]));
  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const pocketName = new Map(pockets.map((pocket) => [pocket.id, pocket.name]));

  const rows = [
    [
      "datetime",
      "type",
      "amount",
      "currency",
      "category",
      "payment_method",
      "payer",
      "owner",
      "pao_share",
      "tim_share",
      "project",
      "savings_pocket",
      "recurring",
      "note",
    ],
    ...transactions.map((transaction) => [
      transaction.datetime,
      transaction.type,
      transaction.amount,
      transaction.currency ?? "THB",
      transaction.categoryId ? categoryName.get(transaction.categoryId) ?? "" : "",
      transaction.paymentMethodId
        ? paymentName.get(transaction.paymentMethodId) ?? ""
        : "",
      transaction.payer ?? "",
      transaction.owner,
      transaction.split?.paoShare ?? "",
      transaction.split?.timShare ?? "",
      transaction.projectId ? projectName.get(transaction.projectId) ?? "" : "",
      transaction.savingsPocketId
        ? pocketName.get(transaction.savingsPocketId) ?? ""
        : "",
      transaction.recurringGenerated ? "yes" : "no",
      transaction.note,
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
