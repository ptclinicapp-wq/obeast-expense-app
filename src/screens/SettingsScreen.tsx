import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/db/db";
import { useAppData } from "@/db/hooks";
import { Modal } from "@/components/Modal";
import { createJsonBackup, restoreJsonBackup, transactionsToCsv } from "@/domain/exportImport";
import { createId, formatDateTime, monthKey, nowIso } from "@/domain/dates";
import { categoryName, formatMoney, pocketBalance } from "@/domain/finance";
import type {
  PaymentMethodKind,
  PaymentMethodRecord,
  ProjectRecord,
  SavingsPocketRecord,
} from "@/types/models";

type ModalName = "payment" | "pocket" | "budget" | null;

interface PaymentDraft {
  name: string;
  kind: PaymentMethodKind;
}

interface PocketDraft {
  name: string;
  icon: string;
  targetAmount: string;
  openingBalance: string;
  linkedProjectId: string;
}

const paymentKinds: [PaymentMethodKind, string][] = [
  ["cash", "Cash"],
  ["bank", "Bank"],
  ["credit_card", "Credit Card"],
  ["promptpay", "PromptPay"],
  ["ewallet", "E-wallet"],
  ["other", "Other"],
];

const frequencyLabel = {
  daily: "ทุกวัน",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
};

