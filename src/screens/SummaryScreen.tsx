import { useAppData } from "@/db/hooks";
import { monthKey } from "@/domain/dates";
import {
  calculateCoupleBalance,
  categoryName,
  formatMoney,
  transactionsInCurrency,
  monthTransactions,
  pocketBalance,
  projectSpending,
  spendingByCategory,
  summarizeMonth,
} from "@/domain/finance";

export function SummaryScreen() {
  const data = useAppData();
  const bahtTransactions = transactionsInCurrency(data.transactions, "THB");
  const month = monthKey();
  const transactions = monthTransactions(bahtTransactions, month);
  const summary = summarizeMonth(transactions);
  const categoryRows = spendingByCategory(transactions, data.categories);
  const maxCategory = Math.max(1, ...categoryRows.map((row) => row.amount));
  const projectRows = data.projects
    .map((project) => ({
      project,
      amount: projectSpending(project.id, transactions),
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const maxProject = Math.max(1, ...projectRows.map((row) => row.amount));
  const ownerTotals = ["Pao", "Tim", "Both"].map((owner) => ({
    owner,
    amount: transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" && transaction.owner === owner,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0),
  }));
  const maxOwner = Math.max(1, ...ownerTotals.map((row) => row.amount));
  const balance = calculateCoupleBalance(bahtTransactions);

  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>สรุปเดือนนี้</h1>
          <p>แยกเงินที่ใช้ เงินที่เก็บ และ Project ออกจากกัน</p>
        </div>
      </div>

      <p className="muted">ยอดสรุปเป็นบาท (THB) • ดูยอดเยนและเงินคงเหลือแยกได้ใน Projects</p>
      <div className="grid metrics">
        <div className="card">
          <div className="label">รายรับ</div>
          <div className="value income">{formatMoney(summary.income)}</div>
        </div>
        <div className="card">
          <div className="label">รายจ่าย</div>
          <div className="value expense">{formatMoney(summary.expense)}</div>
        </div>
        <div className="card">
          <div className="label">เงินเก็บ</div>
          <div className="value saving">{formatMoney(summary.saving)}</div>
        </div>
        <div className="card">
          <div className="label">เหลือใช้</div>
          <div className="value">{formatMoney(summary.available)}</div>
        </div>
      </div>

      <div className="grid homegrid">
        <div className="grid">
          <div className="card">
            <div className="sect">
              <h3>ค่าใช้จ่ายตามหมวด</h3>
            </div>
            {categoryRows.length ? (
              categoryRows.map((row) => (
                <div className="chartrow" key={row.categoryId}>
                  <span>{row.category?.name ?? categoryName(data, row.categoryId)}</span>
                  <div className="bar">
                    <div style={{ width: `${(row.amount / maxCategory) * 100}%` }} />
                  </div>
                  <b>{formatMoney(row.amount)}</b>
                </div>
              ))
            ) : (
              <span className="muted">ยังไม่มีรายจ่าย</span>
            )}
          </div>

          <div className="card">
            <div className="sect">
              <h3>Project Spend เดือนนี้</h3>
            </div>
            {projectRows.length ? (
              projectRows.map(({ project, amount }) => (
                <div className="chartrow" key={project.id}>
                  <span>
                    {project.icon} {project.name}
                  </span>
                  <div className="bar">
                    <div style={{ width: `${(amount / maxProject) * 100}%` }} />
                  </div>
                  <b>{formatMoney(amount)}</b>
                </div>
              ))
            ) : (
              <span className="muted">เดือนนี้ยังไม่มี Project spend</span>
            )}
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="sect">
              <h3>Savings Pockets</h3>
              <span className="status">
                Savings rate {(summary.savingsRate * 100).toFixed(1)}%
              </span>
            </div>
            {data.savingsPockets.map((pocket) => {
              const balanceAmount = pocketBalance(pocket, data.transactions);
              const progress = pocket.targetAmount
                ? Math.min(100, (balanceAmount / pocket.targetAmount) * 100)
                : 0;
              return (
                <div className="detail-row" key={pocket.id}>
                  <div className="detail-head">
                    <div>
                      <b>
                        {pocket.icon} {pocket.name}
                      </b>
                      <small className="muted">
                        เป้าหมาย {formatMoney(pocket.targetAmount)}
                      </small>
                    </div>
                    <b>{formatMoney(balanceAmount)}</b>
                  </div>
                  <div className="progress saving-progress">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="sect">
              <h3>ค่าใช้จ่ายเป็นของใคร</h3>
            </div>
            {ownerTotals.map((row) => (
              <div className="chartrow" key={row.owner}>
                <span>
                  {row.owner === "Pao" ? "เปา" : row.owner === "Tim" ? "ติม" : "ทั้งคู่"}
                </span>
                <div className="bar">
                  <div style={{ width: `${(row.amount / maxOwner) * 100}%` }} />
                </div>
                <b>{formatMoney(row.amount)}</b>
              </div>
            ))}
            <hr className="line" />
            <div>
              {balance.net === 0
                ? "ไม่มีใครค้างใคร"
                : balance.net > 0
                  ? `ติมค้างเปา ${formatMoney(balance.net)}`
                  : `เปาค้างติม ${formatMoney(Math.abs(balance.net))}`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
