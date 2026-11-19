import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "@/db/db";
import { useAppData } from "@/db/hooks";
import { createId, localDateTime, nowIso, toIsoFromLocalInput, toLocalInputValue } from "@/domain/dates";
import { defaultExpenseProject, formatMoney } from "@/domain/finance";
import type {
  Currency,
  MoneySplit,
  RecurringFrequency,
  TransactionOwner,
  TransactionRecord,
  TransactionType,
} from "@/types/models";

interface Draft {
  type: TransactionType;
  currency: Currency;
  amount: string;
  datetime: string;
  categoryId: string;
  paymentMethodId: string;
  note: string;
  projectId: string;
  savingsPocketId: string;
  payer: "Pao" | "Tim";
  owner: TransactionOwner;
  splitMode: "half" | "custom";
  paoShare: string;
  timShare: string;
  recurring: boolean;
  frequency: RecurringFrequency;
  nextRunAt: string;
}

const makeDraft = (): Draft => ({
  type: "expense",
  currency: "THB",
  amount: "",
  datetime: localDateTime(),
  categoryId: "",
  paymentMethodId: "",
  note: "",
  projectId: "",
  savingsPocketId: "",
  payer: "Pao",
  owner: "Pao",
  splitMode: "half",
  paoShare: "",
  timShare: "",
  recurring: false,
  frequency: "monthly",
  nextRunAt: localDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
});

const amountNumber = (value: string) => Number(value || 0);
const who = (value: string) =>
  value === "Pao" ? "เปา" : value === "Tim" ? "ติม" : "ทั้งคู่";

function splitFromDraft(draft: Draft, amount: number): MoneySplit | null {
  if (draft.type !== "expense") return null;

  if (draft.owner === "Pao") {
    return { mode: "none", paoShare: amount, timShare: 0 };
  }

  if (draft.owner === "Tim") {
    return { mode: "none", paoShare: 0, timShare: amount };
  }

  if (draft.splitMode === "half") {
    return { mode: "half", paoShare: amount / 2, timShare: amount / 2 };
  }

  return {
    mode: "custom",
    paoShare: amountNumber(draft.paoShare),
    timShare: amountNumber(draft.timShare),
  };
}

