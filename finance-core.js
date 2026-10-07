(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinanceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const USERS = ['Pao', 'Tim'];

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toCents(value) {
    return Math.round(number(value) * 100);
  }

  function fromCents(value) {
    return Math.round(number(value)) / 100;
  }

  function pair(value) {
    return {
      Pao: fromCents(toCents(value?.Pao)),
      Tim: fromCents(toCents(value?.Tim))
    };
  }

  function pairCents(value) {
    return {Pao:toCents(value?.Pao), Tim:toCents(value?.Tim)};
  }

  function pairTotal(value) {
    const cents = pairCents(value);
    return fromCents(cents.Pao + cents.Tim);
  }

  function validPair(value, amount) {
    if (!value || typeof value !== 'object') return false;
    const pao = Number(value.Pao), tim = Number(value.Tim);
    return Number.isFinite(pao) && Number.isFinite(tim) && pao >= 0 && tim >= 0 && toCents(pao) + toCents(tim) === toCents(amount);
  }

  function otherUser(user) {
    return user === 'Tim' ? 'Pao' : 'Tim';
  }

  function halfSplit(amount, paid = null) {
    const total = Math.max(0, toCents(amount));
    const base = Math.floor(total / 2);
    const remainder = total - base * 2;
    const paidCents = pairCents(paid);
    const extraUser = paidCents.Tim > paidCents.Pao ? 'Tim' : 'Pao';
    return {
      Pao:fromCents(base + (extraUser === 'Pao' ? remainder : 0)),
      Tim:fromCents(base + (extraUser === 'Tim' ? remainder : 0))
    };
  }

  function percentSplit(amount, paoPercent, paid = null) {
    const percent = number(paoPercent, NaN);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return {Pao:NaN, Tim:NaN};
    if (Math.abs(percent - 50) < 1e-9) return halfSplit(amount, paid);
    const total = Math.max(0, toCents(amount));
    const pao = Math.round(total * percent / 100);
    return {Pao:fromCents(pao), Tim:fromCents(total - pao)};
  }

  function ownerFromShares(shares) {
    const value = pairCents(shares);
    if (value.Pao > 0 && value.Tim > 0) return 'Both';
    return value.Tim > 0 ? 'Tim' : 'Pao';
  }

  function payerFromPaid(paid) {
    const value = pairCents(paid);
    if (value.Pao > 0 && value.Tim > 0) return 'Both';
    return value.Tim > 0 ? 'Tim' : 'Pao';
  }

  function fallbackPair(amount, owner, paid = null) {
    if (owner === 'Both') return halfSplit(amount, paid);
    return owner === 'Tim' ? {Pao:0, Tim:fromCents(toCents(amount))} : {Pao:fromCents(toCents(amount)), Tim:0};
  }

  function expenseShares(tx) {
    const amount = Math.abs(number(tx?.amount));
    if (validPair(tx?.shares, amount)) return pair(tx.shares);
    if (validPair(tx?.split, amount)) return pair(tx.split);
    return fallbackPair(amount, tx?.owner, tx?.paid);
  }

  function expensePaid(tx) {
    const amount = Math.abs(number(tx?.amount));
    if (validPair(tx?.paid, amount)) return pair(tx.paid);
    if (tx?.payer === 'Both') return halfSplit(amount);
    return fallbackPair(amount, tx?.payer === 'Tim' ? 'Tim' : 'Pao');
  }

  function incomeShares(tx) {
    const amount = Math.abs(number(tx?.amount));
    if (validPair(tx?.shares, amount)) return pair(tx.shares);
    return fallbackPair(amount, tx?.owner);
  }

  function savingAllocations(tx) {
    if (Array.isArray(tx?.allocations) && tx.allocations.length) {
      return tx.allocations.map(item => ({
        user:USERS.includes(item?.user) ? item.user : 'Pao',
        amount:fromCents(Math.max(0, toCents(item?.amount))),
        pocketId:item?.pocketId || null
      })).filter(item => item.amount > 0);
    }
    const amount = Math.abs(number(tx?.amount));
    const shares = fallbackPair(amount, tx?.owner);
    return USERS.filter(user => toCents(shares[user]) > 0).map(user => ({user, amount:shares[user], pocketId:tx?.pocketId || null}));
  }

  function economicShare(tx, user) {
    if (!USERS.includes(user) || !tx) return 0;
    if (tx.type === 'expense') return expenseShares(tx)[user];
    if (tx.type === 'income') return incomeShares(tx)[user];
    if (tx.type === 'saving') {
      const cents = savingAllocations(tx).filter(item => item.user === user).reduce((sum,item) => sum + toCents(item.amount), 0);
      const direction = tx.direction || (number(tx.amount) < 0 ? 'out' : 'in');
      return fromCents(direction === 'out' ? -cents : cents);
    }
    return 0;
  }

  function debtDeltaPao(tx) {
    if (!tx) return 0;
    if (tx.type === 'expense') {
      const paid = expensePaid(tx), shares = expenseShares(tx);
      return fromCents(toCents(paid.Pao) - toCents(shares.Pao));
    }
    if (tx.type === 'settlement') {
      const cents = Math.abs(toCents(tx.amount));
      if (tx.from === 'Tim' && tx.to === 'Pao') return fromCents(-cents);
      if (tx.from === 'Pao' && tx.to === 'Tim') return fromCents(cents);
    }
    return 0;
  }

  function debtFor(transactions) {
    const cents = (transactions || []).reduce((sum,tx) => sum + toCents(debtDeltaPao(tx)), 0);
    return fromCents(cents);
  }

  function debtForUser(tx, user) {
    const delta = debtDeltaPao(tx);
    return user === 'Tim' ? -delta : delta;
  }

  function isSharedExpense(tx) {
    if (tx?.type !== 'expense') return false;
    const shares = pairCents(expenseShares(tx)), paid = pairCents(expensePaid(tx));
    return (shares.Pao > 0 && shares.Tim > 0) || (paid.Pao > 0 && paid.Tim > 0) || debtDeltaPao(tx) !== 0;
  }

  function totals(transactions, user) {
    const cents = {income:0, expense:0, saving:0};
    for (const tx of transactions || []) {
      if (tx.type === 'income') cents.income += toCents(economicShare(tx,user));
      else if (tx.type === 'expense') cents.expense += toCents(economicShare(tx,user));
      else if (tx.type === 'saving') cents.saving += toCents(economicShare(tx,user));
    }
    const income = fromCents(cents.income), expense = fromCents(cents.expense), saving = fromCents(cents.saving);
    return {income,expense,saving,available:fromCents(cents.income-cents.expense-cents.saving),rate:income > 0 ? Math.max(0,saving) / income * 100 : 0};
  }

  function normalizeTransaction(input) {
    const tx = {...(input || {})};
    tx.amount = fromCents(toCents(tx.amount));
    if (tx.type === 'expense') {
      tx.amount = Math.abs(tx.amount);
      tx.shares = expenseShares(tx);
      tx.paid = expensePaid(tx);
      tx.split = {...tx.shares};
      tx.owner = ownerFromShares(tx.shares);
      tx.payer = payerFromPaid(tx.paid);
    } else if (tx.type === 'income') {
      const legacyBoth = !tx.shares && tx.owner === 'Both';
      tx.amount = Math.abs(tx.amount);
      tx.shares = incomeShares(tx);
      tx.owner = ownerFromShares(tx.shares);
      if (legacyBoth) tx.needsReview = true;
    } else if (tx.type === 'saving') {
      const legacyBoth = !tx.allocations && tx.owner === 'Both';
      tx.direction = tx.direction || (tx.amount < 0 ? 'out' : 'in');
      tx.amount = Math.abs(tx.amount);
      tx.allocations = savingAllocations({...tx,amount:tx.amount});
      const savingShares = Object.fromEntries(USERS.map(user => [user,fromCents(tx.allocations.filter(item => item.user === user).reduce((sum,item) => sum + toCents(item.amount),0))]));
      tx.owner = ownerFromShares(savingShares);
      tx.pocketId = tx.allocations[0]?.pocketId || tx.pocketId || null;
      if (legacyBoth) tx.needsReview = true;
    } else if (tx.type === 'settlement') {
      tx.amount = Math.abs(tx.amount);
    }
    return tx;
  }

  return {
    USERS,
    number,
    toCents,
    fromCents,
    pair,
    pairTotal,
    validPair,
    otherUser,
    halfSplit,
    percentSplit,
    ownerFromShares,
    payerFromPaid,
    expenseShares,
    expensePaid,
    incomeShares,
    savingAllocations,
    economicShare,
    debtDeltaPao,
    debtFor,
    debtForUser,
    isSharedExpense,
    totals,
    normalizeTransaction
  };
});
