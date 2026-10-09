const {test,expect} = require('@playwright/test');

async function cleanStart(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
}

async function seedAccountingExample(page) {
  return page.evaluate(() => {
    const at = day => `${selectedMonth}-${String(day).padStart(2,'0')}T12:00:00.000Z`;
    state.settings.hideIncomeHome = false;
    state.settings.primaryUser = 'Pao';
    state.settings.users = {Pao:{name:'เปา'},Tim:{name:'ติม'}};
    state.settings.budgetsByUser = {Pao:{overall:1000,categories:{อาหาร:800}},Tim:{overall:900,categories:{อาหาร:600}}};
    state.transactions = [
      cleanTx({id:'shared-1000',type:'expense',amount:1000,shares:{Pao:500,Tim:500},paid:{Pao:1000,Tim:0},category:'อาหาร',note:'มื้อเย็นหารครึ่ง',payment:state.payments[0],datetime:at(4)}),
      cleanTx({id:'tim-own',type:'expense',amount:300,shares:{Pao:0,Tim:300},paid:{Pao:0,Tim:300},category:'เดินทาง',note:'รถของติม',payment:state.payments[0],datetime:at(5)}),
      cleanTx({id:'pao-income',type:'income',amount:2000,shares:{Pao:2000,Tim:0},category:'รายรับ',note:'รายรับเปา',datetime:at(2)}),
      cleanTx({id:'pao-saving',type:'saving',amount:100,direction:'in',allocations:[{user:'Pao',amount:100,pocketId:null}],category:'เงินเก็บ',note:'เก็บเงินเปา',datetime:at(3)}),
      cleanTx({id:'partial-return',type:'settlement',amount:200,from:'Tim',to:'Pao',note:'คืนบางส่วน',datetime:at(6)})
    ];
    save(); renderAll(); show('home',{replace:true});
    return {totals:totals(),debt:debtFor(),dailyRemaining:dailyAllowance(totals()).remaining};
  });
}

