import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import type { AppData } from "@/types/models";

const emptyData: AppData = {
  transactions: [],
  categories: [],
  paymentMethods: [],
  budgets: [],
  savingsPockets: [],
  projects: [],
  recurringRules: [],
  recurringOccurrences: [],
  appSettings: [],
};

export function useAppData() {
  return (
    useLiveQuery(
      async (): Promise<AppData> => ({
        transactions: await db.transactions.toArray(),
        categories: await db.categories.toArray(),
        paymentMethods: await db.paymentMethods.toArray(),
        budgets: await db.budgets.toArray(),
        savingsPockets: await db.savingsPockets.toArray(),
        projects: await db.projects.toArray(),
        recurringRules: await db.recurringRules.toArray(),
        recurringOccurrences: await db.recurringOccurrences.toArray(),
        appSettings: await db.appSettings.toArray(),
      }),
      [],
    ) ?? emptyData
  );
}
