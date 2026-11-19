import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "@/db/hooks";
import { formatDate, monthKey } from "@/domain/dates";
import {
  budgetRows,
  calculateCoupleBalance,
  categoryName,
  debtTransactions,
  formatMoney,
  transactionsInCurrency,
  monthTransactions,
  pocketBalance,
  projectSaving,
  projectSpending,
  summarizeMonth,
} from "@/domain/finance";
import { TransactionRow } from "@/components/TransactionRow";

const frequencyLabel = {
  daily: "ทุกวัน",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
};

export function HomeScreen() {
  const data = useAppData();
  const bahtTransactions = transactionsInCurrency(data.transactions, "THB");
  const navigate = useNavigate();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const month = monthKey();
  const monthlyTransactions = monthTransactions(bahtTransactions, month);
  const summary = summarizeMonth(monthlyTransactions);
  const balance = calculateCoupleBalance(bahtTransactions);
  const debtRows = debtTransactions(bahtTransactions);
  const monthBudgets = data.budgets.filter((budget) => budget.month === month);
  const overallBudget = monthBudgets.find((budget) => !budget.categoryId)?.amount ?? 0;
  const budgetProgress = overallBudget
    ? Math.min(100, (summary.expense / overallBudget) * 100)
    : 0;
  const categoryBudgetRows = budgetRows(
    month,
    monthlyTransactions,
    data.budgets,
    data.categories,
  );
  const recent = [...data.transactions]
    .sort((a, b) => b.datetime.localeCompare(a.datetime))
    .slice(0, 6);
  const quick = recent
    .filter(
      (transaction, index, list) =>
        list.findIndex(
          (candidate) =>
            candidate.type === transaction.type &&
            candidate.note === transaction.note &&
            candidate.categoryId === transaction.categoryId,
        ) === index,
    )
    .slice(0, 4);

  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>สวัสดี 👋</h1>
          <p>
            {new Intl.DateTimeFormat("th-TH", {
              month: "long",
              year: "numeric",
            }).format(new Date())}
          </p>
        </div>
        <button className="soft" type="button" onClick={() => navigate("/add")}>
          ＋ เพิ่มรายการ
        </button>
      </div>

      <p className="muted">ยอดสรุปเป็นบาท (THB) • ดูยอดเยนและเงินคงเหลือแยกได้ใน Projects</p>
      <div className="grid metrics">
        <div className="card">
          <div className="label">เหลือใช้เดือนนี้</div>
          <div className="value">{formatMoney(summary.available)}</div>
        </div>
        <div className="card">
          <div className="label">รายรับ</div>
          <div className="value income">{formatMoney(summary.income)}</div>
        </div>
        <div className="card">
          <div className="label">รายจ่าย</div>
          <div className="value expense">{formatMoney(summary.expense)}</div>
        </div>
        <div className="card">
          <div className="label">
            เงินเก็บ{" "}
            <span className="muted rate">
              Savings rate {(summary.savingsRate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="value saving">{formatMoney(summary.saving)}</div>
        </div>
      </div>

      <div className="grid homegrid">
        <div className="grid">
          <div className="card">
            <div className="sect">
              <div>
                <h3>⚡ Quick Add</h3>
                <small className="muted">แตะเพื่อใช้รายการเดิมซ้ำ</small>
              </div>
            </div>
            <div className="quickrow">
              {quick.length ? (
                quick.map((transaction) => (
                  <button
                    className="quick"
                    key={transaction.id}
                    type="button"
                    onClick={() => navigate(`/add?copy=${transaction.id}`)}
                  >
                    <b>
                      {categoryName(data, transaction.categoryId) || "รายการ"}{" "}
                      {transaction.note}
                    </b>
                    <small>{formatMoney(transaction.amount, transaction.currency)}</small>
                  </button>
                ))
              ) : (
                <span className="muted">ยังไม่มีรายการสำหรับ Quick Add</span>
              )}
            </div>
          </div>

          <div className="card">
            <div className="sect">
              <div>
                <h3>💰 Savings Pockets</h3>
                <small className="muted">เงินเก็บไม่ถูกนับเป็นรายจ่าย</small>
              </div>
              <button className="soft" type="button" onClick={() => navigate("/settings")}>
                จัดการ
              </button>
            </div>
            <div className="pocket-grid">
              {data.savingsPockets
                .filter((pocket) => !pocket.archived)
                .map((pocket) => {
                  const balanceAmount = pocketBalance(pocket, data.transactions);
                  const progress = pocket.targetAmount
                    ? Math.min(100, (balanceAmount / pocket.targetAmount) * 100)
                    : 0;
                  return (
                    <div className="pocket" key={pocket.id}>
                      <div className="pocket-top">
                        <b>
                          {pocket.icon} {pocket.name}
                        </b>
                        <span className="status">{progress.toFixed(0)}%</span>
                      </div>
                      <div className="big">{formatMoney(balanceAmount)}</div>
                      <small>เป้าหมาย {formatMoney(pocket.targetAmount)}</small>
                      <div className="progress saving-progress">
                        <div style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="card">
            <div className="sect">
              <div>
                <h3>🔁 รายการประจำ</h3>
                <small className="muted">ทั้งรายจ่ายและเงินเก็บ</small>
              </div>
              <button className="soft" type="button" onClick={() => navigate("/settings")}>
                จัดการ
              </button>
            </div>
            {data.recurringRules
              .filter((rule) => rule.enabled)
              .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))
              .slice(0, 4)
              .map((rule) => (
                <div className="setrow" key={rule.id}>
                  <div>
                    <b>
                      ↻ {rule.template.note || categoryName(data, rule.template.categoryId)}
                    </b>
                    <small className="muted">
                      {frequencyLabel[rule.frequency]} • ครั้งถัดไป{" "}
                      {formatDate(rule.nextRunAt)}
                    </small>
                  </div>
                  <b className={rule.template.type === "saving" ? "saving" : "expense"}>
                    {formatMoney(rule.template.amount, rule.template.currency)}
                  </b>
                </div>
              ))}
          </div>

          <div className="card">
            <div className="sect">
              <h3>รายการล่าสุด</h3>
              <button className="soft" type="button" onClick={() => navigate("/history")}>
                ดูทั้งหมด
              </button>
            </div>
            {recent.map((transaction) => (
              <TransactionRow
                compact
                data={data}
                key={transaction.id}
                transaction={transaction}
              />
            ))}
          </div>
        </div>

        <div className="grid">
          <div
            className={`card expand-card card-button ${budgetOpen ? "expanded" : ""}`}
            onClick={() => setBudgetOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setBudgetOpen((value) => !value);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="sect">
              <div>
                <h3>งบรายจ่ายเดือนนี้</h3>
                <small className="muted">แตะเพื่อดูรายละเอียดตามหมวด</small>
              </div>
              <span className="chev">⌄</span>
            </div>
            <div className="budget-line">
              <b>{formatMoney(summary.expense)}</b>
              <span className="muted">จาก {formatMoney(overallBudget)}</span>
            </div>
            <div className="progress">
              <div style={{ width: `${budgetProgress}%` }} />
            </div>
            <small className="muted">
              {overallBudget
                ? `เหลือ ${formatMoney(Math.max(0, overallBudget - summary.expense))} • ใช้ไป ${budgetProgress.toFixed(0)}%`
                : "ยังไม่ได้ตั้งงบ"}
            </small>
            {budgetOpen && (
              <div className="detail">
                <div className="mini3">
                  <div>
                    <small>ใช้ไป</small>
                    <b>{formatMoney(summary.expense)}</b>
                  </div>
                  <div>
                    <small>เหลือ</small>
                    <b>{formatMoney(Math.max(0, overallBudget - summary.expense))}</b>
                  </div>
                  <div>
                    <small>เกินงบ</small>
                    <b>{categoryBudgetRows.filter((row) => row.over > 0).length} หมวด</b>
                  </div>
                </div>
                {categoryBudgetRows.map((row) => (
                  <div
                    className="detail-row clickable-row"
                    key={row.categoryId}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/history?category=${row.categoryId}`);
                    }}
                  >
                    <div className="detail-head">
                      <div>
                        <b>{row.category?.name ?? "ไม่ระบุหมวด"}</b>
                        <small className="muted">
                          {row.budget ? `งบ ${formatMoney(row.budget)}` : "ยังไม่ตั้งงบหมวดนี้"}
                        </small>
                      </div>
                      <div className="detail-right">
                        <b className={row.over ? "expense" : ""}>
                          {formatMoney(row.actual)}
                        </b>
                        <small className="muted">
                          {row.budget
                            ? row.over
                              ? `เกิน ${formatMoney(row.over)}`
                              : `เหลือ ${formatMoney(row.remaining)}`
                            : "ยอดใช้จริง"}
                        </small>
                      </div>
                    </div>
                    {row.budget > 0 && (
                      <div className={`progress ${row.over ? "over" : ""}`}>
                        <div style={{ width: `${row.progress}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className={`card debt expand-card card-button ${debtOpen ? "expanded" : ""}`}
            onClick={() => setDebtOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setDebtOpen((value) => !value);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="sect">
              <div>
                <h3>ระหว่างเปา & ติม</h3>
                <small className="muted-white">แตะเพื่อเช็ก Transaction ต้นทาง</small>
              </div>
              <span className="chev">⌄</span>
            </div>
            <div>{balance.net > 0 ? "ติมค้างเปา" : balance.net < 0 ? "เปาค้างติม" : "ยอดสุทธิ"}</div>
            <div className="debt-amount">{formatMoney(Math.abs(balance.net))}</div>
            <small className="muted-white">
              {balance.net === 0 ? "ไม่มีใครค้างใคร" : "แตะเพื่อดูรายการต้นทางและยอดหักลบ"}
            </small>
            {debtOpen && (
              <div className="detail">
                <div className="mini3">
                  <div>
                    <small>ติมค้างเปา</small>
                    <b>{formatMoney(balance.timOwesPao)}</b>
                  </div>
                  <div>
                    <small>เปาค้างติม</small>
                    <b>{formatMoney(balance.paoOwesTim)}</b>
                  </div>
                  <div>
                    <small>ยอดสุทธิ</small>
                    <b>{formatMoney(Math.abs(balance.net))}</b>
                  </div>
                </div>
                {debtRows.map(({ transaction, timOwesPao, paoOwesTim }) => {
                  const direction = timOwesPao > 0 ? "ติมค้างเปา" : "เปาค้างติม";
                  const owed = Math.max(timOwesPao, paoOwesTim);
                  return (
                    <div className="debt-tx" key={transaction.id}>
                      <div className="ico">🧾</div>
                      <div>
                        <b>{transaction.note || categoryName(data, transaction.categoryId)}</b>
                        <small>
                          {direction} • {formatMoney(owed)}
                        </small>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/add?edit=${transaction.id}`);
                        }}
                      >
                        ดูรายการ
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="sect">
              <div>
                <h3>✈️ Active Projects</h3>
                <small className="muted">ค่าใช้จ่ายพิเศษแยกจากชีวิตประจำวัน</small>
              </div>
              <button className="soft" type="button" onClick={() => navigate("/projects")}>
                ดูทั้งหมด
              </button>
            </div>
            {data.projects
              .filter((project) => project.status === "Active")
              .slice(0, 3)
              .map((project) => {
                const spent = projectSpending(project.id, data.transactions);
                const saved = projectSaving(project.id, data.savingsPockets, data.transactions);
                const progress = project.budget
                  ? Math.min(100, (spent / project.budget) * 100)
                  : 0;
                return (
                  <div className="detail-row" key={project.id}>
                    <div className="detail-head">
                      <div>
                        <b>
                          {project.icon} {project.name}
                        </b>
                        <small className="muted">
                          ใช้ {formatMoney(spent, project.currency)} • เก็บไว้ {formatMoney(saved)}
                        </small>
                      </div>
                      <div className="detail-right">
                        <b>{progress.toFixed(0)}%</b>
                        <small className="muted">จาก {formatMoney(project.budget, project.currency)}</small>
                      </div>
                    </div>
                    <div className="progress">
                      <div style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
