const {test,expect} = require('@playwright/test');

async function seed(page) {
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  await page.evaluate(() => {
    state.projects = [{id:'trip',name:'ทริปข้ามปี',status:'Active',budget:10000,budgetTotal:10000,budgetShares:{Pao:5000,Tim:5000}}];
    const common = {projectId:'trip',category:'อาหาร',payment:state.payments[0]};
    state.transactions = [
      cleanTx({...common,id:'shared',type:'expense',amount:1000,shares:{Pao:500,Tim:500},paid:{Pao:1000,Tim:0},note:'มื้อร่วม',datetime:'2025-12-15T05:00:00Z'}),
      cleanTx({...common,id:'partner',type:'expense',amount:300,shares:{Pao:0,Tim:300},paid:{Pao:0,Tim:300},note:'ส่วนติม',datetime:'2026-01-15T05:00:00Z'}),
      cleanTx({...common,id:'income',type:'income',amount:2000,shares:{Pao:2000,Tim:0},note:'รายรับทริป',datetime:'2026-01-16T05:00:00Z'}),
      cleanTx({...common,id:'saving',type:'saving',amount:100,direction:'in',allocations:[{user:'Pao',amount:100,pocketId:null}],note:'ออมทริป',datetime:'2026-01-17T05:00:00Z'}),
      cleanTx({...common,id:'withdraw',type:'saving',amount:50,direction:'out',allocations:[{user:'Pao',amount:50,pocketId:null}],note:'ถอนทริป',datetime:'2026-01-18T05:00:00Z'}),
      cleanTx({id:'return',type:'settlement',amount:200,from:'Tim',to:'Pao',note:'คืนเงินทริป',datetime:'2026-01-19T05:00:00Z'})
    ];
    state.settings.primaryUser = 'Pao'; save(); selectedMonth = '2026-01'; historyPeriod = 'all'; renderAll(); openProject('trip');
  });
}

test('project periods are independent; both layouts reconcile gross and personal amounts',async ({page}) => {
  await seed(page);
  const project = page.locator('#project_trip');
  await expect(project.locator('.project-transactions [data-tx-id]')).toHaveCount(5);
  await expect(project.locator('[data-tx-id="partner"]')).toContainText('฿300.00');
  await expect(project.locator('[data-tx-id="partner"]')).toContainText('฿0.00');
  await expect(project.locator('.project-period-summary')).toContainText('฿1,300.00');
  const stats = await project.locator('.compact-project-stats').innerText();
  await page.evaluate(() => setPeriod('2026-08'));
  await expect(project.locator('.project-transactions [data-tx-id]')).toHaveCount(5);
  await project.locator('[data-layout="table"]').click();
  await expect(project.locator('tbody tr')).toHaveCount(5);
  await expect(project.locator('[data-tx-id="withdraw"]')).toContainText('ถอนเงิน');
  await expect(project.locator('[data-tx-id="saving"]')).toContainText('ออมเข้า');
  await project.locator('select').selectOption('2025-12');
  await expect(project.locator('tbody tr')).toHaveCount(1);
  await expect(project.locator('.project-period-summary')).toContainText('฿500.00');
  expect(await project.locator('.compact-project-stats').innerText()).toBe(stats);
  await page.evaluate(() => setPeriod('2026-09'));
  await expect(project.locator('select')).toHaveValue('2025-12');
  await project.locator('[data-layout="list"]').click();
  await expect(project.locator('.project-transactions [data-tx-id]')).toHaveCount(1);
  await project.locator('[data-layout="table"]').click();
  await page.reload();
  await page.evaluate(() => openProject('trip'));
  await expect(project.locator('select')).toHaveValue('all');
  await expect(project.locator('tbody tr')).toHaveCount(5);
});

