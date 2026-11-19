import { db } from "@/db/db";
import type { RecurringRuleRecord, TransactionRecord } from "@/types/models";

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function advanceDate(date: Date, frequency: RecurringRuleRecord["frequency"]) {
  const next = new Date(date);

  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  const originalDay = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDayOfMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(originalDay, lastDayOfMonth));
  return next;
}

export async function runRecurringCatchUp(now = new Date()) {
  const dueRules = await db.recurringRules
    .filter(
      (rule) => rule.enabled && new Date(rule.nextRunAt).getTime() <= now.getTime(),
    )
    .toArray();

  let generatedCount = 0;
  const updatedAt = new Date().toISOString();

  await db.transaction(
    "rw",
    db.recurringRules,
    db.recurringOccurrences,
    db.transactions,
    async () => {
      for (const rule of dueRules) {
        let nextRunAt = new Date(rule.nextRunAt);
        let guard = 0;

        while (nextRunAt.getTime() <= now.getTime() && guard < 1000) {
          const scheduledFor = nextRunAt.toISOString();
          const occurrenceKey = `${rule.id}:${scheduledFor}`;
          const existing = await db.recurringOccurrences
            .where("occurrenceKey")
            .equals(occurrenceKey)
            .first();

          if (!existing) {
            const transactionId = createId();
            const transaction: TransactionRecord = {
              ...rule.template,
              id: transactionId,
              datetime: scheduledFor,
              recurringRuleId: rule.id,
              recurringOccurrenceKey: occurrenceKey,
              recurringGenerated: true,
              createdAt: updatedAt,
              updatedAt,
            };

            await db.transactions.add(transaction);
            await db.recurringOccurrences.add({
              id: createId(),
              occurrenceKey,
              ruleId: rule.id,
              transactionId,
              scheduledFor,
              createdAt: updatedAt,
            });
            generatedCount += 1;
          }

          nextRunAt = advanceDate(nextRunAt, rule.frequency);
          guard += 1;
        }

        await db.recurringRules.update(rule.id, {
          nextRunAt: nextRunAt.toISOString(),
          updatedAt,
        });
      }
    },
  );

  return generatedCount;
}
