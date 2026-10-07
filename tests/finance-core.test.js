const test = require('node:test');
const assert = require('node:assert/strict');
const Finance = require('../finance-core.js');

test('shared expense uses responsibility share while debt uses who paid', () => {
  const tx = Finance.normalizeTransaction({type:'expense',amount:1000,shares:{Pao:500,Tim:500},paid:{Pao:1000,Tim:0}});
  assert.equal(Finance.economicShare(tx,'Pao'),500);
  assert.equal(Finance.economicShare(tx,'Tim'),500);
  assert.equal(Finance.debtDeltaPao(tx),500);
});

test('partner-only self-paid expense does not affect Pao', () => {
  const tx = Finance.normalizeTransaction({type:'expense',amount:400,shares:{Pao:0,Tim:400},paid:{Pao:0,Tim:400}});
  assert.equal(Finance.economicShare(tx,'Pao'),0);
  assert.equal(Finance.debtDeltaPao(tx),0);
});

test('cross-paid personal expense creates debt in the correct direction', () => {
  const tx = Finance.normalizeTransaction({type:'expense',amount:750,shares:{Pao:750,Tim:0},paid:{Pao:0,Tim:750}});
  assert.equal(Finance.debtDeltaPao(tx),-750);
  assert.equal(Finance.debtForUser(tx,'Pao'),-750);
  assert.equal(Finance.debtForUser(tx,'Tim'),750);
});

test('multi-payer expense compares payment and responsibility independently', () => {
  const tx = Finance.normalizeTransaction({type:'expense',amount:1000,shares:{Pao:600,Tim:400},paid:{Pao:700,Tim:300}});
  assert.equal(Finance.debtDeltaPao(tx),100);
});

test('half split assigns an odd satang to the larger payer and otherwise Pao', () => {
  assert.deepEqual(Finance.halfSplit(100.01,{Pao:0,Tim:100.01}),{Pao:50,Tim:50.01});
  assert.deepEqual(Finance.halfSplit(100.01,{Pao:50.005,Tim:50.005}),{Pao:50.01,Tim:50});
});

test('settlement offsets debt without entering personal totals', () => {
  const expense = Finance.normalizeTransaction({type:'expense',amount:1000,shares:{Pao:500,Tim:500},paid:{Pao:1000,Tim:0}});
  const settlement = Finance.normalizeTransaction({type:'settlement',amount:200,from:'Tim',to:'Pao'});
  assert.equal(Finance.debtFor([expense,settlement]),300);
  assert.deepEqual(Finance.totals([expense,settlement],'Pao'),{income:0,expense:500,saving:0,available:-500,rate:0});
});

test('shared income and saving are projected per user', () => {
  const income = Finance.normalizeTransaction({type:'income',amount:900,shares:{Pao:600,Tim:300}});
  const saving = Finance.normalizeTransaction({type:'saving',amount:300,direction:'in',allocations:[{user:'Pao',amount:200,pocketId:'a'},{user:'Tim',amount:100,pocketId:'b'}]});
  assert.deepEqual(Finance.totals([income,saving],'Pao'),{income:600,expense:0,saving:200,available:400,rate:200/600*100});
});

test('legacy expense migrates split and payer without changing meaning', () => {
  const tx = Finance.normalizeTransaction({type:'expense',amount:300,owner:'Both',payer:'Tim',split:{Pao:120,Tim:180}});
  assert.deepEqual(tx.shares,{Pao:120,Tim:180});
  assert.deepEqual(tx.paid,{Pao:0,Tim:300});
  assert.equal(Finance.debtDeltaPao(tx),-120);
});
