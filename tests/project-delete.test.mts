import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { db } from "../src/db/db.ts";
import { seedDatabase } from "../src/db/seed.ts";
import { deleteProject } from "../src/db/projects.ts";

test("delete detaches all references, preserves money and stays deleted after seeding", async () => {
  await seedDatabase();
  const id = "proj_japan_2026";
  await db.appSettings.put({ key: "defaultProjectId", value: id, updatedAt: "" });
  const expenses = await db.transactions.where("projectId").equals(id).toArray();
  assert.ok(expenses.length > 0);
  const pockets = await db.savingsPockets.where("linkedProjectId").equals(id).toArray();
  const rules = await db.recurringRules.filter((r) => r.template.projectId === id).toArray();
  assert.ok(pockets.length > 0 && rules.length > 0);
  await db.transactions.update(expenses[0].id, { currency: "JPY" });
  await deleteProject(id);
  assert.equal(await db.projects.get(id), undefined);
  assert.equal((await db.appSettings.get("defaultProjectId"))?.value, null);
  for (const original of expenses) {
    const saved = await db.transactions.get(original.id);
    assert.equal(saved?.projectId, null);
    assert.equal(saved?.amount, original.amount);
    assert.deepEqual(saved?.split, original.split);
  }
  assert.equal((await db.transactions.get(expenses[0].id))?.currency, "JPY");
  for (const original of pockets) {
    const saved = await db.savingsPockets.get(original.id);
    assert.equal(saved?.linkedProjectId, null);
    assert.equal(saved?.openingBalance, original.openingBalance);
  }
  for (const original of rules) {
    const saved = await db.recurringRules.get(original.id);
    assert.equal(saved?.template.projectId, null);
    assert.equal(saved?.template.amount, original.template.amount);
    assert.equal(saved?.nextRunAt, original.nextRunAt);
  }
  await seedDatabase();
  assert.equal(await db.projects.get(id), undefined);
  await db.appSettings.put({ key: "defaultProjectId", value: "unrelated", updatedAt: "" });
  await deleteProject(id);
  assert.equal((await db.appSettings.get("defaultProjectId"))?.value, "unrelated");
  await db.delete();
});
