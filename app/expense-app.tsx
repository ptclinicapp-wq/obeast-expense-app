"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AppSettings,
  calculateShares,
  isTransaction,
  monthKey,
  Person,
  roundMoney,
  SplitMode,
  summarize,
  Transaction,
  transactionDebt,
} from "../lib/finance";

const STORAGE_KEY = "longtua-expense-data-v1";
const DEFAULT_SETTINGS: AppSettings = { myName: "เปา", partnerName: "ติม" };
const LEGACY_SETTINGS: AppSettings = { myName: "คุณ", partnerName: "แฟน" };

const EXPENSE_CATEGORIES = [
  "อาหาร",
  "เดินทาง",
  "ของใช้",
  "บ้าน",
  "บิล",
  "สุขภาพ",
  "ความสุข",
  "อื่น ๆ",
];

type SplitDraft = {
  id: string;
  person: Person;
  label: string;
  amount: string;
};

type FormState = {
  title: string;
  amount: string;
  category: string;
  occurredAt: string;
  paidBy: Person;
  splitMode: SplitMode;
  splitDetails: SplitDraft[];
  note: string;
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const localDateTime = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);

const normalizeDateTime = (value?: string) => {
  if (value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 16);
  }
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00`;
  return localDateTime();
};

const defaultSplitDetails = (): SplitDraft[] => [
  { id: createId(), person: "me", label: "", amount: "" },
  { id: createId(), person: "partner", label: "", amount: "" },
];

const blankForm = (): FormState => ({
  title: "",
  amount: "",
  category: EXPENSE_CATEGORIES[0],
  occurredAt: localDateTime(),
  paidBy: "me",
  splitMode: "equal",
  splitDetails: defaultSplitDetails(),
  note: "",
});

const parseAmount = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);

const formatDateTime = (value?: string) =>
  new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(normalizeDateTime(value)));

const formatMonth = (value: string) =>
  new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(
    new Date(`${value}-01T00:00:00`),
  );

const displayName = (person: Person, settings: AppSettings) =>
  person === "me" ? settings.myName : settings.partnerName;

const normalizeSettings = (settings?: Partial<AppSettings>): AppSettings => {
  const myName = settings?.myName?.trim();
  const partnerName = settings?.partnerName?.trim();

  return {
    myName:
      !myName || myName === LEGACY_SETTINGS.myName
        ? DEFAULT_SETTINGS.myName
        : myName,
    partnerName:
      !partnerName || partnerName === LEGACY_SETTINGS.partnerName
        ? DEFAULT_SETTINGS.partnerName
        : partnerName,
  };
};

const normalizeTransaction = (transaction: Transaction): Transaction => {
  const occurredAt =
    transaction.occurredAt ?? normalizeDateTime(`${transaction.date}T12:00`);

  return {
    ...transaction,
    type: "expense",
    date: occurredAt.slice(0, 10),
    occurredAt,
  };
};

const splitDetailsFromTransaction = (
  transaction: Transaction,
  settings: AppSettings,
): SplitDraft[] => {
  if (transaction.splitDetails?.length) {
    return transaction.splitDetails.map((detail) => ({
      id: createId(),
      person: detail.person,
      label: detail.label,
      amount: String(detail.amount),
    }));
  }

  if (transaction.splitMode === "custom") {
    return [
      {
        id: createId(),
        person: "me",
        label: `ส่วนของ${settings.myName}`,
        amount: String(transaction.myShare),
      },
      {
        id: createId(),
        person: "partner",
        label: `ส่วนของ${settings.partnerName}`,
        amount: String(transaction.partnerShare),
      },
    ];
  }

  return defaultSplitDetails();
};

export default function ExpenseApp() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedMonth, setSelectedMonth] = useState(localDateTime().slice(0, 7));
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadStoredData = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored) as {
          transactions?: unknown[];
          settings?: Partial<AppSettings>;
        };

        if (!cancelled && Array.isArray(parsed.transactions)) {
          setTransactions(
            parsed.transactions.filter(isTransaction).map(normalizeTransaction),
          );
        }

        if (!cancelled) setSettings(normalizeSettings(parsed.settings));
      } catch {
        if (!cancelled) {
          setToast("อ่านข้อมูลเดิมไม่สำเร็จ แต่ยังเพิ่มรายการใหม่ได้");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    const loadTimer = window.setTimeout(loadStoredData, 0);

    if ("serviceWorker" in navigator) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 2, transactions, settings }),
    );
  }, [hydrated, transactions, settings]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const amount = parseAmount(form.amount);

  const customShares = useMemo(
    () =>
      form.splitDetails.reduce(
        (shares, detail) => {
          const detailAmount = parseAmount(detail.amount);
          if (detail.person === "me") {
            shares.myShare += detailAmount;
          } else {
            shares.partnerShare += detailAmount;
          }
          return shares;
        },
        { myShare: 0, partnerShare: 0 },
      ),
    [form.splitDetails],
  );

  const shares =
    form.splitMode === "custom"
      ? {
          myShare: roundMoney(customShares.myShare),
          partnerShare: roundMoney(customShares.partnerShare),
        }
      : calculateShares(amount, form.splitMode);

  const splitTotal = roundMoney(shares.myShare + shares.partnerShare);
  const splitDifference = roundMoney(amount - splitTotal);

  const monthTransactions = useMemo(
    () =>
      transactions
        .filter((item) => monthKey(item.date) === selectedMonth)
        .sort(
          (a, b) =>
            normalizeDateTime(b.occurredAt).localeCompare(
              normalizeDateTime(a.occurredAt),
            ) || b.createdAt.localeCompare(a.createdAt),
        ),
    [selectedMonth, transactions],
  );

  const totals = useMemo(() => summarize(monthTransactions), [monthTransactions]);
  const categoryTotals = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    monthTransactions.forEach((transaction) => {
      totalsByCategory.set(
        transaction.category,
        (totalsByCategory.get(transaction.category) ?? 0) + transaction.amount,
      );
    });
    return [...totalsByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [monthTransactions]);

  const netDebt = Math.abs(totals.netDebt) < 0.005 ? 0 : totals.netDebt;

  const resetForm = () => {
    setEditingId(null);
    setForm(blankForm());
    setError("");
  };

  const editTransaction = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setForm({
      title: transaction.title === transaction.category ? "" : transaction.title,
      amount: String(transaction.amount),
      category: transaction.category,
      occurredAt: normalizeDateTime(transaction.occurredAt ?? transaction.date),
      paidBy: transaction.paidBy,
      splitMode: transaction.splitMode,
      splitDetails: splitDetailsFromTransaction(transaction, settings),
      note: transaction.note,
    });
    setError("");
    window.setTimeout(
      () => document.getElementById("expense-form")?.scrollIntoView(),
      0,
    );
  };

  const updateSplitDetail = (id: string, update: Partial<SplitDraft>) => {
    setForm((current) => ({
      ...current,
      splitDetails: current.splitDetails.map((detail) =>
        detail.id === id ? { ...detail, ...update } : detail,
      ),
    }));
  };

  const addSplitDetail = () => {
    setForm((current) => ({
      ...current,
      splitDetails: [
        ...current.splitDetails,
        { id: createId(), person: "me", label: "", amount: "" },
      ],
    }));
  };

  const removeSplitDetail = (id: string) => {
    setForm((current) => ({
      ...current,
      splitDetails:
        current.splitDetails.length === 1
          ? current.splitDetails
          : current.splitDetails.filter((detail) => detail.id !== id),
    }));
  };

  const saveTransaction = (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("ยอดเงินต้องมากกว่า 0");
      return;
    }

    if (form.splitMode === "custom" && Math.abs(splitDifference) > 0.01) {
      setError("ยอดแบ่งจ่ายต้องรวมกันเท่ากับยอดเต็ม");
      return;
    }

    const splitDetails =
      form.splitMode === "custom"
        ? form.splitDetails
            .map((detail) => ({
              person: detail.person,
              label: detail.label.trim() || form.category,
              amount: roundMoney(parseAmount(detail.amount)),
            }))
            .filter((detail) => detail.amount > 0)
        : undefined;

    if (form.splitMode === "custom" && !splitDetails?.length) {
      setError("เพิ่มรายการย่อยอย่างน้อย 1 รายการ");
      return;
    }

    const occurredAt = normalizeDateTime(form.occurredAt);
    const current = transactions.find((item) => item.id === editingId);
    const next: Transaction = {
      id: editingId ?? createId(),
      type: "expense",
      title: form.title.trim() || form.category,
      category: form.category,
      amount: roundMoney(amount),
      date: occurredAt.slice(0, 10),
      occurredAt,
      paidBy: form.paidBy,
      splitMode: form.splitMode,
      myShare: shares.myShare,
      partnerShare: shares.partnerShare,
      splitDetails,
      note: form.note.trim(),
      createdAt: current?.createdAt ?? new Date().toISOString(),
    };

    setTransactions((items) =>
      editingId
        ? items.map((item) => (item.id === editingId ? next : item))
        : [next, ...items],
    );
    setSelectedMonth(monthKey(next.date));
    setToast(editingId ? "แก้ไขรายการแล้ว" : "บันทึกรายการแล้ว");
    resetForm();
  };

  const deleteTransaction = () => {
    if (!editingId || !window.confirm("ลบรายการนี้ใช่ไหม?")) return;
    setTransactions((items) => items.filter((item) => item.id !== editingId));
    setToast("ลบรายการแล้ว");
    resetForm();
  };

  const clearAll = () => {
    if (!transactions.length) return;
    if (!window.confirm("ลบข้อมูลทั้งหมดจากเครื่องนี้ใช่ไหม?")) return;
    setTransactions([]);
    setSettingsOpen(false);
    resetForm();
    setToast("ลบข้อมูลทั้งหมดแล้ว");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="กลับด้านบน">
          <span className="brand-mark" aria-hidden="true">
            ลต
          </span>
          <span>
            <strong>ลงตัว</strong>
            <small>ค่าใช้จ่ายของเปาและติม</small>
          </span>
        </a>
        <button className="settings-button" onClick={() => setSettingsOpen(true)}>
          ตั้งค่า
        </button>
      </header>

      <div className="page-content" id="top">
        <section className="entry-layout">
          <form
            className="entry-card"
            id="expense-form"
            onSubmit={saveTransaction}
          >
            <div className="entry-heading">
              <div>
                <p className="eyebrow">
                  {editingId ? "แก้ไขรายการ" : "ค่าใช้จ่ายครั้งนี้"}
                </p>
                <h1>{editingId ? "ปรับรายการให้ถูกต้อง" : "จดเลยตอนนี้"}</h1>
              </div>
              {editingId && (
                <button className="ghost-button" type="button" onClick={resetForm}>
                  ยกเลิก
                </button>
              )}
            </div>

            <label className="field amount-field">
              <span>ใช้ไปเท่าไหร่</span>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  autoFocus
                />
                <strong>บาท</strong>
              </div>
            </label>

            <div className="form-grid">
              <label className="field">
                <span>วันที่และเวลา</span>
                <input
                  type="datetime-local"
                  value={form.occurredAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      occurredAt: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>หมวด</span>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="choice-fieldset">
              <legend>เป็นรายจ่ายของใคร</legend>
              <div className="split-mode-grid">
                {(
                  [
                    ["mine", settings.myName],
                    ["partner", settings.partnerName],
                    ["equal", "หารครึ่ง"],
                    ["custom", "แบ่งจ่าย"],
                  ] as [SplitMode, string][]
                ).map(([mode, label]) => (
                  <button
                    type="button"
                    key={mode}
                    className={form.splitMode === mode ? "active" : ""}
                    onClick={() =>
                      setForm((current) => ({ ...current, splitMode: mode }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {form.splitMode === "custom" && (
              <section className="split-panel" aria-label="รายละเอียดแบ่งจ่าย">
                <div className="split-panel-heading">
                  <strong>แตกยอดแบ่งจ่าย</strong>
                  <span
                    className={
                      Math.abs(splitDifference) <= 0.01 ? "is-balanced" : ""
                    }
                  >
                    {Math.abs(splitDifference) <= 0.01
                      ? "ยอดตรงแล้ว"
                      : `เหลือ ${formatMoney(Math.abs(splitDifference))}`}
                  </span>
                </div>

                <div className="split-lines">
                  {form.splitDetails.map((detail) => (
                    <div className="split-line" key={detail.id}>
                      <select
                        aria-label="เลือกคน"
                        value={detail.person}
                        onChange={(event) =>
                          updateSplitDetail(detail.id, {
                            person: event.target.value as Person,
                          })
                        }
                      >
                        <option value="me">{settings.myName}</option>
                        <option value="partner">{settings.partnerName}</option>
                      </select>
                      <input
                        aria-label="รายการ"
                        type="text"
                        maxLength={60}
                        placeholder="จ่ายอะไร"
                        value={detail.label}
                        onChange={(event) =>
                          updateSplitDetail(detail.id, { label: event.target.value })
                        }
                      />
                      <input
                        aria-label="จำนวนเงิน"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={detail.amount}
                        onChange={(event) =>
                          updateSplitDetail(detail.id, {
                            amount: event.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => removeSplitDetail(detail.id)}
                        aria-label="ลบรายการย่อย"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <button className="add-line-button" type="button" onClick={addSplitDetail}>
                  + เพิ่มรายการย่อย
                </button>
              </section>
            )}

            <fieldset className="choice-fieldset">
              <legend>คนออกเงินก่อน</legend>
              <div className="person-choice">
                {(["me", "partner"] as Person[]).map((person) => (
                  <button
                    type="button"
                    key={person}
                    className={form.paidBy === person ? "active" : ""}
                    onClick={() =>
                      setForm((current) => ({ ...current, paidBy: person }))
                    }
                  >
                    {displayName(person, settings)}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="form-grid">
              <label className="field">
                <span>ชื่อรายการ</span>
                <input
                  type="text"
                  maxLength={80}
                  placeholder={form.category}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>โน้ต</span>
                <input
                  type="text"
                  maxLength={140}
                  placeholder="รายละเอียดเพิ่ม"
                  value={form.note}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, note: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="split-preview" aria-live="polite">
              <span>
                {settings.myName}
                <strong>{formatMoney(shares.myShare)}</strong>
              </span>
              <span>
                {settings.partnerName}
                <strong>{formatMoney(shares.partnerShare)}</strong>
              </span>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="form-actions">
              {editingId && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={deleteTransaction}
                >
                  ลบ
                </button>
              )}
              <button className="primary-button" type="submit">
                {editingId ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
              </button>
            </div>
          </form>

          <aside className="month-panel" aria-label="สรุปรายเดือน">
            <div className="month-card balance-card">
              <div className="month-heading">
                <div>
                  <p className="eyebrow">สรุป {formatMonth(selectedMonth)}</p>
                  <h2>
                    {netDebt === 0
                      ? "เคลียร์กันแล้ว"
                      : netDebt > 0
                        ? `${settings.partnerName}คืน${settings.myName}`
                        : `${settings.myName}คืน${settings.partnerName}`}
                  </h2>
                </div>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  aria-label="เลือกเดือน"
                />
              </div>
              <p className="balance-amount">
                {netDebt === 0 ? formatMoney(0) : formatMoney(Math.abs(netDebt))}
              </p>
              <div className="summary-strip">
                <span>
                  <small>รวมจ่าย</small>
                  <strong>{formatMoney(totals.expense)}</strong>
                </span>
                <span>
                  <small>{settings.myName}</small>
                  <strong>{formatMoney(totals.myShare)}</strong>
                </span>
                <span>
                  <small>{settings.partnerName}</small>
                  <strong>{formatMoney(totals.partnerShare)}</strong>
                </span>
              </div>
            </div>

            <div className="category-card">
              <div className="section-heading compact-heading">
                <p className="eyebrow">หมวดสูงสุด</p>
              </div>
              {categoryTotals.length ? (
                <div className="category-list">
                  {categoryTotals.map(([category, total]) => (
                    <div className="category-row" key={category}>
                      <span>{category}</span>
                      <strong>{formatMoney(total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">ยังไม่มีรายการเดือนนี้</p>
              )}
            </div>
          </aside>
        </section>

        <section className="records" aria-labelledby="records-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ประวัติ</p>
              <h2 id="records-title">รายการเดือนนี้</h2>
            </div>
            <button className="ghost-button" type="button" onClick={resetForm}>
              + รายการใหม่
            </button>
          </div>

          {!hydrated ? (
            <div className="empty-state" role="status">
              <h3>กำลังเปิดสมุดบัญชี</h3>
            </div>
          ) : monthTransactions.length === 0 ? (
            <div className="empty-state">
              <h3>ยังไม่มีค่าใช้จ่ายในเดือนนี้</h3>
              <p>รายการใหม่จะถูกเก็บไว้ในเครื่องนี้</p>
            </div>
          ) : (
            <div className="transaction-list">
              {monthTransactions.map((item) => {
                const debt = transactionDebt(item);
                return (
                  <button
                    className="transaction-row"
                    key={item.id}
                    onClick={() => editTransaction(item)}
                    aria-label={`แก้ไข ${item.title} ${formatMoney(item.amount)}`}
                  >
                    <span className="transaction-main">
                      <strong>{item.title}</strong>
                      <small>
                        {formatDateTime(item.occurredAt)} · {item.category}
                      </small>
                      {item.splitMode === "custom" && item.splitDetails?.length ? (
                        <em>
                          {item.splitDetails
                            .map(
                              (detail) =>
                                `${displayName(detail.person, settings)}: ${
                                  detail.label
                                } ${formatMoney(detail.amount)}`,
                            )
                            .join(" · ")}
                        </em>
                      ) : (
                        <em>
                          {item.splitMode === "equal"
                            ? "หารครึ่ง"
                            : item.splitMode === "mine"
                              ? `ของ${settings.myName}`
                              : `ของ${settings.partnerName}`}
                        </em>
                      )}
                    </span>
                    <span className="transaction-amount">
                      <strong>{formatMoney(item.amount)}</strong>
                      <small>
                        {debt === 0
                          ? "ไม่ต้องคืนกัน"
                          : debt > 0
                            ? `${settings.partnerName}คืน ${formatMoney(debt)}`
                            : `${settings.myName}คืน ${formatMoney(Math.abs(debt))}`}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
          <section
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="sheet-heading">
              <div>
                <p className="eyebrow">ตั้งค่า</p>
                <h2 id="settings-title">ชื่อในสมุดนี้</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSettingsOpen(false)}
                aria-label="ปิด"
              >
                ×
              </button>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>คนแรก</span>
                <input
                  type="text"
                  maxLength={24}
                  value={settings.myName}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      myName: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setSettings((current) => normalizeSettings(current))
                  }
                />
              </label>
              <label className="field">
                <span>คนที่สอง</span>
                <input
                  type="text"
                  maxLength={24}
                  value={settings.partnerName}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      partnerName: event.target.value,
                    }))
                  }
                  onBlur={() =>
                    setSettings((current) => normalizeSettings(current))
                  }
                />
              </label>
            </div>

            <div className="security-card">
              <span aria-hidden="true">●</span>
              <div>
                <strong>ข้อมูลอยู่ในเครื่องนี้</strong>
                <p>เวอร์ชันนี้เก็บรายการไว้ในพื้นที่ของเบราว์เซอร์บนเครื่องนี้เท่านั้น</p>
              </div>
            </div>

            <button className="clear-button" onClick={clearAll}>
              ลบข้อมูลทั้งหมด
            </button>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </main>
  );
}
