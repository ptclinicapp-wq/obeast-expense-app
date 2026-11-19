import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "@/db/hooks";
import { TransactionRow } from "@/components/TransactionRow";
import type { TransactionOwner, TransactionType } from "@/types/models";

export function HistoryScreen() {
  const data = useAppData();
  const [params, setParams] = useSearchParams();
  const search = params.get("q") ?? "";
  const type = (params.get("type") ?? "all") as TransactionType | "all";
  const owner = (params.get("owner") ?? "all") as TransactionOwner | "all";
  const project = params.get("project") ?? "all";
  const category = params.get("category") ?? "all";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  const transactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return [...data.transactions]
      .filter((transaction) => {
        if (type !== "all" && transaction.type !== type) return false;
        if (owner !== "all" && transaction.owner !== owner) return false;
        if (category !== "all" && transaction.categoryId !== category) return false;
        if (project === "none" && transaction.projectId) return false;
        if (project !== "all" && project !== "none" && transaction.projectId !== project) {
          return false;
        }
        if (!normalizedSearch) return true;

        const categoryName =
          data.categories.find((item) => item.id === transaction.categoryId)?.name ?? "";
        const projectName =
          data.projects.find((item) => item.id === transaction.projectId)?.name ?? "";
        const pocketName =
          data.savingsPockets.find((item) => item.id === transaction.savingsPocketId)
            ?.name ?? "";
        const paymentName =
          data.paymentMethods.find((item) => item.id === transaction.paymentMethodId)
            ?.name ?? "";

        return `${transaction.note} ${categoryName} ${projectName} ${pocketName} ${paymentName}`
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => b.datetime.localeCompare(a.datetime));
  }, [category, data, owner, project, search, type]);

  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>รายการทั้งหมด</h1>
          <p>ค้นหา กรอง และแก้ไขย้อนหลังได้</p>
        </div>
      </div>

      <div className="filters">
        <input
          className="input"
          placeholder="ค้นหา Netflix, Japan..."
          value={search}
          onChange={(event) => setFilter("q", event.target.value)}
        />
        <select
          className="input"
          value={type}
          onChange={(event) => setFilter("type", event.target.value)}
        >
          <option value="all">ทุกประเภท</option>
          <option value="expense">รายจ่าย</option>
          <option value="income">รายรับ</option>
          <option value="saving">เงินเก็บ</option>
        </select>
        <select
          className="input"
          value={owner}
          onChange={(event) => setFilter("owner", event.target.value)}
        >
          <option value="all">ทุกคน</option>
          <option value="Pao">เปา</option>
          <option value="Tim">ติม</option>
          <option value="Both">ทั้งคู่</option>
        </select>
        <select
          className="input"
          value={category}
          onChange={(event) => setFilter("category", event.target.value)}
        >
          <option value="all">ทุกหมวด</option>
          {data.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.icon} {item.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={project}
          onChange={(event) => setFilter("project", event.target.value)}
        >
          <option value="all">ทุก Project</option>
          <option value="none">ไม่มี Project</option>
          {data.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.icon} {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        {transactions.length ? (
          transactions.map((transaction) => (
            <TransactionRow
              actions
              data={data}
              key={transaction.id}
              transaction={transaction}
            />
          ))
        ) : (
          <div className="empty-state">ไม่พบรายการ</div>
        )}
      </div>
    </section>
  );
}