test('history preserves filters, supports keyboard details and editing, and remembers only its own layout',async ({page}) => {
  await seed(page);
  await page.evaluate(() => { show('history'); historyPeriod = 'all'; renderPeriodOptions(); renderHistory(); });
  await page.locator('#historyViewToggle [data-layout="table"]').click();
  await page.locator('#ledgerAll').click();
  await expect(page.locator('#historyPeriod')).toHaveValue('all');
  await expect(page.locator('#historyList tbody tr')).toHaveCount(5);
  await page.locator('#search').fill('มื้อร่วม');
  await expect(page.locator('#historyList tbody tr')).toHaveCount(1);
  await page.locator('#historyViewToggle [data-layout="list"]').click();
  await expect(page.locator('#historyList [data-tx-id]')).toHaveCount(1);
  await page.locator('#historyViewToggle [data-layout="table"]').click();
  const title = page.locator('#historyList .table-title');
  await title.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#txModal')).toHaveClass(/show/);
  await page.locator('#txEditButton').click();
  await page.locator('#amount').fill('1200');
  page.once('dialog',dialog => dialog.accept());
  await page.locator('#saveTxButton').click();
  await page.evaluate(() => show('history'));
  await expect(page.locator('#historyList tbody')).toContainText('฿1,200.00');
  await page.locator('#history .filter-panel summary').click();
  await page.locator('#history .filter-status button').click();
  await expect(page.locator('#ledgerAll')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#historyPeriod')).toHaveValue('all');
  await page.locator('#ledgerShared').click();
  await expect(page.locator('#historyList [data-tx-id="return"]')).toContainText('—');
  await page.reload();
  await page.evaluate(() => show('history'));
  await expect(page.locator('#historyViewToggle [data-layout="table"]')).toHaveAttribute('aria-pressed','true');
  await page.evaluate(() => openProject('trip'));
  await expect(page.locator('#project_trip [data-layout="list"]')).toHaveAttribute('aria-pressed','true');
});

for (const width of [390,414,1440]) test(`layouts stay inside viewport at ${width}px`,async ({page}) => {
  const errors = []; page.on('pageerror',error => errors.push(error.message));
  await page.setViewportSize({width,height:896}); await seed(page);
  await page.locator('#project_trip [data-layout="table"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
  if (width < 720) expect(await page.locator('#project_trip .table-scroll').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.screenshot({path:`output/playwright/projects-${width}.png`,fullPage:true});
  await page.evaluate(() => { show('history'); historyPeriod = 'all'; renderPeriodOptions(); renderHistory(); });
  await page.locator('#historyViewToggle [data-layout="table"]').click();
  await page.locator('#history .filter-panel summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1)).toBe(true);
  await page.screenshot({path:`output/playwright/history-${width}.png`,fullPage:true});
  expect(errors).toEqual([]);
});

test('unavailable preference storage falls back to list without changing accounting',async ({page}) => {
  await seed(page);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.locator('#project_trip [data-layout="table"]').click();
  await expect(page.locator('#project_trip [data-layout="list"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#project_trip .project-transactions [data-tx-id]')).toHaveCount(5);
});

test('mobile project detail starts with transactions and adds into the selected project',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await seed(page);
  await expect(page.locator('#projectBudgetDetails')).not.toHaveAttribute('open','');
  const first=await page.locator('#project_trip .project-transactions [data-tx-id]').first().boundingBox();
  expect(first.y+first.height).toBeLessThan(650);
  await expect(page.locator('#fab')).toBeHidden();
  await page.locator('.project-add-dock button').click();
  await expect(page.locator('#project')).toHaveValue('trip');
  await page.locator('#amount').fill('77');
  await page.evaluate(() => { $('cat').value=state.categories.expense[0]; $('note').value='รายจ่ายใหม่ในทริป'; updateFormSummary(); });
  await page.locator('#saveTxButton').click();
  await expect(page.locator('#project_trip')).toBeVisible();
  await expect(page.locator('.project-transactions')).toContainText('รายจ่ายใหม่ในทริป');
  await page.locator('#backButton').click();
  await expect(page.locator('.project-overview')).toHaveCount(1);
  await page.locator('.project-open').click();
  await expect(page.locator('#project_trip')).toBeVisible();
});

test('phone back closes only the modal; edit returns to the project and scroll position',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await seed(page);
  await page.locator('#project_trip [data-tx-id="shared"]').click();
  await expect(page.locator('#txModal')).toBeVisible();
  const before=await page.evaluate(()=>window.scrollY);
  await page.goBack();
  await expect(page.locator('#txModal')).toBeHidden();
  await expect(page.locator('#project_trip')).toBeVisible();
  expect(await page.evaluate(()=>currentView())).toBe('projects');
  expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(3);
  await page.locator('#project_trip [data-tx-id="shared"]').click();
  await page.locator('#txEditButton').click();
  await expect(page.locator('#add')).toHaveClass(/active/);
  await page.locator('#note').fill('แก้ไขมื้อร่วม');
  await page.locator('#saveTxButton').click();
  await expect(page.locator('#project_trip')).toBeVisible();
  await expect(page.locator('#project_trip [data-tx-id="shared"]')).toContainText('แก้ไขมื้อร่วม');
  await expect.poll(async()=>Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(6);
});

test('project draft survives leaving the app and reloading without mixing with general drafts',async ({page}) => {
  await seed(page);
  await page.evaluate(()=>{openEntry('expense'); $('amount').value='11'; stashDraft(); show('projects'); openProject('trip');});
  await page.locator('.project-add-dock button').click();
  await page.locator('#amount').fill('89.50');
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await page.reload();
  await expect(page.locator('#amount')).toHaveValue('89.50');
  await expect(page.locator('#project')).toHaveValue('trip');
  await page.evaluate(()=>{show('home');openEntry('expense');});
  await expect(page.locator('#amount')).toHaveValue('11');
  await page.evaluate(()=>{show('projects');openProject('trip');});
  await page.locator('.project-add-dock button').click();
  await expect(page.locator('#amount')).toHaveValue('89.50');
});

test('mobile table shows amount beside name, retains horizontal position, and keyboard dock fits visible viewport',async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await seed(page);
  await page.locator('#project_trip [data-layout="table"]').click();
  const columns=await page.locator('#project_trip th').allTextContents();
  expect(columns.slice(0,3)).toEqual(['รายการ','ส่วนของเปา','ยอดเต็ม']);
  const share=await page.locator('#project_trip tbody tr').first().locator('td').nth(1).boundingBox();
  expect(share.x+share.width).toBeLessThan(390);
  await page.locator('#project_trip .table-scroll').evaluate(el=>{el.scrollLeft=190;el.dispatchEvent(new Event('scroll'));});
  await page.evaluate(()=>renderAll());
  await expect.poll(()=>page.locator('#project_trip .table-scroll').evaluate(el=>el.scrollLeft)).toBe(190);
  await page.locator('.project-add-dock button').click();
  await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:500}); updateViewportInsets();});
  await expect(page.locator('body')).toHaveClass(/keyboard-open/);
  const save=await page.locator('#saveTxButton').boundingBox();
  expect(save.y).toBeGreaterThan(0); expect(save.y+save.height).toBeLessThanOrEqual(500);
  await expect(page.locator('.bottom')).toBeHidden();
  expect(await page.locator('#note').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
});
