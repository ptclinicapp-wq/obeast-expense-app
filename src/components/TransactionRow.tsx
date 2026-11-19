import { useNavigate } from "react-router-dom";
import type { AppData, TransactionRecord } from "@/types/models";
import {
  categoryIcon,
  categoryName,
  formatMoney,
  paymentName,
  pocketById,
  projectById,
} from "@/domain/finance";
import { formatDateTime } from "@/domain/dates";
import { db } from "@/db/db";

interface TransactionRowProps {
  transaction: TransactionRecord;
  data: AppData;
  actions?: boolean;
  compact?: boolean;
}

const who = (value: string) =>
  value === "Pao" ? "เปา" : value === "Tim" ? "ติม" : "ทั้งคู่";

export function TransactionRow({
  transaction,
  data,
  actions = false,
  compact = false,
}: TransactionRowProps) {
  const navigate = useNavigate();
  const project = projectById(data.projects, transaction.projectId);
  const pocket = pocketById(data.savingsPockets, transaction.savingsPocketId);
  const sign =
    transaction.type === "income" ? "+" : transaction.type === "saving" ? "→" : "-";
  const amountClass =
    transaction.type === "income"
      ? "income"
      : transaction.type === "saving"
        ? "saving"
        : "expense";

  const editTransaction = () => navigate(`/add?edit=${transaction.id}`);

  const deleteTransaction = async () => {
    if (!window.confirm("ลบรายการนี้?")) return;
    await db.transactions.delete(transaction.id);
  };

  return (
    <div className={`tx ${compact ? "tx-compact" : ""}`}>
      <div className="ico">{categoryIcon(data, transaction.categoryId)}</div>
      <button className="tx-main" type="button" onClick={editTransaction}>
        <b>
          {transaction.note || categoryName(data, transaction.categoryId) || "รายการ"}
          {transaction.recurringGenerated && <span className="badge">↻ Recurring</span>}
          {project && (
            <span className="badge project-badge">
              {project.icon} {project.name}
            </span>
          )}
          {pocket && (
            <span className="badge saving-badge">
              {pocket.icon} {pocket.name}
            </span>
          )}
        </b>
        <small>
          {transaction.type === "saving"
            ? "เงินเก็บ"
            : categoryName(data, transaction.categoryId) || "ไม่ระบุหมวด"}
          {" • "}
          {who(transaction.owner)}
          {" • "}
          {paymentName(data, transaction.paymentMethodId) || "ไม่ระบุวิธีชำระ"}
          {" • "}
          {formatDateTime(transaction.datetime)}
        </small>
      </button>
      <div className={`amt ${amountClass}`}>
        {sign}
        {formatMoney(transaction.amount, transaction.currency)}
        {actions && (
          <div className="tx-actions">
            <button className="soft" type="button" onClick={editTransaction}>
              แก้ไข
            </button>
            <button className="danger" type="button" onClick={deleteTransaction}>
              ลบ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