test('personal totals reconcile across Home, ledger and Summary', async ({page}) => {
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await cleanStart(page);
  const result = await seedAccountingExample(page);
  expect(result).toEqual({totals:{income:2000,expense:500,saving:100,available:1400,rate:5},debt:300,dailyRemaining:1400});
  await expect(page.locator('#expense')).toContainText('500.00');
  await expect(page.locator('#debtAmt')).toContainText('300.00');
  await expect(page.locator('#dailyHint')).toContainText('รายรับ ฿2,000.00 − รายจ่าย ฿500.00 − เงินเก็บสุทธิ ฿100.00');
  await expect(page.locator('#dailyHint')).not.toContainText('งบคงเหลือ');

  await page.evaluate(() => openHistory('all','mine'));
  await expect(page.locator('#historyList .tx')).toHaveCount(3);
  await expect(page.locator('#historyList')).not.toContainText('รถของติม');
  await page.locator('#ledgerShared').click();
  await expect(page.locator('#historyList .tx')).toHaveCount(2);
  await expect(page.locator('#historyList')).toContainText('คืนบางส่วน');
  await page.locator('#ledgerAll').click();
  await expect(page.locator('#historyList .tx')).toHaveCount(4);
  await expect(page.locator('#historyList')).toContainText('รถของติม');
  await expect(page.locator('#historyList')).not.toContainText('คืนบางส่วน');

  await page.evaluate(() => show('summary'));
  await expect(page.locator('#sInc')).toContainText('2,000.00');
  await expect(page.locator('#sExp')).toContainText('500.00');
  await expect(page.locator('#sSav')).toContainText('100.00');

  await page.evaluate(() => show('settings'));
  await page.locator('#userNamePao').fill('พี่ป๋อ');
  await page.locator('#userNameTim').fill('น้องทิม');
  await page.locator('#primaryUserInput').selectOption('Tim');
  await page.getByRole('button',{name:'บันทึกผู้ใช้งาน',exact:true}).click();
  expect(await page.evaluate(() => ({primary:primaryUser(),totals:totals()}))).toEqual({primary:'Tim',totals:{income:0,expense:800,saving:0,available:-800,rate:0}});
  await page.evaluate(() => show('home'));
  await expect(page.locator('#homeTitle')).toContainText('น้องทิม');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize({width:1440,height:1000});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('v5 storage migrates safely to v6', async ({page}) => {
  await cleanStart(page);
  await page.evaluate(() => {
    const legacy = JSON.parse(JSON.stringify(state));
    legacy.schemaVersion = 5;
    delete legacy.settings.users;
    delete legacy.settings.primaryUser;
    delete legacy.settings.budgetsByUser;
    legacy.settings.overallBudget = 1500;
    legacy.budgets = {อาหาร:1000};
    legacy.pockets = [{id:'legacy-pocket',name:'เงินฉุกเฉิน',goal:5000,openingBalance:0,icon:'💰'}];
    legacy.transactions = [{id:'legacy-expense',type:'expense',amount:1000,owner:'Both',payer:'Pao',split:{Pao:500,Tim:500},category:'อาหาร',note:'ข้อมูลเดิม',payment:legacy.payments[0],datetime:`${selectedMonth}-07T12:00:00.000Z`}];
    localStorage.setItem(KEY,JSON.stringify(legacy));
  });
  await page.reload();
  const migrated = await page.evaluate(() => ({schemaVersion:state.schemaVersion,primary:primaryUser(),tx:state.transactions[0],pocket:state.pockets[0],budget:state.settings.budgetsByUser.Pao,hasRawBackup:!!localStorage.getItem(KEY+'_before_v6')}));
  expect(migrated.schemaVersion).toBe(6);
  expect(migrated.primary).toBe('Pao');
  expect(migrated.hasRawBackup).toBe(true);
  expect(migrated.tx.shares).toEqual({Pao:500,Tim:500});
  expect(migrated.tx.paid).toEqual({Pao:1000,Tim:0});
  expect(migrated.budget).toEqual({overall:1500,categories:{อาหาร:1000}});
  expect(migrated.pocket).toMatchObject({owner:'Pao',needsReview:true});
});

test('shared form previews multi-payer percentage split and settlement', async ({page}) => {
  await cleanStart(page);
  await page.evaluate(() => openEntry('expense'));
  await page.locator('[data-owner="Both"]').click();
  await page.locator('[data-payer="Both"]').click();
  await page.locator('[data-split="percent"]').click();
  await page.locator('#amount').fill('1000.01');
  await page.locator('#paoPercent').fill('60');
  await page.locator('#paidPao').fill('700.01');
  await page.evaluate(() => { $('cat').value = state.categories.expense[0]; $('note').value = 'บิลหลายคนจ่าย'; updateFormSummary(); });
  await expect(page.locator('#formSummary')).toContainText('฿600.01');
  await expect(page.locator('#formSummary')).toContainText('฿400.00');
  await expect(page.locator('#formSummary')).toContainText('฿100.00');
  await page.locator('#saveTxButton').click();
  expect(await page.evaluate(() => ({tx:state.transactions[0],debt:debtFor(),totals:totals()}))).toMatchObject({
    tx:{shares:{Pao:600.01,Tim:400},paid:{Pao:700.01,Tim:300}},
    debt:100,
    totals:{expense:600.01}
  });

  await page.evaluate(() => settleDebt());
  await page.locator('#settlementAmount').fill('100');
  await page.locator('#settlementModal [type="submit"]').click();
  expect(await page.evaluate(() => ({debt:debtFor(),totals:totals(),settlements:state.transactions.filter(tx => tx.type === 'settlement').length}))).toEqual({debt:0,totals:{income:0,expense:600.01,saving:0,available:-600.01,rate:0},settlements:1});

  const expenseId = await page.evaluate(() => state.transactions.find(tx => tx.type === 'expense').id);
  await page.evaluate(id => editTx(id),expenseId);
  await page.locator('#paidPao').fill('1000.01');
  let editMessage = '';
  page.once('dialog',async dialog => { editMessage = dialog.message(); await dialog.accept(); });
  await page.locator('#saveTxButton').click();
  expect(editMessage).toMatch(/฿0\.00.*฿300\.00/);
  await expect.poll(() => page.evaluate(() => debtFor())).toBe(300);

  await page.evaluate(id => openTx(id),expenseId);
  let deleteMessage = '';
  page.once('dialog',async dialog => { deleteMessage = dialog.message(); await dialog.dismiss(); });
  await page.locator('#txDeleteButton').click();
  expect(deleteMessage).toMatch(/฿300\.00.*฿100\.00/);
  expect(await page.evaluate(() => debtFor())).toBe(300);
});

test('monthly income creates a reusable schedule and records the due month', async ({page}) => {
  await cleanStart(page);
  await page.evaluate(() => openEntry('monthly-income'));
  await expect(page.locator('#formTitle')).toHaveText('เพิ่มรายรับประจำเดือน');
  await expect(page.locator('#monthlyBox')).toBeVisible();
  await expect(page.locator('#amountLabel')).toHaveText('รับเดือนละ (บาท)');

  await page.locator('#planName').fill('เงินเดือนประจำ');
  await page.locator('#amount').fill('30000');
  await page.locator('[data-incowner="Both"]').click();
  await page.locator('#incomePao').fill('18000');
  await page.locator('#monthlyStart').fill(await page.evaluate(() => selectedMonth));
  await page.locator('#monthlyDay').selectOption('1');
  await page.locator('#saveTxButton').click();

  const result = await page.evaluate(() => ({
    schedule:state.recurring.find(rec => rec.kind === 'monthly-income'),
    transaction:state.transactions.find(tx => tx.recurringGenerated && tx.type === 'income'),
    paoTotals:totals(state.transactions,'Pao'),
    timTotals:totals(state.transactions,'Tim')
  }));
  expect(result.schedule).toMatchObject({kind:'monthly-income',frequency:'monthly',dayOfMonth:1,template:{type:'income',amount:30000,shares:{Pao:18000,Tim:12000}}});
  expect(result.transaction).toMatchObject({type:'income',amount:30000,shares:{Pao:18000,Tim:12000},recurringGenerated:true});
  expect(result.paoTotals.income).toBe(18000);
  expect(result.timTotals.income).toBe(12000);

  const scheduleId = result.schedule.id;
  await page.evaluate(() => show('settings'));
  await page.getByRole('button',{name:'แก้ไขรายการประจำ เงินเดือนประจำ'}).click();
  await expect(page.locator('#formTitle')).toHaveText('แก้ไขรายรับประจำเดือน');
  await expect(page.locator('#entryKind')).toBeDisabled();
  await page.locator('#amount').fill('31000');
  await page.locator('#incomePao').fill('19000');
  await page.locator('#saveTxButton').click();

  const edited = await page.evaluate(() => ({
    schedules:state.recurring.filter(rec => rec.kind === 'monthly-income'),
    past:state.transactions.find(tx => tx.recurringGenerated && tx.type === 'income')
  }));
  expect(edited.schedules).toHaveLength(1);
  expect(edited.schedules[0]).toMatchObject({id:scheduleId,template:{amount:31000,shares:{Pao:19000,Tim:12000}}});
  expect(edited.past).toMatchObject({amount:30000,shares:{Pao:18000,Tim:12000}});

  await page.evaluate(() => {
    window.open = url => { window.__sheetUrl = url; return {}; };
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text => { window.__sheetTsv = text; }}});
  });
  await page.getByRole('button',{name:'เปิด Google Sheets',exact:true}).click();
  const sheetExport = await page.evaluate(() => ({url:window.__sheetUrl,tsv:window.__sheetTsv}));
  expect(sheetExport.url).toBe('https://sheets.new');
  expect(sheetExport.tsv).toContain('datetime\ttype\tgross_amount');
  expect(sheetExport.tsv).toContain('\tincome\t30000\t');
});