export function AddTransactionScreen() {
  const data = useAppData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const copyId = params.get("copy");
  const [draft, setDraft] = useState<Draft>(makeDraft);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState("");
  const [defaultSaved, setDefaultSaved] = useState(false);
  const defaultProject = defaultExpenseProject(data);
  const newDraft = (): Draft => ({ ...makeDraft(), projectId: defaultProject?.id ?? "", currency: defaultProject?.currency ?? "THB" });
  const money = (value: number) => formatMoney(value, draft.currency);

  const activeCategories = useMemo(
    () =>
      data.categories
        .filter((category) => category.type === draft.type && !category.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data.categories, draft.type],
  );

  const activePaymentMethods = useMemo(
    () => data.paymentMethods.filter((method) => !method.archived),
    [data.paymentMethods],
  );
  const selectedCategoryId = draft.categoryId || activeCategories[0]?.id || "";
  const selectedPaymentMethodId =
    draft.paymentMethodId ||
    activePaymentMethods.find((method) => method.isDefault)?.id ||
    activePaymentMethods[0]?.id ||
    "";
  const selectedSavingsPocketId =
    draft.savingsPocketId || data.savingsPockets[0]?.id || "";

  useEffect(() => {
    setDraft((current) => {
      const category = activeCategories[0]?.id ?? "";
      const defaultPayment =
        activePaymentMethods.find((method) => method.isDefault)?.id ??
        activePaymentMethods[0]?.id ??
        "";

      return {
        ...current,
        categoryId: current.categoryId || category,
        paymentMethodId: current.paymentMethodId || defaultPayment,
        savingsPocketId:
          current.savingsPocketId || data.savingsPockets[0]?.id || "",
      };
    });
  }, [activeCategories, activePaymentMethods, data.savingsPockets]);

  useEffect(() => {
    const key = editId ? `edit:${editId}` : copyId ? `copy:${copyId}` : "new";
    if (key === loadedKey || !data.categories.length) return;

    const source = data.transactions.find(
      (transaction) => transaction.id === (editId ?? copyId),
    );

    if (!source && key !== "new") return;

    if (!source) {
      setDraft({ ...makeDraft(), projectId: defaultProject?.id ?? "", currency: defaultProject?.currency ?? "THB" });
      setLoadedKey(key);
      return;
    }

    setDraft({
      type: source.type,
      currency: source.currency ?? "THB",
      amount: String(source.amount),
      datetime: editId ? toLocalInputValue(source.datetime) : localDateTime(),
      categoryId: source.categoryId ?? "",
      paymentMethodId: source.paymentMethodId ?? "",
      note: source.note,
      projectId: source.projectId ?? "",
      savingsPocketId: source.savingsPocketId ?? "",
      payer: source.payer ?? "Pao",
      owner: source.owner,
      splitMode: source.split?.mode === "custom" ? "custom" : "half",
      paoShare: String(source.split?.paoShare ?? ""),
      timShare: String(source.split?.timShare ?? ""),
      recurring: false,
      frequency: "monthly",
      nextRunAt: localDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    });
    setLoadedKey(key);
  }, [copyId, data.categories.length, data.transactions, editId, loadedKey, defaultProject]);

  const amount = amountNumber(draft.amount);
  const split = splitFromDraft(draft, amount);
  const owed =
    draft.type === "expense" && split
      ? draft.payer === "Pao"
        ? split.timShare
        : split.paoShare
      : 0;

  const setType = (type: TransactionType) => {
    if (type === draft.type) return;
    const categoryId =
      data.categories
        .filter((category) => category.type === type && !category.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? "";

    setDraft((current) => ({
      ...current,
      type,
      projectId: type === "expense" ? defaultProject?.id ?? "" : "",
      currency: type === "expense" ? defaultProject?.currency ?? "THB" : "THB",
      categoryId,
      owner: current.owner === "Both" ? "Pao" : current.owner,
    }));
  };

  const validate = () => {
    if (!Number.isFinite(amount) || amount <= 0) return "กรุณาใส่จำนวนเงิน";
    if (!draft.datetime) return "กรุณาเลือกวันที่";
    if (!selectedCategoryId) return "กรุณาเลือกหมวดหมู่";
    if (!selectedPaymentMethodId) return "กรุณาเลือกช่องทางชำระเงิน";
    if (draft.type === "saving" && !selectedSavingsPocketId) {
      return "กรุณาเลือก Savings Pocket";
    }
    if (draft.type === "expense" && draft.owner === "Both" && split) {
      const totalSplit = split.paoShare + split.timShare;
      if (Math.abs(totalSplit - amount) > 0.01) {
        return "ยอดแบ่งเปา + ติม ต้องเท่ากับยอดทั้งหมด";
      }
    }
    if (!editId && draft.recurring && !draft.nextRunAt) {
      return "กรุณาเลือกครั้งถัดไปของรายการประจำ";
    }
    return "";
  };

  const saveTransaction = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const timestamp = nowIso();
    const existing = editId
      ? data.transactions.find((transaction) => transaction.id === editId)
      : null;

    const transaction: TransactionRecord = {
      id: existing?.id ?? createId(),
      type: draft.type,
      amount,
      currency: draft.currency,
      datetime: toIsoFromLocalInput(draft.datetime),
      categoryId: selectedCategoryId,
      paymentMethodId: selectedPaymentMethodId,
      note: draft.note.trim(),
      projectId: draft.projectId || null,
      savingsPocketId: draft.type === "saving" ? selectedSavingsPocketId : null,
      payer: draft.type === "expense" ? draft.payer : null,
      owner: draft.owner,
      split,
      recurringRuleId: existing?.recurringRuleId ?? null,
      recurringOccurrenceKey: existing?.recurringOccurrenceKey ?? null,
      recurringGenerated: existing?.recurringGenerated ?? false,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    await db.transaction("rw", [db.transactions, db.recurringRules], async () => {
      await db.transactions.put(transaction);

      if (!existing && draft.recurring) {
        await db.recurringRules.add({
          id: createId(),
          enabled: true,
          frequency: draft.frequency,
          nextRunAt: toIsoFromLocalInput(draft.nextRunAt),
          template: {
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
          categoryId: transaction.categoryId,
          paymentMethodId: transaction.paymentMethodId,
            note: transaction.note,
            projectId: transaction.projectId,
            savingsPocketId: transaction.savingsPocketId,
            payer: transaction.payer,
            owner: transaction.owner,
            split: transaction.split,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    });

    navigate(editId ? "/history" : "/");
  };

  return (
    <section className="view active">
      <div className="head">
        <div>
          <h1>{editId ? "แก้ไขรายการ" : copyId ? "Quick Add" : "เพิ่มรายการ"}</h1>
          <p>
            {editId
              ? data.transactions.find((item) => item.id === editId)?.recurringGenerated
                ? "แก้เฉพาะรอบนี้ ไม่แก้ Recurring Series"
                : "ปรับข้อมูลรายการย้อนหลัง"
              : "รายจ่าย รายรับ หรือแยกเงินไปเก็บ"}
          </p>
        </div>
      </div>

      <form className="card form" onSubmit={saveTransaction}>
        <div className="segment">
          {(["expense", "income", "saving"] as TransactionType[]).map((type) => (
            <button
              key={type}
              className={draft.type === type ? "active" : ""}
              type="button"
              onClick={() => setType(type)}
            >
              {type === "expense" ? "รายจ่าย" : type === "income" ? "รายรับ" : "เงินเก็บ"}
            </button>
          ))}
        </div>

        <small className="muted">จำนวนเงิน ({draft.currency === "JPY" ? "เยน JPY" : "บาท THB"})</small>
        <input
          className="moneyinput"
          inputMode="decimal"
          aria-label={`จำนวนเงิน (${draft.currency})`}
          placeholder={draft.currency === "JPY" ? "¥0" : "฿0"}
          value={draft.amount}
          onChange={(event) =>
            setDraft((current) => ({ ...current, amount: event.target.value }))
          }
        />

        <div className="formgrid">
          <label className="field">
            <span>วันที่และเวลา</span>
            <input
              className="input"
              type="datetime-local"
              value={draft.datetime}
              onChange={(event) =>
                setDraft((current) => ({ ...current, datetime: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>หมวดหมู่</span>
            <select
              className="input"
              value={selectedCategoryId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  categoryId: event.target.value,
                }))
              }
            >
              {activeCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Project (ไม่บังคับ)</span>
            <select
              className="input"
              value={draft.projectId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, projectId: event.target.value, currency: data.projects.find((item) => item.id === event.target.value)?.currency ?? "THB" }))
              }
            >
              <option value="">ไม่ระบุ Project</option>
              {data.projects
                .filter((project) => (project.status !== "Archived" && project.status !== "Completed") || project.id === draft.projectId)
                .filter((project) => draft.type !== "saving" || (project.currency ?? "THB") === "THB")
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.icon} {project.name} ({project.currency ?? "THB"})
                  </option>
                ))}
            </select>
          </label>

          {draft.type === "expense" && (
            <div className="field">
              <span>Project เริ่มต้นเมื่อเพิ่มค่าใช้จ่าย</span>
              <small className="muted">ปัจจุบัน: {defaultProject?.name ?? "ไม่มีโปรเจกต์"}</small>
              <button className="soft" type="button" onClick={async () => {
                await db.appSettings.put({ key: "defaultProjectId", value: draft.projectId || null, updatedAt: nowIso() });
                setDefaultSaved(true);
              }}>ตั้ง {data.projects.find((item) => item.id === draft.projectId)?.name ?? "ไม่มีโปรเจกต์"} เป็นค่าเริ่มต้น</button>
              {defaultSaved && <small role="status">บันทึกค่าเริ่มต้นแล้ว</small>}
            </div>
          )}

          <label className="field">
            <span>
              {draft.type === "saving"
                ? "เงินออกจากไหน"
                : draft.type === "income"
                  ? "รับผ่าน"
                  : "จ่ายผ่าน"}
            </span>
            <select
              className="input"
              value={selectedPaymentMethodId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  paymentMethodId: event.target.value,
                }))
              }
            >
              {activePaymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}
                </option>
              ))}
            </select>
          </label>

          {draft.type === "expense" && (
            <>
              <div className="field">
                <span>ใครจ่ายเงินจริง</span>
                <div className="choices">
                  {(["Pao", "Tim"] as const).map((person) => (
                    <button
                      key={person}
                      className={`choice ${draft.payer === person ? "active" : ""}`}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({ ...current, payer: person }))
                      }
                    >
                      {who(person)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>ค่าใช้จ่ายเป็นของใคร</span>
                <div className="choices">
                  {(["Pao", "Tim", "Both"] as const).map((owner) => (
                    <button
                      key={owner}
                      className={`choice ${draft.owner === owner ? "active" : ""}`}
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({ ...current, owner }))
                      }
                    >
                      {who(owner)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {draft.type !== "expense" && (
            <div className="field">
              <span>{draft.type === "income" ? "รายรับของใคร" : "เงินเก็บของใคร"}</span>
              <div className="choices">
                {(["Pao", "Tim", "Both"] as const).map((owner) => (
                  <button
                    key={owner}
                    className={`choice ${draft.owner === owner ? "active" : ""}`}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({ ...current, owner }))
                    }
                  >
                    {who(owner)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {draft.type === "saving" && (
            <label className="field">
              <span>เก็บไว้ที่ Pocket</span>
              <select
                className="input"
                value={selectedSavingsPocketId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    savingsPocketId: event.target.value,
                  }))
                }
              >
                {data.savingsPockets
                  .filter((pocket) => !pocket.archived)
                  .map((pocket) => (
                    <option key={pocket.id} value={pocket.id}>
                      {pocket.icon} {pocket.name}
                    </option>
                  ))}
              </select>
            </label>
          )}

          {draft.type === "expense" && draft.owner === "Both" && (
            <div className="field full box show">
              <span>แบ่งค่าใช้จ่าย</span>
              <div className="choices">
                <button
                  className={`choice ${draft.splitMode === "half" ? "active" : ""}`}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({ ...current, splitMode: "half" }))
                  }
                >
                  หารครึ่ง
                </button>
                <button
                  className={`choice ${draft.splitMode === "custom" ? "active" : ""}`}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({ ...current, splitMode: "custom" }))
                  }
                >
                  กำหนดเอง
                </button>
              </div>
              {draft.splitMode === "custom" && (
                <div className="custom-split">
                  <label className="field">
                    <span>เปา</span>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={draft.paoShare}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          paoShare: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>ติม</span>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={draft.timShare}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          timShare: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <label className="field full">
            <span>หมายเหตุ</span>
            <textarea
              className="input"
              rows={2}
              placeholder="เช่น ตั๋วเครื่องบินญี่ปุ่น / เงินเก็บเที่ยวญี่ปุ่น"
              value={draft.note}
              onChange={(event) =>
                setDraft((current) => ({ ...current, note: event.target.value }))
              }
            />
          </label>

          {!editId && (
            <>
              <div className="field full">
                <span>รายการประจำ</span>
                <div className="switchrow">
                  <button
                    className={`switch ${draft.recurring ? "on" : ""}`}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        recurring: !current.recurring,
                      }))
                    }
                    aria-label="Toggle recurring"
                  />
                  <span>บันทึกอัตโนมัติตามกำหนด</span>
                </div>
                <small className="muted">
                  ถ้าปิดเว็บ ระบบจะ catch-up ตอนเปิดครั้งถัดไปโดยไม่สร้างซ้ำ
                </small>
              </div>

              {draft.recurring && (
                <div className="field full box show">
                  <div className="formgrid">
                    <label className="field">
                      <span>ความถี่</span>
                      <select
                        className="input"
                        value={draft.frequency}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            frequency: event.target.value as RecurringFrequency,
                          }))
                        }
                      >
                        <option value="daily">ทุกวัน</option>
                        <option value="weekly">ทุกสัปดาห์</option>
                        <option value="monthly">ทุกเดือน</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>ครั้งถัดไป</span>
                      <input
                        className="input"
                        type="datetime-local"
                        value={draft.nextRunAt}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            nextRunAt: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="field full">
            <div className="summarybox">
              {draft.type === "income" && (
                <>
                  รายรับนี้เป็นของ <b>{who(draft.owner)}</b>
                </>
              )}
              {draft.type === "saving" && (
                <>
                  แยก <b>{money(amount)}</b> ไปเป็นเงินเก็บของ{" "}
                  <b>{who(draft.owner)}</b>
                  <br />
                  <small className="muted">
                    เงินก้อนนี้จะลด “เหลือใช้” แต่ไม่ถูกนับเป็นรายจ่าย
                  </small>
                </>
              )}
              {draft.type === "expense" && split && (
                <>
                  เปา {money(split.paoShare)} • ติม{" "}
                  {money(split.timShare)}
                  <br />
                  <b>
                    {draft.payer === "Pao" ? "ติมค้างเปา" : "เปาค้างติม"}{" "}
                    {money(owed)}
                  </b>
                </>
              )}
            </div>
          </div>

          {error && <div className="form-error full">{error}</div>}
        </div>

        <div className="actions">
          <button className="btn" type="button" onClick={() => setDraft(newDraft())}>
            ล้าง
          </button>
          <button className="primary" type="submit">
            บันทึกรายการ
          </button>
        </div>
      </form>
    </section>
  );
}
