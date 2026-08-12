import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateShares,
  isTransaction,
  summarize,
  transactionDebt,
  type Transaction,
} from "../lib/finance.ts";

const base: Transaction = {
  id: "tx-1",
  type: "expense",
  title: "มื้อเย็น",
  category: "อาหาร",
  amount: 800,
  date: "2026-08-12",
  paidBy: "me",
  splitMode: "equal",
  myShare: 400,
  partnerShare: 400,
  note: "",
  createdAt: "2026-08-12T00:00:00.000Z",
};

test("แบ่งครึ่งโดยเก็บทศนิยมรวมกันได้เท่ากับยอดเต็ม", () => {
  assert.deepEqual(calculateShares(999, "equal"), {
    myShare: 499.5,
    partnerShare: 499.5,
  });
});

test("กำหนดสัดส่วนเองและกันค่าไม่ให้เกินยอดเต็ม", () => {
  assert.deepEqual(calculateShares(1000, "custom", 700), {
    myShare: 700,
    partnerShare: 300,
  });
  assert.deepEqual(calculateShares(100, "custom", 140), {
    myShare: 100,
    partnerShare: 0,
  });
});

test("ผู้จ่ายแทนอีกฝ่ายจะกลายเป็นยอดที่อีกฝ่ายต้องคืน", () => {
  assert.equal(transactionDebt(base), 400);
  assert.equal(
    transactionDebt({ ...base, paidBy: "partner", myShare: 300 }),
    -300,
  );
});

test("ยอดสุทธิหักกลบหนี้สองฝั่งและไม่นับรายรับเป็นหนี้", () => {
  const result = summarize([
    base,
    {
      ...base,
      id: "tx-2",
      paidBy: "partner",
      amount: 300,
      myShare: 150,
      partnerShare: 150,
    },
    {
      ...base,
      id: "tx-3",
      type: "income",
      amount: 1500,
      myShare: 0,
      partnerShare: 0,
    },
  ]);

  assert.deepEqual(result, {
    income: 1500,
    expense: 1100,
    myShare: 550,
    partnerShare: 550,
    netDebt: 250,
  });
});

test("ไม่รับไฟล์สำรองที่ยอดแบ่งรวมกันไม่ตรงกับยอดเต็ม", () => {
  assert.equal(isTransaction(base), true);
  assert.equal(isTransaction({ ...base, myShare: 900, partnerShare: 400 }), false);
});
