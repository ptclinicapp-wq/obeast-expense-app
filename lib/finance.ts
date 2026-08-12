export type Person = "me" | "partner";
export type TransactionType = "expense" | "income";
export type SplitMode = "equal" | "mine" | "partner" | "custom";

export interface SplitDetail {
  person: Person;
  label: string;
  amount: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  date: string;
  occurredAt?: string;
  paidBy: Person;
  splitMode: SplitMode;
  myShare: number;
  partnerShare: number;
  splitDetails?: SplitDetail[];
  note: string;
  createdAt: string;
}

export interface AppSettings {
  myName: string;
  partnerName: string;
}

export const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateShares(
  amount: number,
  mode: SplitMode,
  customMyShare = 0,
) {
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  let myShare = safeAmount;

  if (mode === "equal") myShare = roundMoney(safeAmount / 2);
  if (mode === "partner") myShare = 0;
  if (mode === "custom") {
    myShare = Math.min(safeAmount, Math.max(0, customMyShare));
  }

  return {
    myShare: roundMoney(myShare),
    partnerShare: roundMoney(safeAmount - myShare),
  };
}

export function transactionDebt(transaction: Transaction) {
  if (transaction.type !== "expense") return 0;
  return transaction.paidBy === "me"
    ? transaction.partnerShare
    : -transaction.myShare;
}

export function summarize(transactions: Transaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.type === "income") {
        summary.income += transaction.amount;
        return summary;
      }

      summary.expense += transaction.amount;
      summary.myShare += transaction.myShare;
      summary.partnerShare += transaction.partnerShare;
      summary.netDebt += transactionDebt(transaction);
      return summary;
    },
    { income: 0, expense: 0, myShare: 0, partnerShare: 0, netDebt: 0 },
  );
}

export const monthKey = (date: string) => date.slice(0, 7);

function isSplitDetail(value: unknown): value is SplitDetail {
  if (!value || typeof value !== "object") return false;
  const detail = value as Partial<SplitDetail>;
  return (
    (detail.person === "me" || detail.person === "partner") &&
    typeof detail.label === "string" &&
    typeof detail.amount === "number" &&
    Number.isFinite(detail.amount) &&
    detail.amount > 0
  );
}

export function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Transaction>;
  const hasValidShape =
    typeof item.id === "string" &&
    (item.type === "expense" || item.type === "income") &&
    typeof item.title === "string" &&
    typeof item.category === "string" &&
    typeof item.amount === "number" &&
    Number.isFinite(item.amount) &&
    item.amount > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date ?? "") &&
    (item.occurredAt === undefined ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(item.occurredAt)) &&
    (item.paidBy === "me" || item.paidBy === "partner") &&
    ["equal", "mine", "partner", "custom"].includes(item.splitMode ?? "") &&
    typeof item.myShare === "number" &&
    Number.isFinite(item.myShare) &&
    item.myShare >= 0 &&
    typeof item.partnerShare === "number" &&
    Number.isFinite(item.partnerShare) &&
    item.partnerShare >= 0 &&
    (item.splitDetails === undefined ||
      (Array.isArray(item.splitDetails) &&
        item.splitDetails.every(isSplitDetail))) &&
    typeof item.note === "string" &&
    typeof item.createdAt === "string";

  if (!hasValidShape) return false;
  const transaction = item as Transaction;
  if (transaction.type === "income") {
    return transaction.myShare === 0 && transaction.partnerShare === 0;
  }
  return (
    Math.abs(
      transaction.myShare + transaction.partnerShare - transaction.amount,
    ) < 0.011
  );
}
