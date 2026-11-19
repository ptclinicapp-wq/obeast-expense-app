import { db } from "./db.ts";
import { nowIso } from "../domain/dates.ts";

// Detach references atomically; amounts, currencies and recurring schedules stay intact.
export async function deleteProject(projectId: string) {
  await db.transaction("rw", [db.projects, db.transactions, db.recurringRules, db.savingsPockets, db.appSettings], async () => {
    const updatedAt = nowIso();
    await db.transactions.where("projectId").equals(projectId).modify({ projectId: null, updatedAt });
    await db.savingsPockets.where("linkedProjectId").equals(projectId).modify({ linkedProjectId: null, updatedAt });
    await db.recurringRules.filter((rule) => rule.template.projectId === projectId).modify((rule) => {
      rule.template.projectId = null;
      rule.updatedAt = updatedAt;
    });
    const defaultProject = await db.appSettings.get("defaultProjectId");
    if (defaultProject?.value === projectId) {
      await db.appSettings.put({ key: "defaultProjectId", value: null, updatedAt });
    }
    await db.appSettings.put({ key: `deletedProject:${projectId}`, value: true, updatedAt });
    await db.projects.delete(projectId);
  });
}