const download = (content: string, filename: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function SettingsScreen() {
  const data = useAppData();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalName>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentMethodRecord | null>(
    null,
  );
  const [editingPocket, setEditingPocket] = useState<SavingsPocketRecord | null>(
    null,
  );
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    name: "",
    kind: "bank",
  });
  const [pocketDraft, setPocketDraft] = useState<PocketDraft>({
    name: "",
    icon: "💰",
    targetAmount: "50000",
    openingBalance: "0",
    linkedProjectId: "",
  });
  const [budgetDraft, setBudgetDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const theme = data.appSettings.find((setting) => setting.key === "theme")?.value;
  const currentMonth = monthKey();
  const activePaymentMethods = data.paymentMethods.filter((method) => !method.archived);
  const activeExpenseCategories = data.categories
    .filter((category) => category.type === "expense" && !category.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const openPaymentModal = (payment?: PaymentMethodRecord) => {
    setEditingPayment(payment ?? null);
    setPaymentDraft({
      name: payment?.name ?? "",
      kind: payment?.kind ?? "bank",
    });
    setError("");
    setModal("payment");
  };

  const openPocketModal = (pocket?: SavingsPocketRecord) => {
    setEditingPocket(pocket ?? null);
    setPocketDraft({
      name: pocket?.name ?? "",
      icon: pocket?.icon ?? "💰",
      targetAmount: String(pocket?.targetAmount ?? 50000),
      openingBalance: String(pocket?.openingBalance ?? 0),
      linkedProjectId: pocket?.linkedProjectId ?? "",
    });
    setError("");
    setModal("pocket");
  };

  const openBudgetModal = () => {
    const monthBudgets = data.budgets.filter((budget) => budget.month === currentMonth);
    const next: Record<string, string> = {
      overall: String(monthBudgets.find((budget) => !budget.categoryId)?.amount ?? 0),
    };
    activeExpenseCategories.forEach((category) => {
      next[category.id] = String(
        monthBudgets.find((budget) => budget.categoryId === category.id)?.amount ?? "",
      );
    });
    setBudgetDraft(next);
    setError("");
    setModal("budget");
  };

  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    const name = paymentDraft.name.trim();
    if (!name) {
      setError("กรุณาใส่ชื่อช่องทางชำระเงิน");
      return;
    }

    const timestamp = nowIso();
    await db.paymentMethods.put({
      id: editingPayment?.id ?? createId(),
      name,
      kind: paymentDraft.kind,
      isDefault: editingPayment?.isDefault ?? activePaymentMethods.length === 0,
      archived: false,
      createdAt: editingPayment?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    setModal(null);
  };

  const archivePayment = async (payment: PaymentMethodRecord) => {
    if (payment.isDefault) {
      setToast("เปลี่ยน default ก่อนลบ");
      return;
    }
    await db.paymentMethods.update(payment.id, {
      archived: true,
      updatedAt: nowIso(),
    });
  };

  const setDefaultPayment = async (payment: PaymentMethodRecord) => {
    await db.transaction("rw", [db.paymentMethods], async () => {
      await Promise.all(
        data.paymentMethods.map((method) =>
          db.paymentMethods.update(method.id, {
            isDefault: method.id === payment.id,
            updatedAt: nowIso(),
          }),
        ),
      );
    });
  };

  const savePocket = async (event: FormEvent) => {
    event.preventDefault();
    const name = pocketDraft.name.trim();
    const targetAmount = Number(pocketDraft.targetAmount || 0);
    const openingBalance = Number(pocketDraft.openingBalance || 0);

    if (!name) {
      setError("กรุณาใส่ชื่อ Savings Pocket");
      return;
    }

    if (
      !Number.isFinite(targetAmount) ||
      targetAmount < 0 ||
      !Number.isFinite(openingBalance)
    ) {
      setError("ยอดเงินต้องเป็นตัวเลข");
      return;
    }

    const timestamp = nowIso();
    await db.savingsPockets.put({
      id: editingPocket?.id ?? createId(),
      name,
      icon: pocketDraft.icon || "💰",
      targetAmount,
      openingBalance,
      linkedProjectId: pocketDraft.linkedProjectId || null,
      archived: false,
      createdAt: editingPocket?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    setModal(null);
  };

  const archivePocket = async (pocket: SavingsPocketRecord) => {
    await db.savingsPockets.update(pocket.id, {
      archived: true,
      updatedAt: nowIso(),
    });
  };

  const saveBudget = async (event: FormEvent) => {
    event.preventDefault();
    const timestamp = nowIso();
    const records = [
      {
        id: `budget_${currentMonth}_overall`,
        month: currentMonth,
        categoryId: null,
        amount: Number(budgetDraft.overall || 0),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      ...activeExpenseCategories
        .map((category) => ({
          id: `budget_${currentMonth}_${category.id}`,
          month: currentMonth,
          categoryId: category.id,
          amount: Number(budgetDraft[category.id] || 0),
          createdAt: timestamp,
          updatedAt: timestamp,
        }))
        .filter((budget) => budget.amount > 0),
    ];

    if (records.some((record) => !Number.isFinite(record.amount) || record.amount < 0)) {
      setError("งบต้องเป็นตัวเลขที่ไม่ติดลบ");
      return;
    }

    await db.transaction("rw", [db.budgets], async () => {
      await db.budgets.where("month").equals(currentMonth).delete();
      await db.budgets.bulkPut(records);
    });
    setModal(null);
  };

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    await db.appSettings.put({
      key: "theme",
      value: nextTheme,
      updatedAt: nowIso(),
    });
  };

  const exportCsv = async () => {
    const backup = await createJsonBackup();
    download(
      `\ufeff${transactionsToCsv(
        backup.transactions,
        backup.categories,
        backup.paymentMethods,
        backup.projects,
        backup.savingsPockets,
      )}`,
      "pao-tim-money.csv",
      "text/csv;charset=utf-8",
    );
  };

  const exportJson = async () => {
    const backup = await createJsonBackup();
    download(
      JSON.stringify(backup, null, 2),
      "pao-tim-money-backup.json",
      "application/json",
    );
  };

  const restoreJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      await restoreJsonBackup(parsed);
      const restoredTheme = parsed.appSettings?.find(
        (setting: { key?: string }) => setting.key === "theme",
      )?.value;
      document.documentElement.setAttribute(
        "data-theme",
        restoredTheme === "dark" ? "dark" : "light",
      );
      setToast("Restore สำเร็จ");
    } catch {
      setToast("ไฟล์ไม่ถูกต้อง");
    } finally {
      event.target.value = "";
    }
  };

  const toggleRecurring = async (id: string, enabled: boolean) => {
    await db.recurringRules.update(id, { enabled, updatedAt: nowIso() });
  };

  const deleteRecurring = async (id: string) => {
    if (!window.confirm("ลบรายการประจำนี้?")) return;
    await db.recurringRules.delete(id);
  };

  const projectById = (id?: string | null): ProjectRecord | undefined =>
    data.projects.find((project) => project.id === id);

  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>ตั้งค่า</h1>
          <p>Local-first • ไม่มี account • ไม่มี sync ระหว่างเปา/ติม</p>
        </div>
      </div>

      <div className="grid settings">
        <div className="grid">
          <div className="card">
            <div className="sect">
              <h3>ช่องทางชำระเงิน</h3>
              <button className="soft" type="button" onClick={() => openPaymentModal()}>
                ＋ เพิ่ม
              </button>
            </div>
            {activePaymentMethods.map((payment) => (
              <div className="setrow" key={payment.id}>
                <div>
                  <b>{payment.name}</b>
                  <small className="muted">
                    {payment.isDefault ? "ค่าเริ่มต้น" : paymentKinds.find(([kind]) => kind === payment.kind)?.[1]}
                  </small>
                </div>
                <div className="row-actions">
                  {!payment.isDefault && (
                    <button className="soft" type="button" onClick={() => setDefaultPayment(payment)}>
                      default
                    </button>
                  )}
                  <button className="soft" type="button" onClick={() => openPaymentModal(payment)}>
                    แก้
                  </button>
                  <button className="danger" type="button" onClick={() => archivePayment(payment)}>
                    ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="sect">
              <div>
                <h3>Savings Pockets</h3>
                <small className="muted">ยอด = Opening balance + Saving Transactions</small>
              </div>
              <button className="soft" type="button" onClick={() => openPocketModal()}>
                ＋ เพิ่ม
              </button>
            </div>
            {data.savingsPockets
              .filter((pocket) => !pocket.archived)
              .map((pocket) => (
                <div className="setrow" key={pocket.id}>
                  <div>
                    <b>
                      {pocket.icon} {pocket.name}
                    </b>
                    <small className="muted">
                      {formatMoney(pocketBalance(pocket, data.transactions))} /{" "}
                      {formatMoney(pocket.targetAmount)}
                      {projectById(pocket.linkedProjectId)
                        ? ` • ${projectById(pocket.linkedProjectId)?.name}`
                        : ""}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button className="soft" type="button" onClick={() => openPocketModal(pocket)}>
                      แก้
                    </button>
                    <button className="danger" type="button" onClick={() => archivePocket(pocket)}>
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="card">
            <div className="sect">
              <h3>รายการประจำ</h3>
              <button className="soft" type="button" onClick={() => navigate("/add")}>
                ＋ เพิ่ม
              </button>
            </div>
            {data.recurringRules.length ? (
              data.recurringRules.map((rule) => (
                <div className="setrow" key={rule.id}>
                  <div>
                    <b>
                      ↻ {rule.template.note || categoryName(data, rule.template.categoryId)} •{" "}
                      {formatMoney(rule.template.amount)}
                    </b>
                    <small className="muted">
                      {frequencyLabel[rule.frequency]} • ครั้งถัดไป{" "}
                      {formatDateTime(rule.nextRunAt)}
                    </small>
                  </div>
                  <div className="row-actions">
                    <button
                      className={`switch ${rule.enabled ? "on" : ""}`}
                      type="button"
                      aria-label="Toggle recurring rule"
                      onClick={() => toggleRecurring(rule.id, !rule.enabled)}
                    />
                    <button className="danger" type="button" onClick={() => deleteRecurring(rule.id)}>
                      ลบ
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <span className="muted">ยังไม่มีรายการประจำ</span>
            )}
          </div>

          <div className="card">
            <div className="sect">
              <div>
                <h3>งบรายเดือน</h3>
                <small className="muted">ใช้เฉพาะ Expense ไม่รวม Saving</small>
              </div>
              <button className="soft" type="button" onClick={openBudgetModal}>
                แก้ไข
              </button>
            </div>
            {data.budgets
              .filter((budget) => budget.month === currentMonth)
              .map((budget) => (
                <div className="setrow" key={budget.id}>
                  <div>
                    <b>
                      {budget.categoryId
                        ? categoryName(data, budget.categoryId)
                        : "งบรวม"}
                    </b>
                  </div>
                  <b>{formatMoney(budget.amount)}</b>
                </div>
              ))}
          </div>
        </div>

        <div className="grid">
          <div className="card">
            <div className="sect">
              <h3>Projects</h3>
              <button className="soft" type="button" onClick={() => navigate("/projects")}>
                จัดการ
              </button>
            </div>
            {data.projects.map((project) => (
              <div className="setrow" key={project.id}>
                <div>
                  <b>
                    {project.icon} {project.name}
                  </b>
                  <small className="muted">
                    {project.status} • Budget {formatMoney(project.budget)}
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="setrow">
              <div>
                <b>Dark Mode</b>
                <small className="muted">ธีมมืดสบายตา</small>
              </div>
              <button
                className={`switch ${theme === "dark" ? "on" : ""}`}
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
              />
            </div>
          </div>

          <div className="card">
            <div className="setrow">
              <div>
                <b>Export CSV</b>
                <small className="muted">รวม Project / Pocket</small>
              </div>
              <button className="soft" type="button" onClick={exportCsv}>
                Export
              </button>
            </div>
            <div className="setrow">
              <div>
                <b>Backup JSON</b>
              </div>
              <button className="soft" type="button" onClick={exportJson}>
                Backup
              </button>
            </div>
            <div className="setrow">
              <div>
                <b>Restore</b>
              </div>
              <label className="soft file-button">
                Restore
                <input accept=".json,application/json" hidden type="file" onChange={restoreJson} />
              </label>
            </div>
          </div>

          <div className="card">
            <div className="setrow">
              <div>
                <b>Privacy</b>
                <small className="muted">No backend • No account • No cloud sync</small>
              </div>
              <span className="status">Local</span>
            </div>
          </div>
        </div>
      </div>

      {modal === "payment" && (
        <Modal
          title={editingPayment ? "แก้ช่องทางชำระเงิน" : "เพิ่มช่องทางชำระเงิน"}
          subtitle="เก็บเฉพาะชื่อหรือประเภท ไม่เก็บเลขบัตรเต็ม"
          onClose={() => setModal(null)}
        >
          <form onSubmit={savePayment}>
            <label className="field">
              <span>ชื่อช่องทาง</span>
              <input
                className="input"
                placeholder="เช่น Credit Card, PromptPay"
                value={paymentDraft.name}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span>ประเภท</span>
              <select
                className="input"
                value={paymentDraft.kind}
                onChange={(event) =>
                  setPaymentDraft((current) => ({
                    ...current,
                    kind: event.target.value as PaymentMethodKind,
                  }))
                }
              >
                {paymentKinds.map(([kind, label]) => (
                  <option key={kind} value={kind}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button className="btn" type="button" onClick={() => setModal(null)}>
                ยกเลิก
              </button>
              <button className="primary" type="submit">
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "pocket" && (
        <Modal
          title={editingPocket ? "แก้ Savings Pocket" : "เพิ่ม Savings Pocket"}
          subtitle="ยอดปัจจุบันจะคำนวณจาก Opening balance + Saving transactions"
          onClose={() => setModal(null)}
        >
          <form onSubmit={savePocket}>
            <div className="project-modal-grid">
              <label className="field">
                <span>ชื่อ Pocket</span>
                <input
                  className="input"
                  placeholder="Japan Trip"
                  value={pocketDraft.name}
                  onChange={(event) =>
                    setPocketDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Icon</span>
                <input
                  className="input"
                  value={pocketDraft.icon}
                  onChange={(event) =>
                    setPocketDraft((current) => ({ ...current, icon: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Target amount</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={pocketDraft.targetAmount}
                  onChange={(event) =>
                    setPocketDraft((current) => ({
                      ...current,
                      targetAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Opening balance</span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={pocketDraft.openingBalance}
                  onChange={(event) =>
                    setPocketDraft((current) => ({
                      ...current,
                      openingBalance: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field full">
                <span>Linked Project (ไม่บังคับ)</span>
                <select
                  className="input"
                  value={pocketDraft.linkedProjectId}
                  onChange={(event) =>
                    setPocketDraft((current) => ({
                      ...current,
                      linkedProjectId: event.target.value,
                    }))
                  }
                >
                  <option value="">ไม่เชื่อม Project</option>
                  {data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.icon} {project.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button className="btn" type="button" onClick={() => setModal(null)}>
                ยกเลิก
              </button>
              <button className="primary" type="submit">
                บันทึก
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "budget" && (
        <Modal
          title="ตั้งงบรายจ่ายรายเดือน"
          subtitle="Saving transactions จะไม่ถูกนับเป็นรายจ่าย"
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveBudget}>
            <label className="field">
              <span>งบรวมต่อเดือน</span>
              <input
                className="input"
                inputMode="decimal"
                value={budgetDraft.overall ?? ""}
                onChange={(event) =>
                  setBudgetDraft((current) => ({
                    ...current,
                    overall: event.target.value,
                  }))
                }
              />
            </label>
            {activeExpenseCategories.map((category) => (
              <label className="field" key={category.id}>
                <span>
                  {category.icon} {category.name}
                </span>
                <input
                  className="input"
                  inputMode="decimal"
                  placeholder="ไม่ตั้งงบ"
                  value={budgetDraft[category.id] ?? ""}
                  onChange={(event) =>
                    setBudgetDraft((current) => ({
                      ...current,
                      [category.id]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            {error && <div className="form-error">{error}</div>}
            <div className="actions">
              <button className="btn" type="button" onClick={() => setModal(null)}>
                ยกเลิก
              </button>
              <button className="primary" type="submit">
                บันทึกงบ
              </button>
            </div>
          </form>
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}
