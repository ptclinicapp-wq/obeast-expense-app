import assert from "node:assert/strict";
import test from "node:test";
import { defaultExpenseProject, formatMoney, projectSpending, summarizeMonth, transactionsInCurrency } from "../src/domain/finance.ts";
import type { AppData, TransactionRecord } from "../src/types/models.ts";

const base: TransactionRecord = {
  id: "legacy", type: "expense", amount: 500, datetime: "2026-11-19T00:00:00Z",
  note: "", owner: "Pao", recurringGenerated: false, createdAt: "", updatedAt: "",
};
const yen: TransactionRecord = { ...base, id: "yen", currency: "JPY", amount: 1200, projectId: "japan" };

test("legacy amounts stay THB and yen does not inflate the baht summary", () => {
  const transactions = [base, yen];
  assert.equal(summarizeMonth(transactionsInCurrency(transactions, "THB")).expense, 500);
  assert.equal(summarizeMonth(transactionsInCurrency(transactions, "JPY")).expense, 1200);
  assert.equal(10000 - projectSpending("japan", transactions), 8800);
  assert.notEqual(formatMoney(1200, "JPY"), formatMoney(1200));
});

test("default project supports none, missing and inactive projects", () => {
  const data: Pick<AppData, "projects" | "appSettings"> = {
    projects: [{ id: "japan", name: "Japan", icon: "", budget: 10000, currency: "JPY", status: "Active", createdAt: "", updatedAt: "" }],
    appSettings: [{ key: "defaultProjectId", value: "japan", updatedAt: "" }],
  };
  assert.equal(defaultExpenseProject(data)?.currency, "JPY");
  data.appSettings[0].value = null;
  assert.equal(defaultExpenseProject(data), undefined);
  data.appSettings[0].value = "missing";
  assert.equal(defaultExpenseProject(data), undefined);
  data.appSettings[0].value = "japan";
  for (const status of ["Archived", "Completed"] as const) {
    data.projects[0].status = status;
    assert.equal(defaultExpenseProject(data), undefined);
  }
});
