const KEY='pao_tim_money_mock_v5';
const DEF={
 settings:{theme:'light',defaultPayment:'เงินสด',overallBudget:0,fabPos:null,hideIncomeHome:true},
 categories:{expense:['อาหาร','กาแฟ / เครื่องดื่ม','ของใช้ / Grocery','เดินทาง','ที่พัก','บ้าน / คอนโด','ค่าน้ำไฟ / Internet','Shopping','Entertainment','ท่องเที่ยว','สุขภาพ','ของขวัญ','Subscription','Finance / Fee','อื่นๆ'],income:['เงินเดือน','Bonus','Freelance','Investment','Refund','เงินได้รับ','อื่นๆ']},
 payments:['เงินสด','บัญชีธนาคาร','บัตรเครดิต','พร้อมเพย์'],
 budgets:{},
 pockets:[],
 projects:[],
 transactions:[],
 recurring:[]
};
let form={type:'expense',payer:'Pao',owner:'Pao',incOwner:'Pao',savOwner:'Pao',split:'half',splitAnchor:null,paidAnchor:null,incomeAnchor:null,savingAnchor:null,recurring:false,installment:false,monthly:false,editId:null,recurringEditId:null,catExpanded:false};
function id(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function clone(x){return JSON.parse(JSON.stringify(x))}
function save() {
  if (storageReadBlocked) throw storageFailure('อ่านข้อมูลเดิมไม่ได้ กรุณาสำรองข้อมูลหรือเปิดเบราว์เซอร์นี้ใหม่ก่อนบันทึก');
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    lastSavedState = clone(state);
    $('storageError').hidden = true;
  } catch (error) {
    state = clone(lastSavedState);
    throw storageFailure('พื้นที่จัดเก็บอาจเต็มหรือถูกปิดกั้น ข้อมูลเดิมยังอยู่ กรุณาแก้ไขพื้นที่จัดเก็บแล้วกดบันทึกอีกครั้ง');
  }
}
function num(x,fallback=0){const n=Number(x);return Number.isFinite(n)?n:fallback}
function cleanList(x,fallback){return Array.isArray(x)?x:clone(fallback)}
function cleanObject(x,fallback={}){return x&&typeof x==='object'&&!Array.isArray(x)?x:clone(fallback)}
function cleanFabPos(x){if(!x||typeof x!=='object')return null;const px=num(x.x,NaN),py=num(x.y,NaN);return Number.isFinite(px)&&Number.isFinite(py)?{x:px,y:py}:null}
function cleanBudgetMap(x){const out={};Object.entries(cleanObject(x)).forEach(([k,v])=>{const n=num(v);if(n>0)out[k]=n});return out}
function cleanTx(t={}){const tx={...cleanObject(t),amount:num(t.amount)};if(tx.split)tx.split={Pao:num(tx.split.Pao),Tim:num(tx.split.Tim)};return tx}
function cleanPocket(p={}){return {...cleanObject(p),goal:Math.max(0,num(p.goal)),openingBalance:Math.max(0,num(p.openingBalance))}}
function cleanProject(p={}){return {...cleanObject(p),budget:Math.max(0,num(p.budget))}}
function cleanRecurring(r={}){
 const rec={...cleanObject(r)};
 const next=new Date(rec.nextRun);
 const fallbackDay=Number.isFinite(next.getTime())?next.getDate():new Date().getDate();
 rec.enabled=rec.enabled!==false;
 rec.frequency=['daily','weekly','monthly'].includes(rec.frequency)?rec.frequency:'monthly';
 rec.nextRun=Number.isFinite(next.getTime())?next.toISOString():new Date().toISOString();
 rec.dayOfMonth=Math.min(31,Math.max(1,Math.round(num(rec.dayOfMonth,fallbackDay))));
 rec.template=cleanTx(rec.template||{});
 if(rec.kind==='installment'){
   rec.frequency='monthly';
   rec.totalInstallments=Math.min(600,Math.max(1,Math.round(num(rec.totalInstallments,1))));
   rec.completedInstallments=Math.min(rec.totalInstallments,Math.max(0,Math.round(num(rec.completedInstallments))));
   if (rec.installmentTotalAmount != null && rec.installmentTotalSplit) {
     rec.installmentTotalAmount = num(rec.installmentTotalAmount);
     rec.installmentTotalSplit = {Pao:num(rec.installmentTotalSplit.Pao),Tim:num(rec.installmentTotalSplit.Tim)};
   }
   if(rec.completedInstallments===rec.totalInstallments)rec.enabled=false;
 }
 return rec
}
function normalizeState(x={}){
 const s=clone(DEF);
 if(!x||typeof x!=='object')return s;
 const settings=cleanObject(x.settings);
 s.settings={...s.settings,...settings};
 s.settings.theme=s.settings.theme==='dark'?'dark':'light';
 s.settings.fabPos=cleanFabPos(settings.fabPos);
 s.settings.hideIncomeHome=settings.hideIncomeHome!==false;
 s.categories={
   expense:cleanList(x.categories?.expense,DEF.categories.expense),
   income:cleanList(x.categories?.income,DEF.categories.income)
 };
 s.payments=cleanList(x.payments,DEF.payments).map(p=>String(p).trim()).filter(Boolean);
 if(!s.payments.length)s.payments=clone(DEF.payments);
 if(!s.payments.includes(s.settings.defaultPayment))s.settings.defaultPayment=s.payments[0];
 s.budgets=cleanBudgetMap(x.budgets);
 s.pockets=cleanList(x.pockets,DEF.pockets).map(cleanPocket);
 s.projects=cleanList(x.projects,DEF.projects).map(cleanProject);
 s.transactions=cleanList(x.transactions,DEF.transactions).map(cleanTx);
 s.recurring=cleanList(x.recurring,DEF.recurring).map(cleanRecurring);
 return s
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalizeState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.transactions)) throw Error('invalid');
    return normalizeState(parsed);
  } catch (error) {
    storageReadBlocked = true;
    return normalizeState();
  }
}
let storageReadBlocked = false;
let state = load();
let lastSavedState = clone(state);
const $=id=>document.getElementById(id);
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let lastFocused=null;
function focusables(root){return [...root.querySelectorAll(FOCUSABLE)].filter(el=>!el.hidden&&el.offsetParent!==null)}
function openModal(id, focusSelector) {
  const modal = $(id);
  if (!modal) return;
  lastFocused = document.activeElement;
  document.querySelectorAll('.modal.show').forEach(x => closeModal(x.id, false));
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  document.querySelector('.app').inert = true;
  document.querySelector('.bottom').inert = true;
  $('fab').inert = true;
  const target = (focusSelector ? modal.querySelector(focusSelector) : null) || focusables(modal)[0] || modal.querySelector('.modalcard');
  target?.focus();
}
function closeModal(id, restoreFocus = true) {
  const modal = $(id);
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  document.querySelector('.app').inert = false;
  document.querySelector('.bottom').inert = false;
  $('fab').inert = false;
  const target = lastFocused;
  lastFocused = null;
  if (restoreFocus && target?.isConnected) target.focus({preventScroll:true});
}
function visibleModal(){const xs=[...document.querySelectorAll('.modal.show')];return xs[xs.length-1]}
function closeTopModal() {
  const modal = visibleModal();
  if (!modal) return;
  if (modal.id === 'restoreModal') cancelRestore();
  else if (modal.id === 'projectModal') closeProjectModal();
  else if (modal.id === 'pocketModal') closePocketModal();
  else closeModal(modal.id);
}
function syncPressed(selector){document.querySelectorAll(selector).forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('active')?'true':'false'))}
function syncA11yState() {
  document.querySelectorAll('button[data-view]').forEach(b => {
    if (b.classList.contains('active')) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  ['#expTab','#incTab','#savTab','[data-payer]','[data-owner]','[data-incowner]','[data-savowner]','[data-split]'].forEach(syncPressed);
  $('recSwitch').setAttribute('aria-pressed', String(form.recurring));
  $('recBox').setAttribute('aria-hidden', String(!form.recurring));
  $('themeSwitch').setAttribute('aria-pressed', String(state.settings.theme === 'dark'));
  $('homeIncomeSwitch').setAttribute('aria-pressed', String(state.settings.hideIncomeHome !== false));
  document.querySelectorAll('[data-disclosure]').forEach(b => b.setAttribute('aria-expanded', String($(b.dataset.disclosure)?.classList.contains('expanded'))));
}
document.addEventListener('keydown',e=>{
 const modal=visibleModal();
 if(modal){
  if(e.key==='Escape'){e.preventDefault();closeTopModal();return}
  if(e.key==='Tab'){
   const xs=focusables(modal);if(!xs.length){e.preventDefault();return}
   const first=xs[0],last=xs[xs.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 }
 const card=e.target.closest?.('.go-card,.detail-row[role="button"]');
 if(card&&!e.target.closest('button,input,select,textarea,a,label')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();card.click()}
});
document.addEventListener('input',e=>{
 if(['projectNameInput','projectBudgetInput'].includes(e.target?.id))updateProjectPreview();
 if(['pocketNameInput','pocketGoalInput','pocketOpeningInput'].includes(e.target?.id))updatePocketPreview();
});
document.addEventListener('change',e=>{
 if(['projectIconInput','projectStatusInput'].includes(e.target?.id))updateProjectPreview();
 if(['pocketIconInput','pocketProjectInput'].includes(e.target?.id))updatePocketPreview();
});
function money(n){return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:2}).format(Number(n||0))}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function who(x){return x==='Pao'?'เปา':x==='Tim'?'ติม':'ทั้งคู่'}
function ldt(d=new Date()){const p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`}
function toastMsg(message, undo = null) {
  clearTimeout(toastTimer);
  undoAction = undo;
  $('toastText').textContent = message;
  $('toastUndo').hidden = !undo;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; undoAction = null; }, undo ? 10000 : 4500);
}
function currentView(){return document.querySelector('.view.active')?.id||'home'}
function syncBackButton() {
  const canGoBack = currentView() === 'add' || !!route.detail;
  $('backButton').hidden = !canGoBack;
  $('backButton').disabled = !canGoBack;
}
function syncAddControls(view = currentView()) {
  document.body.dataset.view = view;
  document.querySelectorAll('button[data-view="add"]').forEach(b => { b.hidden = view === 'add'; b.textContent = '＋ เพิ่มรายการ'; });
}
function handleAddControl() { openAddSheet(); }
function show(view, options = {}) {
  if (!['home','history','summary','projects','settings','add'].includes(view)) return;
  if (visibleModal()) closeTopModal();
  const previous = currentView();
  viewScroll[previous] = window.scrollY;
  if (previous === 'add' && !options.saved) stashDraft();
  if (!options.fromPop && !restoringRoute) {
    history.replaceState({...route, scroll:window.scrollY, app:'pt-money'}, '', location.href);
    route = {app:'pt-money', view, detail:options.detail || (view === 'add' ? 'form' : null), from:options.from || (view === 'add' ? previous : null), editId:view === 'add' ? form.editId : null, recurringEditId:view === 'add' ? form.recurringEditId : null, entryKind:view === 'add' ? entryKindFor() : null, scroll:options.restore ? (viewScroll[view] || 0) : 0};
    const url = '#' + view;
    if (options.replace || previous === 'add') history.replaceState(route, '', url);
    else if (previous !== view || options.detail) history.pushState(route, '', url);
  }
  document.querySelectorAll('.view').forEach(x => x.classList.toggle('active', x.id === view));
  document.querySelectorAll('button[data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === view));
  renderAll();
  requestAnimationFrame(() => {
    const y = options.restore ? (viewScroll[view] || 0) : (options.fromPop ? route.scroll || 0 : 0);
    window.scrollTo({top:y, behavior:'instant'});
    $(view).querySelector('h1')?.focus({preventScroll:true});
    if (options.target) focusSetting(options.target);
  });
}
function goBack() {
  if (visibleModal()) return closeTopModal();
  const target = route.from || 'home';
  show(target, {replace:true, restore:true});
}
function openHistory(type = 'all', owner = 'all') {
  $('typeFilter').value = type;
  $('ownerFilter').value = owner;
  $('search').value = '';
  $('projectFilter').value = 'all';
  historyPeriod = selectedMonth;
  renderPeriodOptions();
  show('history', {detail:'period', from:currentView()});
}
function openAddSheet(){openModal('addSheet','.sheet-option')}
function closeAddSheet(){closeModal('addSheet')}
function startAdd(type='expense'){closeAddSheet();openEntry(type)}
function openAdd(typeOrRecurring = 'expense', withRecurring = false) {
  const type = typeof typeOrRecurring === 'boolean' ? 'expense' : typeOrRecurring || 'expense';
  const recurring = typeof typeOrRecurring === 'boolean' ? typeOrRecurring : withRecurring;
  openEntry(recurring && type === 'expense' ? 'monthly' : type);
  if (recurring && type !== 'expense') { toggleRecurring(true); $('optionalDetails').open = true; }
}
function entryKindFor(value = form) {
  if (value.type === 'expense') return value.installment ? 'installment' : value.monthly || value.recurring ? 'monthly' : 'expense';
  if (value.type === 'income' && value.monthly) return 'monthly-income';
  return value.type;
}
function entryLabel(kind) { return ({expense:'รายจ่ายทั่วไป',installment:'รายจ่ายผ่อน',monthly:'รายจ่ายประจำเดือน',income:'รายรับ','monthly-income':'รายรับประจำเดือน',saving:'เงินเก็บ'})[kind] || 'รายการ'; }
function currentDraftKey() { return form.recurringEditId ? 'recurring_' + form.recurringEditId : form.editId || 'new_' + entryKindFor(); }
function openEntry(kind = 'expense', options = {}) {
  if (!['expense','installment','monthly','income','monthly-income','saving'].includes(kind)) kind = 'expense';
  const previous = currentView() === 'add' ? route.from || 'home' : currentView();
  if (!options.fresh) stashDraft();
  resetForm();
  const draftKey = 'new_' + kind;
  if (draftCache.new && entryKindFor(draftCache.new.form) === kind && !draftCache[draftKey]) { draftCache[draftKey] = draftCache.new; delete draftCache.new; }
  if (options.fresh || !restoreDraft(draftKey)) {
    setType(['installment','monthly'].includes(kind) ? 'expense' : kind === 'monthly-income' ? 'income' : kind);
    form.monthly = kind === 'monthly' || kind === 'monthly-income';
    form.installment = kind === 'installment';
    syncInstallmentForm(); updateFormSummary();
    formBaseline = draftSignature();
  }
  show('add', {from:previous});
  if (!form.editId && !$('amount').value) $('amount').focus({preventScroll:true});
}
function openInstallment() { openEntry('installment'); }
function changeEntryKind(kind) {
  if (form.recurringEditId) return;
  if (form.editId) { setType(kind); return; }
  // The select changes before the old draft is captured; keep its original kind.
  $('entryKind').value = entryKindFor();
  openEntry(kind);
}
document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>b.dataset.view==='add'?handleAddControl():show(b.dataset.view)));
document.addEventListener('click',e=>{const cat=e.target.closest?.('[data-cat-choice]');if(cat){setCategory(cat.dataset.catChoice);return}if(e.target.closest?.('[data-cat-toggle]'))toggleCats()});
function toggleCard(id){const el=$(id);if(!el)return;el.classList.toggle('expanded');syncA11yState()}
function projectById(id){return state.projects.find(p=>p.id===id)}
function pocketById(id){return state.pockets.find(p=>p.id===id)}
function currentMonthTx() { return state.transactions.filter(t => monthKey(t.datetime) === selectedMonth); }
function expenseShare(tx, owner = 'Pao') {
  if (tx.type !== 'expense') return 0;
  if (tx.split) return num(tx.split[owner]);
  return tx.owner === owner ? tx.amount : tx.owner === 'Both' ? Math.round(tx.amount * 100 / 2) / 100 : 0;
}
function paoExpenseTotal(list = currentMonthTx()) { return list.reduce((sum,tx) => sum + Math.round(expenseShare(tx) * 100), 0) / 100; }
function totals(){const x=currentMonthTx(),income=x.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),expense=x.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),saving=x.filter(t=>t.type==='saving').reduce((s,t)=>s+t.amount,0);return{income,expense,saving,available:income-expense-saving,rate:income?saving/income*100:0}}
function pocketBalance(pid){const p=pocketById(pid);return Number(p?.openingBalance||0)+state.transactions.filter(t=>t.type==='saving'&&t.pocketId===pid).reduce((s,t)=>s+t.amount,0)}
function projectSpend(pid,monthOnly=false){const list=(monthOnly?currentMonthTx():state.transactions).filter(t=>t.type==='expense'&&t.projectId===pid);return list.reduce((s,t)=>s+t.amount,0)}
function projectSaving(pid){const linkedPocketIds=new Set(state.pockets.filter(p=>p.projectId===pid).map(p=>p.id));const pocketTotal=[...linkedPocketIds].reduce((s,pid)=>s+pocketBalance(pid),0);const directTotal=state.transactions.filter(t=>t.type==='saving'&&t.projectId===pid&&!linkedPocketIds.has(t.pocketId)).reduce((s,t)=>s+t.amount,0);return pocketTotal+directTotal}
function debtFor(list=state.transactions){let b=0;list.forEach(t=>{if(t.type==='expense'){if(t.payer==='Pao')b+=t.split?.Tim||0;if(t.payer==='Tim')b-=t.split?.Pao||0}else if(t.type==='settlement'){if(t.from==='Tim'&&t.to==='Pao')b-=t.amount;if(t.from==='Pao'&&t.to==='Tim')b+=t.amount}});return b}
function debtTx(){const expenseRows=state.transactions.filter(t=>t.type==='expense').map(t=>({...t,timOwes:t.payer==='Pao'?Number(t.split?.Tim||0):0,paoOwes:t.payer==='Tim'?Number(t.split?.Pao||0):0}));const settlementRows=state.transactions.filter(t=>t.type==='settlement').map(t=>({...t,timOwes:t.from==='Pao'&&t.to==='Tim'?Number(t.amount||0):0,paoOwes:t.from==='Tim'&&t.to==='Pao'?Number(t.amount||0):0,settlement:true}));return [...expenseRows,...settlementRows].filter(t=>t.timOwes>0||t.paoOwes>0).sort((a,b)=>new Date(b.datetime)-new Date(a.datetime))}
function icon(t){if(t.type==='settlement')return '✓';if(t.type==='saving')return '💰';const m={'อาหาร':'🍚','กาแฟ / เครื่องดื่ม':'☕','เดินทาง':'🚗','Shopping':'🛍️','Subscription':'📱','เงินเดือน':'💼','ท่องเที่ยว':'✈️','ที่พัก':'🏨','Entertainment':'🎢','สุขภาพ':'🏥'};return m[t.category]||(t.type==='income'?'💵':'🧾')}
function txrow(t, shareOwner = null) {
  const title = t.note || t.category || (t.type === 'settlement' ? 'บันทึกคืนเงิน' : 'เงินเก็บ');
  const sign = t.type === 'income' ? '+' : t.type === 'saving' ? (t.amount < 0 ? '←' : '→') : t.type === 'settlement' ? '✓' : '−';
  const cls = t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : 'saving';
  const owner = t.type === 'settlement' ? `${who(t.from)} → ${who(t.to)}` : who(t.owner);
  const date = new Date(t.datetime).toLocaleDateString('th-TH', {day:'numeric',month:'short'});
  const project = projectById(t.projectId), pocket = pocketById(t.pocketId);
  const tag = t.type === 'saving' && pocket ? pocket.name : project?.name;
  const shownAmount = shareOwner ? expenseShare(t,shareOwner) : Math.abs(t.amount);
  const schedule = t.installmentNumber ? ` · ผ่อน ${t.installmentNumber}/${t.installmentTotal}` : t.recurringGenerated ? ' · ประจำ' : '';
  return `<button class="tx ${t.id === highlightTxId ? 'tx-highlight' : ''}" data-tx-id="${esc(t.id)}" onclick="openTx(${jsArg(t.id)})" aria-label="${esc(`ดู ${title} ${money(shownAmount)} ${shareOwner ? 'ส่วนของ' + who(shareOwner) : owner}`)}"><span class="ico" aria-hidden="true">${icon(t)}</span><span><span class="tx-title">${esc(title)}</span><span class="tx-meta">${esc(owner)} · ${date}${esc(schedule)}${shareOwner ? `<br>ส่วนของ${who(shareOwner)} · ยอดรวม ${money(t.amount)}` : ''}</span>${tag ? `<span class="tx-tags"><span class="badge project-badge">${esc(tag)}</span></span>` : ''}</span><span class="amt ${cls}">${sign}${money(shownAmount)}</span></button>`;
}
function renderSelects() {
  const existing = state.transactions.find(t => t.id === form.editId);
  const optionsFor = selected => '<option value="">ไม่ระบุโปรเจกต์</option>' + state.projects.filter(p => p.status !== 'Archived' || p.id === selected || p.id === existing?.projectId).map(p => `<option value="${esc(p.id)}">${esc(p.icon || '▣')} ${esc(p.name)}${p.status === 'Archived' ? ' (เก็บเข้าคลัง)' : ''}</option>`).join('');
  for (const key of ['project','savingProject']) {
    const el = $(key), current = el.value;
    el.innerHTML = optionsFor(current);
    if (current && ![...el.options].some(o => o.value === current)) el.add(new Option('โปรเจกต์เดิม (ไม่มีในรายการ)', current));
    el.value = current;
  }
  const currentPocket = $('pocket').value || existing?.pocketId || '';
  $('pocket').innerHTML = state.pockets.length ? state.pockets.map(p => `<option value="${esc(p.id)}">${esc(p.icon || '💰')} ${esc(p.name)}</option>`).join('') : '<option value="">ยังไม่มีกระเป๋า — สร้างได้ด้านล่าง</option>';
  if (currentPocket && ![...$('pocket').options].some(o => o.value === currentPocket) && existing) $('pocket').add(new Option('กระเป๋าเดิม (ไม่มีในรายการ)', currentPocket));
  if (currentPocket) $('pocket').value = currentPocket;
  if ($('pocket').selectedIndex < 0 && state.pockets.length) $('pocket').selectedIndex = 0;
  const filter = $('projectFilter'), selected = filter.value || 'all';
  filter.innerHTML = '<option value="all">ทุกโปรเจกต์</option><option value="none">ไม่มีโปรเจกต์</option>' + state.projects.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  filter.value = [...filter.options].some(o => o.value === selected) ? selected : 'all';
}
function setCategory(category) { $('cat').value = category; renderCats(); updateFormSummary(); stashDraft(); }
function toggleCats() {
  form.catExpanded = !form.catExpanded;
  $('categorySearch').value = '';
  renderCats();
  if (form.catExpanded) $('categorySearch').focus();
}
function renderCats() {
  if (form.type === 'saving') return;
  const list = [...(state.categories[form.type] || [])];
  const existing = state.transactions.find(t => t.id === form.editId);
  if (existing?.type === form.type && existing.category && !list.includes(existing.category)) list.push(existing.category);
  let current = $('cat').value;
  if (!list.includes(current)) current = list[0] || '';
  $('cat').value = current;
  const recent = [...state.transactions].reverse().filter(t => t.type === form.type).map(t => t.category).filter(c => list.includes(c));
  const common = [...new Set([current, ...recent, ...list])].filter(Boolean).slice(0, 4);
  const query = $('categorySearch').value.trim().toLowerCase();
  const visible = form.catExpanded ? list.filter(c => c.toLowerCase().includes(query)) : common;
  $('categorySearchBox').hidden = !form.catExpanded;
  $('catChoices').innerHTML = visible.map(c => `<button class="choice cat-choice ${c === current ? 'active' : ''}" data-cat-choice="${esc(c)}" type="button" aria-pressed="${c === current}">${esc(c)}</button>`).join('') + (list.length > 4 ? `<button class="choice cat-more" data-cat-toggle="true" type="button" aria-expanded="${form.catExpanded}" aria-controls="categorySearchBox">${form.catExpanded ? 'แสดงหมวดที่ใช้บ่อย' : 'เลือกหมวดอื่น / ค้นหา'}</button>` : '') + (visible.length ? '' : '<p class="muted">ไม่พบหมวดที่ค้นหา</p>');
}
function renderPays() {
  const existing = state.transactions.find(t => t.id === form.editId) || state.recurring.find(rec => rec.id === form.recurringEditId)?.template;
  const current = $('pay').value || existing?.payment || state.settings.defaultPayment;
  const payments = [...state.payments];
  if (existing?.payment && !payments.includes(existing.payment)) payments.push(existing.payment);
  $('pay').innerHTML = payments.map(p => `<option value="${esc(p)}">${esc(p)}${!state.payments.includes(p) ? ' (ช่องทางเดิม)' : ''}</option>`).join('');
  $('pay').value = payments.includes(current) ? current : state.settings.defaultPayment;
}
function setType(type) {
  if (!['expense','income','saving'].includes(type)) return;
  const changed = form.type !== type;
  form.type = type;
  if (type !== 'expense') { form.installment = false; if (type !== 'income') form.monthly = false; }
  if (changed) { form.catExpanded = false; $('cat').value = ''; $('categorySearch').value = ''; }
  for (const [id, value] of [['expTab','expense'],['incTab','income'],['savTab','saving']]) $(id).classList.toggle('active', value === type);
  document.querySelectorAll('.expOnly,.incOnly,.savingOnly,.nonSaving').forEach(el => {
    const visible = el.classList.contains('expOnly') ? type === 'expense' : el.classList.contains('incOnly') ? type === 'income' : el.classList.contains('savingOnly') ? type === 'saving' : type !== 'saving';
    el.style.display = visible ? 'grid' : 'none';
  });
  $('payLabel').textContent = type === 'saving' ? 'เงินออกจากไหน' : type === 'income' ? 'รับผ่าน' : 'จ่ายผ่าน';
  $('formTitle').textContent = (form.editId ? 'แก้ไข' : 'เพิ่ม') + typeLabel(type);
  $('formSubtitle').textContent = form.editId ? 'แก้เฉพาะรายการนี้ รายการประจำรอบอื่นคงเดิม' : type === 'expense' ? 'ระบุยอดและคนที่แบ่งค่าใช้จ่าย' : type === 'saving' ? 'แยกเงินไว้ในกระเป๋าออม' : 'บันทึกเงินที่ได้รับ';
  syncInstallmentForm();
  clearFieldErrors();
  renderCats(); renderSelects(); updateSplit(); updateFormSummary(); syncA11yState();
}
function bindChoice(attr,key){document.querySelectorAll(`[data-${attr}]`).forEach(b=>b.addEventListener('click',()=>{form[key]=b.dataset[attr];document.querySelectorAll(`[data-${attr}]`).forEach(x=>x.classList.toggle('active',x===b));updateSplit();if(attr==='split'||attr==='owner')syncCustomSplit('amount');updateFormSummary();syncA11yState()}))}
bindChoice('payer','payer');bindChoice('owner','owner');bindChoice('incowner','incOwner');bindChoice('savowner','savOwner');bindChoice('split','split');
function updateSplit(){const custom=form.type==='expense'&&form.owner==='Both'&&form.split==='custom';$('splitBox').classList.toggle('show',form.type==='expense'&&form.owner==='Both');$('customSplit').style.display=custom?'grid':'none';$('customSplitHelp').hidden=!custom}
function syncCustomSplit(source) {
  if (form.type !== 'expense' || form.owner !== 'Both' || form.split !== 'custom') return;
  if (source === 'ps' || source === 'ts') form.splitAnchor = source;
  const anchor = form.splitAnchor || ($('ps').value.trim() ? 'ps' : $('ts').value.trim() ? 'ts' : null);
  if (!anchor) return;
  const other = anchor === 'ps' ? 'ts' : 'ps';
  const amount = parseMoney($('amount').value), share = parseMoney($(anchor).value);
  if (!Number.isFinite(amount) || !Number.isFinite(share) || share > amount) { $(other).value = ''; return; }
  $(other).value = ((Math.round(amount * 100) - Math.round(share * 100)) / 100).toFixed(2);
  clearFieldError('ps'); clearFieldError('ts');
}
function syncInstallmentForm() {
  const active = form.type === 'expense' && form.installment && !form.editId;
  const monthly = ['expense','income'].includes(form.type) && form.monthly && !form.editId;
  const scheduled = active || monthly;
  $('entryKind').value = entryKindFor();
  $('entryKind').disabled = !!form.recurringEditId;
  for (const option of $('entryKind').options) option.hidden = !!form.editId && ['monthly','monthly-income','installment'].includes(option.value);
  $('installmentField').hidden = !active;
  $('planNameField').hidden = !scheduled;
  $('installmentBasisField').hidden = !active;
  $('monthlyBox').hidden = !monthly;
  $('monthlyBox').classList.toggle('show',monthly);
  $('scheduleHelp').hidden = !scheduled;
  $('transactionDateField').hidden = scheduled || !!form.recurringEditId;
  $('installmentSwitch').classList.toggle('on',active);
  $('installmentSwitch').setAttribute('aria-pressed',String(active));
  $('installmentBox').classList.toggle('show',active);
  $('installmentBox').setAttribute('aria-hidden',String(!active));
  $('amountLabel').textContent = active ? $('installmentBasis').value === 'total' ? 'ยอดรวมที่ต้องผ่อน (บาท)' : 'ยอดผ่อนต่อเดือน (บาท)' : monthly ? form.type === 'income' ? 'รับเดือนละ (บาท)' : 'จ่ายเดือนละ (บาท)' : 'จำนวนเงิน (บาท)';
  $('dateLabel').textContent = active ? 'วันและเวลางวดแรก' : 'วันที่และเวลา';
  if (form.type === 'expense' && !form.editId) {
    $('formTitle').textContent = active ? 'เพิ่มรายจ่ายผ่อน' : monthly ? 'เพิ่มรายจ่ายประจำเดือน' : 'เพิ่มรายจ่ายทั่วไป';
    $('formSubtitle').textContent = active ? 'เลือกเดือนเริ่ม แล้วให้แอปแบ่งยอดให้' : monthly ? 'ตั้งครั้งเดียว บันทึกให้อัตโนมัติทุกเดือน' : 'ระบุยอดและคนที่แบ่งค่าใช้จ่าย';
  } else if (form.type === 'income' && !form.editId) {
    $('formTitle').textContent = monthly ? 'เพิ่มรายรับประจำเดือน' : 'เพิ่มรายรับ';
    $('formSubtitle').textContent = monthly ? 'ตั้งครั้งเดียว บันทึกรายรับให้อัตโนมัติทุกเดือน' : 'บันทึกเงินที่ได้รับ';
  }
  if (form.recurringEditId) {
    $('formTitle').textContent = `แก้ไข${entryLabel(entryKindFor())}`;
    $('formSubtitle').textContent = 'การแก้ไขมีผลกับรอบถัดไป รายการที่บันทึกไปแล้วจะคงเดิม';
  }
  $('planName').placeholder = monthly && form.type === 'income' ? 'เช่น เงินเดือน / ค่าเช่า' : 'เช่น ผ่อนโทรศัพท์ / ค่าเช่าห้อง';
  $('recurringField').hidden = scheduled || form.type === 'expense' || !!form.editId || !!form.recurringEditId || (form.type === 'saving' && form.savingDirection === 'out');
  $('recBox').classList.toggle('show',form.recurring && !scheduled);
  const shareLabel = active && $('installmentBasis').value === 'total' ? ' (ยอดรวม)' : scheduled ? ' (ต่อเดือน)' : '';
  document.querySelector('label[for="ps"]').textContent = 'ส่วนของเปา' + shareLabel;
  document.querySelector('label[for="ts"]').textContent = 'ส่วนของติม' + shareLabel;
}
function toggleInstallment(force) {
  form.installment = form.type === 'expense' && !form.editId && (typeof force === 'boolean' ? force : !form.installment);
  if (form.installment) { form.monthly = false; toggleRecurring(false); }
  syncInstallmentForm(); updateFormSummary();
}
function scheduleDate(prefix) {
  const month = $(prefix + 'Start').value, day = Number($(prefix + 'Day').value);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isInteger(day) || day < 1 || day > 31) return null;
  const [year,monthNumber] = month.split('-').map(Number);
  if (year < 1900 || year > 9998) return null;
  return new Date(year,monthNumber - 1,Math.min(day,new Date(year,monthNumber,0).getDate()),0,0);
}
function installmentQuote() {
  const amount = parseMoney($('amount').value), count = Number($('installmentCount').value);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(count) || count < 1 || count > 600) return null;
  const totalCents = Math.round(amount * 100) * ($('installmentBasis').value === 'monthly' ? count : 1);
  if (!Number.isSafeInteger(totalCents) || totalCents < count) return null;
  const regularCents = Math.floor(totalCents / count);
  return {count,amount:regularCents / 100,finalAmount:(totalCents - regularCents * (count - 1)) / 100,total:totalCents / 100};
}
function installmentPayment(rec, number) {
  if (!Number.isFinite(rec.installmentTotalAmount)) return {amount:rec.template.amount,split:clone(rec.template.split)};
  const total = Math.round(rec.installmentTotalAmount * 100), regular = Math.floor(total / rec.totalInstallments);
  const before = regular * (number - 1), after = number === rec.totalInstallments ? total : regular * number;
  const paoTotal = Math.round(rec.installmentTotalSplit.Pao * 100);
  const cumulativeShare = cents => Number((BigInt(cents) * BigInt(paoTotal) + BigInt(total) / 2n) / BigInt(total));
  const pao = cumulativeShare(after) - cumulativeShare(before);
  return {amount:(after - before) / 100,split:{Pao:pao / 100,Tim:(after - before - pao) / 100}};
}
function installmentRemaining(rec) {
  if (!Number.isFinite(rec.installmentTotalAmount)) return Math.round(rec.template.amount * 100) * (rec.totalInstallments - rec.completedInstallments) / 100;
  if (rec.completedInstallments >= rec.totalInstallments) return 0;
  const total = Math.round(rec.installmentTotalAmount * 100);
  return (total - Math.floor(total / rec.totalInstallments) * rec.completedInstallments) / 100;
}
function updateFormSummary() {
  const amount = parseMoney($('amount').value) || 0;
  let summary = '', hint = '';
  if (form.type === 'income') summary = hint = `รายรับ ${money(amount)} ของ${who(form.incOwner)}`;
  else if (form.type === 'saving') {
    const pocket = pocketById($('pocket').value);
    const withdrawal = form.savingDirection === 'out';
    hint = `${withdrawal ? 'ถอน' : 'ออม'} ${money(amount)}${pocket ? (withdrawal ? ' ← ' : ' → ') + pocket.name : ' · เลือกหรือสร้างกระเป๋าก่อนบันทึก'}`;
    summary = esc(hint) + `<br><small>${withdrawal ? 'คืนเงินไปเหลือใช้ ไม่นับเป็นรายรับ หากนำไปซื้อของ ให้บันทึกรายจ่ายแยก' : 'เงินเก็บลดเหลือใช้ แต่ไม่นับเป็นรายจ่าย'}</small>`;
  } else {
    const split = getSplit(amount);
    const owed = form.payer === 'Pao' ? split.Tim : split.Pao;
    hint = owed ? `${form.payer === 'Pao' ? 'ติมค้างเปา' : 'เปาค้างติม'} ${money(owed)}` : `รายจ่ายของ${who(form.owner)} ${money(amount)}`;
    summary = (form.owner === 'Both' ? `เปา ${money(split.Pao)} · ติม ${money(split.Tim)}<br>` : '') + `<b>${esc(hint)}</b>`;
  }
  $('formSummary').innerHTML = form.type === 'income' ? esc(summary) : summary;
  $('saveHint').textContent = hint;
  $('saveTxButton').textContent = `${form.recurringEditId ? 'บันทึกการแก้ไขรายการประจำ' : form.editId ? 'บันทึกการแก้ไข' : 'บันทึก' + typeLabel(form.type)}${amount > 0 ? ' ' + money(amount) : ''}`;
  if (form.installment && !form.editId) {
    const quote = installmentQuote(), start = scheduleDate('installment');
    let preview = 'ใส่ยอดเงินและจำนวนเดือนเพื่อดูยอดผ่อน';
    if (quote) {
      preview = `เดือนละ ${money(quote.amount)} · ${quote.count} เดือน · รวม ${money(quote.total)}`;
      if (quote.finalAmount !== quote.amount) preview += ` · เดือนสุดท้าย ${money(quote.finalAmount)}`;
      if (start) { const end = new Date(start.getFullYear(),start.getMonth()+quote.count-1,1); preview += ` · ${formatMonth(monthKey(start))} – ${formatMonth(monthKey(end))}`; }
    }
    $('installmentPreview').textContent = preview;
    $('saveTxButton').textContent = 'บันทึกแผนผ่อน' + (quote ? ` ${quote.count} เดือน` : '');
    $('saveHint').textContent = quote ? `เดือนละ ${money(quote.amount)} · ${quote.count} เดือน` : 'ระบุยอดรวมและจำนวนเดือน';
    $('formSummary').textContent = form.owner === 'Both' ? `แบ่ง${$('installmentBasis').value === 'total' ? 'ยอดรวม' : 'ต่อเดือน'}: เปา ${money(getSplit(amount).Pao)} · ติม ${money(getSplit(amount).Tim)} · แต่ละเดือนจะบันทึกตามสัดส่วนนี้` : `ค่าใช้จ่ายของ${who(form.owner)} · ${who(form.payer)}เป็นคนจ่ายแต่ละงวด`;
  } else if (form.monthly && !form.editId) {
    const start = scheduleDate('monthly');
    $('monthlyPreview').textContent = start ? `เดือนละ ${money(amount)} · ทุกวันที่ ${$('monthlyDay').value} · เริ่ม ${formatMonth(monthKey(start))}` : 'เลือกเดือนเริ่มต้น';
    $('saveTxButton').textContent = 'บันทึกรายจ่ายประจำเดือน';
    $('saveHint').textContent = `เดือนละ ${money(amount)} · บันทึกจนกว่าจะพักหรือยกเลิก`;
  }
  if (form.type === 'saving') $('payLabel').textContent = form.savingDirection === 'out' ? 'ถอนกลับไปที่' : 'เงินออกจากไหน';
  $('savingIn').classList.toggle('active',form.savingDirection !== 'out');
  $('savingOut').classList.toggle('active',form.savingDirection === 'out');
  $('savingIn').setAttribute('aria-pressed',String(form.savingDirection !== 'out'));
  $('savingOut').setAttribute('aria-pressed',String(form.savingDirection === 'out'));
  $('pocketBalanceHint').textContent = pocketById($('pocket').value) ? 'ยอดคงเหลือ ' + money(pocketBalance($('pocket').value)) : '';
}
function toggleRecurring(force) {
  form.recurring = typeof force === 'boolean' ? force : !form.recurring;
  if (form.recurring) { form.installment = false; form.monthly = false; syncInstallmentForm(); }
  $('recSwitch').classList.toggle('on',form.recurring); $('recBox').classList.toggle('show',form.recurring);
  if (form.recurring && !$('nextRun').value) {
    const next = {nextRun:new Date().toISOString(),frequency:$('freq').value,dayOfMonth:new Date().getDate()};
    advance(next); $('nextRun').value = ldt(new Date(next.nextRun));
  }
  syncA11yState();
}
function resetForm() {
  restoringDraft = true;
  form = {type:'expense',payer:'Pao',owner:'Pao',incOwner:'Pao',savOwner:'Pao',split:'half',splitAnchor:null,recurring:false,installment:false,monthly:false,editId:null,catExpanded:false,savingDirection:'in'};
  for (const key of ['amount','note','ps','ts','nextRun','cat','categorySearch','installmentCount','planName']) $(key).value = '';
  document.querySelectorAll('[data-month-day]').forEach(el => { if (!el.options.length) el.innerHTML = Array.from({length:31},(_,i) => `<option value="${i+1}">${i+1}</option>`).join(''); el.value = '1'; });
  $('installmentStart').value = $('monthlyStart').value = monthKey(new Date());
  $('installmentBasis').value = 'total';
  $('dt').value = ldt(); $('freq').value = 'monthly';
  $('project').value = ''; $('savingProject').value = ''; $('pocket').value = '';
  $('optionalDetails').open = false;
  document.querySelectorAll('[data-payer],[data-owner],[data-incowner],[data-savowner],[data-split]').forEach(b => b.classList.toggle('active', b.dataset.payer === 'Pao' || b.dataset.owner === 'Pao' || b.dataset.incowner === 'Pao' || b.dataset.savowner === 'Pao' || b.dataset.split === 'half'));
  renderPays(); $('pay').value = state.settings.defaultPayment;
  setType('expense'); toggleRecurring(false); clearFieldErrors();
  formBaseline = draftSignature();
  $('draftStatus').textContent = '';
  restoringDraft = false;
}
function saveTx() {
  if (savingTx) return;
  clearFieldErrors();
  const amount = parseMoney($('amount').value);
  if (!Number.isFinite(amount) || amount <= 0) return fieldError('amount', 'ใส่จำนวนเงินมากกว่า 0 และทศนิยมไม่เกิน 2 ตำแหน่ง');
  const scheduleKind = !form.editId && form.type === 'expense' ? form.installment ? 'installment' : form.monthly ? 'monthly' : null : null;
  const date = scheduleKind ? scheduleDate(scheduleKind) : new Date($('dt').value);
  if (!date || !Number.isFinite(date.getTime())) return fieldError(scheduleKind ? scheduleKind + 'Start' : 'dt', 'เลือกเดือนหรือวันที่ให้ครบ');
  if (scheduleKind && !$('planName').value.trim()) return fieldError('planName','ตั้งชื่อรายการ เช่น ผ่อนโทรศัพท์ หรือค่าเช่าห้อง');
  if (form.type === 'saving' && !$('pocket').value) return fieldError('pocket', 'สร้างหรือเลือกกระเป๋าเงินเก็บก่อนบันทึก');
  if (form.type !== 'saving' && !$('cat').value) return fieldError('catChoices', 'เลือกหมวดหมู่ก่อนบันทึก');
  const split = getSplit(amount);
  if (form.type === 'expense' && form.owner === 'Both' && form.split === 'custom') {
    if (!Number.isFinite(split.Pao) || split.Pao < 0) return fieldError('ps', 'ใส่ส่วนของเปาเป็นจำนวนเงินที่ไม่ติดลบ');
    if (!Number.isFinite(split.Tim) || split.Tim < 0) return fieldError('ts', 'ใส่ส่วนของติมเป็นจำนวนเงินที่ไม่ติดลบ');
    if (Math.round((split.Pao + split.Tim) * 100) !== Math.round(amount * 100)) return fieldError('ps', `ส่วนของทั้งคู่ต้องรวมเป็น ${money(amount)}`);
  }
  let recurring = null;
  const existing = state.transactions.find(t => t.id === form.editId);
  if (form.editId && !existing) return fieldError('formError', 'ไม่พบรายการเดิม รายการอาจถูกลบไปแล้ว');
  const tx = {...existing,id:existing?.id || id(),type:form.type,amount,datetime:existing && ldt(new Date(existing.datetime)) === $('dt').value ? existing.datetime : date.toISOString(),payment:$('pay').value,note:$('note').value.trim(),recurringId:existing?.recurringId || null,recurringGenerated:existing?.recurringGenerated || false};
  if (scheduleKind) tx.note = [$('planName').value.trim(),tx.note].filter(Boolean).join(' · ');
  delete tx.payer; delete tx.split; delete tx.category; delete tx.pocketId; delete tx.projectId;
  if (form.type === 'income') { tx.category = $('cat').value; tx.owner = form.incOwner; }
  else if (form.type === 'saving') {
    tx.owner = form.savOwner; tx.pocketId = $('pocket').value; tx.projectId = $('savingProject').value || null;
    if (form.savingDirection === 'out') {
      const available = pocketBalance(tx.pocketId) - (existing?.type === 'saving' && existing.pocketId === tx.pocketId ? existing.amount : 0);
      if (amount > Math.round(available * 100) / 100) return fieldError('amount',`ถอนได้ไม่เกินยอดคงเหลือ ${money(available)}`);
      tx.amount = -amount;
    }
  }
  else { tx.category = $('cat').value; tx.owner = form.owner; tx.payer = form.payer; tx.split = split; tx.projectId = $('project').value || null; }
  if (!existing && form.type === 'expense' && form.installment) {
    const count = Number($('installmentCount').value);
    if (!Number.isInteger(count) || count < 1 || count > 600) return fieldError('installmentCount','ใส่จำนวนงวดเป็นจำนวนเต็มตั้งแต่ 1 ถึง 600');
    const quote = installmentQuote();
    if (!quote) return fieldError('amount','ยอดรวมต้องแบ่งได้อย่างน้อยเดือนละ 0.01 บาท และอยู่ในช่วงที่คำนวณได้');
    const multiplier = $('installmentBasis').value === 'monthly' ? count : 1;
    recurring = {id:id(),kind:'installment',enabled:true,frequency:'monthly',nextRun:date.toISOString(),dayOfMonth:Number($('installmentDay').value),totalInstallments:count,completedInstallments:0,installmentTotalAmount:quote.total,installmentTotalSplit:{Pao:Math.round(split.Pao * 100) * multiplier / 100,Tim:Math.round(split.Tim * 100) * multiplier / 100},template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
    Object.assign(recurring.template,installmentPayment(recurring,1));
  } else if (scheduleKind === 'monthly') {
    recurring = {id:id(),kind:'monthly-expense',enabled:true,frequency:'monthly',nextRun:date.toISOString(),dayOfMonth:Number($('monthlyDay').value),template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
  } else if (!existing && form.recurring && !(form.type === 'saving' && form.savingDirection === 'out')) {
    const next = new Date($('nextRun').value);
    if (!Number.isFinite(next.getTime()) || next.getTime() <= Date.now()) return fieldError('nextRun', 'เลือกเวลารอบถัดไปหลังจากเวลาปัจจุบัน');
    recurring = {id:id(),enabled:true,frequency:$('freq').value,nextRun:next.toISOString(),dayOfMonth:next.getDate(),template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
  }
  savingTx = true; $('saveTxButton').disabled = true;
  const draftKey = currentDraftKey();
  const target = route.from && route.from !== 'add' ? route.from : existing ? 'history' : 'home';
  const oldTx = existing ? clone(existing) : null;
  const scheduled = !!scheduleKind;
  try {
    if (existing) state.transactions = state.transactions.map(t => t.id === tx.id ? tx : t);
    else if (!scheduled) state.transactions.push(tx);
    if (recurring) state.recurring.push(recurring);
    if (scheduled) generateDueTransactions(recurring);
    save();
    removeDraft(draftKey);
    highlightTxId = tx.id;
    resetForm(); show(target, {replace:true,restore:!!existing,saved:true});
    toastMsg(existing ? 'บันทึกการแก้ไขแล้ว' : scheduled ? 'บันทึกแผนแล้ว รายจ่ายจะลงตามเดือนที่ถึงกำหนด' : `บันทึก ${money(amount)} แล้ว`, () => {
      state.transactions = oldTx ? state.transactions.map(t => t.id === tx.id ? oldTx : t) : state.transactions.filter(t => scheduled ? t.recurringId !== recurring.id : t.id !== tx.id);
      if (recurring) state.recurring = state.recurring.filter(r => r.id !== recurring.id);
      save(); renderAll();
    });
  } catch (error) { fieldError('formError', error.message); }
  finally { savingTx = false; $('saveTxButton').disabled = false; }
}
function editTx(txid) {
  const tx = state.transactions.find(t => t.id === txid);
  if (!tx || tx.type === 'settlement') return;
  const origin = currentView() === 'add' ? route.from || 'history' : currentView();
  resetForm(); form.editId = tx.id;
  setType(tx.type); renderPays(); renderSelects();
  $('amount').value = Math.abs(tx.amount); $('dt').value = ldt(new Date(tx.datetime)); $('note').value = tx.note || '';
  $('pay').value = tx.payment || state.settings.defaultPayment;
  if (tx.type !== 'saving') { $('cat').value = tx.category || ''; renderCats(); }
  if (tx.type === 'expense') {
    form.payer = tx.payer || 'Pao'; form.owner = tx.owner || 'Pao'; $('project').value = tx.projectId || '';
    form.split = Math.abs((tx.split?.Pao || 0) - (tx.split?.Tim || 0)) <= .01 ? 'half' : 'custom';
    $('ps').value = tx.split?.Pao ?? ''; $('ts').value = tx.split?.Tim ?? '';
  } else if (tx.type === 'saving') {
    form.savOwner = tx.owner; form.savingDirection = tx.amount < 0 ? 'out' : 'in'; $('pocket').value = tx.pocketId || ''; $('savingProject').value = tx.projectId || '';
  } else form.incOwner = tx.owner;
  syncChoices(); updateSplit(); updateFormSummary();
  $('optionalDetails').open = !!(tx.note || tx.projectId);
  formBaseline = draftSignature();
  restoreDraft(tx.id);
  show('add', {from:origin});
}
function quickAddNow(txid) {
  const source = state.transactions.find(t => t.id === txid);
  if (!source) return;
  if (source.type === 'saving' && source.amount < 0 && -source.amount > pocketBalance(source.pocketId)) return toastMsg('ยอดเงินเก็บไม่พอสำหรับการถอนซ้ำ');
  const fingerprint = JSON.stringify([source.type,source.note,source.amount,source.category,source.payer,source.owner,source.payment,source.projectId,source.pocketId,source.split]);
  if (Date.now() - (quickGuard.get(fingerprint) || 0) < 1000) return;
  quickGuard.set(fingerprint, Date.now());
  const tx = {...clone(source),id:id(),datetime:new Date().toISOString(),recurringId:null,recurringGenerated:false};
  delete tx.installmentNumber; delete tx.installmentTotal;
  state.transactions.push(tx);
  try {
    save(); renderAll();
    toastMsg(`บันทึกซ้ำ ${money(Math.abs(tx.amount))} แล้ว`, () => { state.transactions = state.transactions.filter(t => t.id !== tx.id); save(); renderAll(); });
  } catch (error) { quickGuard.delete(fingerprint); toastMsg(error.message); }
}
function quickAdd(txid) {
  editTx(txid);
  form.editId = null;
  $('dt').value = ldt();
  setType(form.type);
  $('formTitle').textContent = 'เพิ่มจากรายการเดิม';
  formBaseline = '';
  stashDraft();
  route.editId = null;
  history.replaceState(route, '', '#add');
}
function deleteTx(txid) {
  const tx = state.transactions.find(t => t.id === txid);
  if (!tx) return;
  if (!confirm(`ลบ ${tx.note || tx.category || 'รายการนี้'} ${money(Math.abs(tx.amount))}?`)) return;
  state.transactions = state.transactions.filter(t => t.id !== txid);
  try {
    save(); removeDraft(txid);
    if (visibleModal()) closeTopModal();
    renderAll();
    toastMsg('ลบรายการแล้ว', () => { if (!state.transactions.some(t => t.id === tx.id)) state.transactions.push(tx); save(); renderAll(); });
  } catch (error) { toastMsg(error.message); }
}
function advance(r){const d=new Date(r.nextRun);if(r.frequency==='daily')d.setDate(d.getDate()+1);else if(r.frequency==='weekly')d.setDate(d.getDate()+7);else{const day=Math.min(31,Math.max(1,num(r.dayOfMonth,d.getDate())));d.setDate(1);d.setMonth(d.getMonth()+1);d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()))}r.nextRun=d.toISOString()}
function generateDueTransactions(rec, now = Date.now()) {
  const installment = rec.kind === 'installment';
  let count = 0;
  while (rec.enabled && new Date(rec.nextRun).getTime() <= now && count < (installment ? 600 : ['monthly-expense','monthly-income'].includes(rec.kind) ? 1800 : 24)) {
    if (installment && rec.completedInstallments >= rec.totalInstallments) { rec.enabled = false; break; }
    const number = installment ? rec.completedInstallments + 1 : null;
    const scheduledAt = new Date(rec.nextRun).toISOString();
    const duplicate = state.transactions.some(tx => tx.recurringId === rec.id && (installment ? tx.installmentNumber === number : new Date(tx.datetime).toISOString() === scheduledAt));
    if (!duplicate) {
      const tx = {...clone(rec.template),id:id(),datetime:rec.nextRun,recurringId:rec.id,recurringGenerated:true};
      if (installment) { Object.assign(tx,installmentPayment(rec,number)); tx.installmentNumber = number; tx.installmentTotal = rec.totalInstallments; }
      state.transactions.push(tx);
    }
    if (installment) { rec.completedInstallments = number; if (number === rec.totalInstallments) rec.enabled = false; }
    advance(rec);
    count++;
  }
  return count;
}
function checkRecurring(){let count=0;const now=Date.now();state.recurring.forEach(rec=>{count+=generateDueTransactions(rec,now)});if(count){save();renderAll();toastMsg(`บันทึกรายการตามกำหนดอัตโนมัติ ${count} รายการ`)}}
setInterval(() => { try { checkRecurring(); } catch (_) {} },60000);
document.addEventListener('visibilitychange',() => { if (!document.hidden) { try { checkRecurring(); } catch (_) {} } });
function renderPockets(target='homePockets') {
  const el = $(target); if (!el) return;
  el.innerHTML = state.pockets.map(p => {
    const balance = pocketBalance(p.id), hasGoal = p.goal > 0;
    const percent = hasGoal ? Math.max(0,balance/p.goal*100) : 0;
    const project = projectById(p.projectId);
    return `<div class="pocket"><div class="pocket-top"><b>${esc(p.icon || '💰')} ${esc(p.name)}</b>${hasGoal ? `<span class="status">${percent.toFixed(0)}%</span>` : ''}</div><div class="big">${money(balance)}</div><small>${hasGoal ? 'เป้าหมาย ' + money(p.goal) : 'ยังไม่ตั้งเป้าหมาย'}${project ? ` • ${esc(project.name)}` : ''}</small>${hasGoal ? `<div class="progress saving" style="margin-top:9px"><div style="width:${Math.min(100,percent)}%"></div></div>` : ''}</div>`;
  }).join('') || '<div class="empty">ยังไม่มีกระเป๋าเงินเก็บ<br><button class="soft" onclick="addPocket()">＋ เพิ่มกระเป๋าแรก</button></div>';
}
function renderBudget() {
  const spent = totals().expense, budget = Number(state.settings.overallBudget || 0), percent = budget > 0 ? spent / budget * 100 : 0;
  const over = budget > 0 && spent > budget;
  $('budUsed').textContent = money(spent); $('budTotal').textContent = money(budget);
  $('budProg').style.width = Math.min(100, Math.max(0,percent)) + '%';
  $('budProg').parentElement.classList.toggle('over', over);
  $('budHint').textContent = !budget ? 'ยังไม่ตั้งงบ — ตั้งเมื่อพร้อมใช้งาน' : `${over ? 'เกินงบ ' + money(spent - budget) : 'เหลือ ' + money(budget - spent)} · ใช้ไป ${percent.toFixed(0)}%`;
  $('budHint').className = over ? 'expense' : 'muted';
  $('budSpent2').textContent = money(spent); $('budRemain2').textContent = money(Math.max(0,budget - spent));
  const categories = [...new Set([...Object.keys(state.budgets), ...currentMonthTx().filter(t => t.type === 'expense').map(t => t.category)])];
  const rows = categories.map(category => ({category, limit:Number(state.budgets[category] || 0),used:currentMonthTx().filter(t => t.type === 'expense' && t.category === category).reduce((s,t) => s + t.amount,0)})).sort((a,b) => b.used - a.used);
  $('budOver2').textContent = rows.filter(r => r.limit && r.used > r.limit).length + ' หมวด';
  $('budgetDetail').innerHTML = rows.map(r => `<div class="detail-row"><div class="detail-head"><div><b>${esc(r.category)}</b><br><small>${r.limit ? 'งบ ' + money(r.limit) : 'ยังไม่ตั้งงบหมวดนี้'}</small></div><div class="detail-right"><b>${money(r.used)}</b>${r.limit ? `<br><small class="${r.used > r.limit ? 'expense' : 'muted'}">${r.used > r.limit ? 'เกิน ' + money(r.used - r.limit) : 'เหลือ ' + money(r.limit - r.used)}</small>` : ''}</div></div></div>`).join('') || '<p class="empty">ยังไม่มีรายจ่ายในเดือนนี้</p>';
}
function renderDebt(){const xs=debtTx(),tim=xs.filter(x=>x.timOwes>0),pao=xs.filter(x=>x.paoOwes>0),tg=tim.reduce((s,x)=>s+x.timOwes,0),pg=pao.reduce((s,x)=>s+x.paoOwes,0),net=tg-pg;$('grossTim').textContent=money(tg);$('grossPao').textContent=money(pg);$('debtNet2').textContent=money(Math.abs(net));$('debtLabel').textContent=net>0?'ติมค้างเปา':net<0?'เปาค้างติม':'ยอดสุทธิ';$('debtAmt').textContent=money(Math.abs(net));$('debtDesc').textContent=net===0?'ไม่มีใครค้างใคร':'แตะเพื่อดูรายการต้นทางและยอดหักลบ';$('debtActions').innerHTML=Math.abs(net)>.01?`<button onclick="event.stopPropagation();settleDebt()">บันทึกคืนเงิน</button>`:'';const row=(t,dir)=>{const owed=dir==='tim'?t.timOwes:t.paoOwes;if(t.settlement)return `<div class="debt-tx"><div class="ico">${icon(t)}</div><div><b>${esc(t.note||'เคลียร์หนี้')}</b><small>${who(t.from)}โอนคืน${who(t.to)} ${money(t.amount)}</small><small>${new Date(t.datetime).toLocaleDateString('th-TH')}</small></div><div style="text-align:right"><b>${money(owed)}</b><br><button onclick="event.stopPropagation();deleteTx('${t.id}')">ลบ</button></div></div>`;const debtor=dir==='tim'?'ติม':'เปา',payer=dir==='tim'?'เปา':'ติม',pr=t.projectId&&projectById(t.projectId)?` • ${projectById(t.projectId).name}`:'';return `<div class="debt-tx"><div class="ico">${icon(t)}</div><div><b>${esc(t.note||t.category)}</b><small>${payer}จ่าย ${money(t.amount)} • ส่วนของ${debtor} ${money(owed)}</small><small>${new Date(t.datetime).toLocaleDateString('th-TH')}${esc(pr)}</small></div><div style="text-align:right"><b>${money(owed)}</b><br><button onclick="event.stopPropagation();editTx('${t.id}')">ดูรายการ</button></div></div>`};const primary=net>=0?tim:pao,offset=net>=0?pao:tim;$('debtTxDetail').innerHTML=`<b style="font-size:12px">${net>=0?'ติมค้างเปา':'เปาค้างติม'} - รายการต้นทาง</b>${primary.map(x=>row(x,net>=0?'tim':'pao')).join('')||'<div style="padding:8px 0">ไม่มีรายการ</div>'}${offset.length?`<div style="margin-top:12px"><b style="font-size:12px">รายการที่หักลบ</b>${offset.map(x=>row(x,net>=0?'pao':'tim')).join('')}</div>`:''}`}
function settleDebt() {
  const net = Math.round(debtFor() * 100) / 100;
  if (!net) return toastMsg('ไม่มีหนี้ที่ต้องคืน');
  settlementSnapshot = net;
  $('settlementDirection').textContent = net > 0 ? 'ติมคืนเงินให้เปา' : 'เปาคืนเงินให้ติม';
  $('settlementLimit').textContent = 'ยอดค้างทั้งหมด ' + money(Math.abs(net));
  $('settlementAmount').value = '';
  $('settlementError').hidden = true;
  clearFieldErrors($('settlementModal'));
  openModal('settlementModal','#settlementAmount');
}
function fillSettlementAmount() { $('settlementAmount').value = Math.abs(settlementSnapshot).toFixed(2); clearFieldError('settlementAmount'); }
function saveSettlement() {
  const net = Math.round(debtFor() * 100) / 100;
  if (net !== settlementSnapshot) { closeModal('settlementModal',false); settleDebt(); return toastMsg('ยอดค้างเปลี่ยนแล้ว กรุณาตรวจจำนวนเงินอีกครั้ง'); }
  const amount = parseMoney($('settlementAmount').value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > Math.abs(net)) return fieldError('settlementAmount',`ใส่จำนวนมากกว่า 0 และไม่เกิน ${money(Math.abs(net))}`);
  const from = net > 0 ? 'Tim' : 'Pao', to = net > 0 ? 'Pao' : 'Tim';
  const tx = {id:id(),type:'settlement',amount,datetime:new Date().toISOString(),from,to,note:`คืนเงิน ${who(from)} → ${who(to)}`};
  state.transactions.push(tx);
  try {
    save(); closeModal('settlementModal'); renderAll();
    toastMsg('บันทึกการคืนเงินแล้ว', () => { state.transactions = state.transactions.filter(t => t.id !== tx.id); save(); renderAll(); });
  } catch(error) { $('settlementError').hidden = false; $('settlementError').textContent = error.message; }
}
function renderHomeProjects() {
  $('homeProjects').innerHTML = state.projects.filter(p => p.status === 'Active').slice(0,3).map(project => `<button class="tx" onclick="openProject(${jsArg(project.id)})"><span class="ico" aria-hidden="true">${esc(project.icon || '▣')}</span><span><span class="tx-title">${esc(project.name)}</span><span class="tx-meta">ใช้ทั้งหมด ${money(projectSpend(project.id))}</span></span><span aria-hidden="true">›</span></button>`).join('');
}
function renderHome(){
 const t=totals(),hideIncome=state.settings.hideIncomeHome!==false;
 const daily=dailyAllowance(t);
 $('dailyAvailable').textContent=daily.past?'—':money(daily.amount);
 $('dailyHint').textContent=daily.past?'เดือนนี้สิ้นสุดแล้ว':`${daily.source} ${money(daily.remaining)} ÷ ${daily.days} วัน${daily.current?'ที่เหลือ (รวมวันนี้)':'ของเดือน'}${daily.remaining<0?' · ยอดใช้จ่ายเกินเงินที่มีแล้ว':''}`;
 $('monthLabel').textContent=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date());
 $('homeMetrics')?.classList.toggle('privacy-on',hideIncome);
 if($('availableCard'))$('availableCard').hidden=hideIncome;
 if($('incomeCard'))$('incomeCard').hidden=hideIncome;
 $('available').textContent=money(t.available);
 $('income').textContent=money(t.income);
 $('expense').textContent=money(paoExpenseTotal());
 $('saving').textContent=money(t.saving);
 $('rate').textContent=hideIncome?'':`อัตราเงินเก็บ ${t.rate.toFixed(1)}%`;
 const visibleTx=currentMonthTx().filter(x=>!hideIncome||x.type!=='income'),r=[...visibleTx].sort((a,b)=>new Date(b.datetime)-new Date(a.datetime)).slice(0,6);
 $('recent').innerHTML=r.map(x=>txrow(x)).join('')||'<div class="empty">ยังไม่มีรายการที่แสดงในหน้าแรก<br><button class="soft" onclick="openAdd()">＋ เพิ่มรายการแรก</button></div>';
 const uq=[];
 for(const x of r){if(x.type==='settlement')continue;if(!uq.some(y=>y.type===x.type&&y.note===x.note))uq.push(x);if(uq.length===4)break}
 $('quick').innerHTML=uq.map(x=>`<div class="quick"><button class="quick-main" onclick="quickAddNow('${x.id}')"><b>${icon(x)} ${esc(x.note||x.category||'เงินเก็บ')}</b><small>${money(x.amount)} • แตะเพื่อบันทึกซ้ำ</small></button><button class="quick-edit" onclick="quickAdd('${x.id}')">แก้ก่อนบันทึก</button></div>`).join('')||'<div class="empty">เพิ่มรายการสักครั้งก่อน แล้วรายการที่ใช้ซ้ำบ่อยจะมาอยู่ตรงนี้<br><button class="soft" onclick="openAdd()">＋ เพิ่มรายการ</button></div>';
 renderPockets();
 const recur=state.recurring.filter(r=>r.kind!=='installment'&&r.enabled&&(!hideIncome||r.template.type!=='income')).sort((a,b)=>new Date(a.nextRun)-new Date(b.nextRun)).slice(0,4);
 $('homeRecurring').innerHTML=recur.map(r=>`<div class="setrow"><div><b>↻ ${r.template.type==='saving'?'💰 ':''}${esc(r.template.note||r.template.category||'เงินเก็บ')}</b><small class="muted" style="display:block">${r.frequency==='daily'?'ทุกวัน':r.frequency==='weekly'?'ทุกสัปดาห์':'ทุกเดือน'} • ครั้งถัดไป ${new Date(r.nextRun).toLocaleDateString('th-TH')}</small></div><b class="${r.template.type==='saving'?'saving':'expense'}">${money(r.template.amount)}</b></div>`).join('')||'<div class="empty">ยังไม่มีรายการประจำ<br><button class="soft" onclick="openAdd(true)">＋ ตั้งรายการประจำ</button></div>';
 renderBudget();renderDebt();renderHomeProjects();
}
function renderHistory() {
  historyPeriod = $('historyPeriod').value || historyPeriod;
  const query = $('search').value.trim().toLowerCase(), type = $('typeFilter').value, owner = $('ownerFilter').value, project = $('projectFilter').value;
  const list = [...state.transactions].filter(t => (historyPeriod === 'all' || monthKey(t.datetime) === historyPeriod) && (type === 'all' || t.type === type) && (owner === 'all' || (owner === 'PaoShare' ? expenseShare(t) > 0 : t.owner === owner)) && (project === 'all' || (project === 'none' ? !t.projectId : t.projectId === project)) && (!query || `${t.note || ''} ${t.category || ''} ${t.payment || ''} ${projectById(t.projectId)?.name || ''} ${pocketById(t.pocketId)?.name || ''}`.toLowerCase().includes(query))).sort((a,b) => new Date(b.datetime) - new Date(a.datetime));
  let day = '';
  $('historyList').innerHTML = list.map(t => {
    const date = new Date(t.datetime).toLocaleDateString('th-TH', {day:'numeric',month:'long',year:'numeric'});
    const heading = date !== day ? `<h2 class="date-heading">${date}</h2>` : '';
    day = date;
    return heading + txrow(t,owner === 'PaoShare' ? 'Pao' : null);
  }).join('') || '<div class="empty">ไม่พบรายการตามเงื่อนไขนี้<button class="btn" onclick="clearHistoryFilters()">ล้างตัวกรอง</button></div>';
  $('historyCount').textContent = `${list.length} รายการ · ${historyPeriod === 'all' ? 'ทุกช่วงเวลา' : formatMonth(historyPeriod)}${owner === 'PaoShare' ? ' · ส่วนของเปา ' + money(paoExpenseTotal(list)) : ''}`;
}
function renderSummary(){const t=totals();$('sInc').textContent=money(t.income);$('sExp').textContent=money(t.expense);$('sSav').textContent=money(t.saving);$('sAvail').textContent=money(t.available);$('sRate').textContent=`อัตราเงินเก็บ ${t.rate.toFixed(1)}%`;const ex=currentMonthTx().filter(x=>x.type==='expense'),cats={};ex.forEach(x=>cats[x.category]=(cats[x.category]||0)+x.amount);let mx=Math.max(1,...Object.values(cats));$('catChart').innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="chartrow"><span>${esc(k)}</span><div class="bar"><div style="width:${v/mx*100}%"></div></div><b>${money(v)}</b></div>`).join('')||'<div class="empty">ยังไม่มีรายจ่ายเดือนนี้</div>';const projs=state.projects.map(p=>[p.name,projectSpend(p.id,true)]).filter(x=>x[1]>0),pmx=Math.max(1,...projs.map(x=>x[1]));$('projectChart').innerHTML=projs.map(([k,v])=>`<div class="chartrow"><span>${esc(k)}</span><div class="bar"><div style="width:${v/pmx*100}%"></div></div><b>${money(v)}</b></div>`).join('')||'<div class="empty">เดือนนี้ยังไม่มีการใช้จ่ายโปรเจกต์</div>';const owners={Pao:0,Tim:0,Both:0};ex.forEach(x=>owners[x.owner]=(owners[x.owner]||0)+x.amount);mx=Math.max(1,...Object.values(owners));$('ownerChart').innerHTML=Object.entries(owners).map(([k,v])=>`<div class="chartrow"><span>${who(k)}</span><div class="bar"><div style="width:${v/mx*100}%"></div></div><b>${money(v)}</b></div>`).join('');const d=debtFor();$('sumDebt').innerHTML=d===0?'ไม่มีใครค้างใคร':`${d>0?'ติมค้างเปา':'เปาค้างติม'} <b>${money(Math.abs(d))}</b>`;$('pocketSummary').innerHTML=state.pockets.map(p=>{const b=pocketBalance(p.id),pct=p.goal?Math.min(100,b/p.goal*100):0;return `<div class="detail-row"><div class="detail-head"><div><b>${esc(p.icon||'💰')} ${esc(p.name)}</b><br><small class="muted">เป้าหมาย ${money(p.goal)}</small></div><b>${money(b)}</b></div><div class="progress saving" style="margin-top:7px"><div style="width:${pct}%"></div></div></div>`}).join('')||'<div class="empty">ยังไม่มีกระเป๋าเงินเก็บ</div>'}
function projectCategoryBreakdown(pid){const xs=state.transactions.filter(t=>t.type==='expense'&&t.projectId===pid),c={};xs.forEach(x=>c[x.category]=(c[x.category]||0)+x.amount);return c}
function toggleProject(pid,forceOpen=false){const el=$(`project_${pid}`);if(!el)return;if(forceOpen)el.classList.add('expanded');else el.classList.toggle('expanded');syncA11yState()}
function renderProjects() {
  const expanded = new Set([...document.querySelectorAll('.project-card.expanded')].map(el => el.id));
  $('projectList').innerHTML = [...state.projects].sort((a,b) => (a.status === 'Archived') - (b.status === 'Archived')).map(project => {
    const spent = projectSpend(project.id), saved = projectSaving(project.id), budget = Number(project.budget || 0);
    const percent = budget ? spent / budget * 100 : 0;
    const categories = projectCategoryBreakdown(project.id), max = Math.max(1,...Object.values(categories));
    const transactions = state.transactions.filter(t => t.projectId === project.id).sort((a,b) => new Date(b.datetime)-new Date(a.datetime));
    const cardId = 'project_' + project.id, panelId = 'projectPanel_' + project.id;
    return `<article class="card project-card ${expanded.has(cardId) ? 'expanded' : ''}" id="${esc(cardId)}"><div class="project-title"><h2>${esc(project.icon || '▣')} ${esc(project.name)}</h2><span class="status">${esc(statusLabel(project.status))}</span></div><div class="project-stat"><div><small>งบทั้งหมด</small><b>${money(budget)}</b></div><div><small>ใช้จริงทั้งหมด</small><b>${money(spent)}</b></div><div><small>เงินเก็บที่เชื่อมไว้</small><b class="saving">${money(saved)}</b></div></div><div class="progress ${budget && spent > budget ? 'over' : ''}"><div style="width:${Math.min(100,percent)}%"></div></div><p class="${budget && spent > budget ? 'expense' : 'muted'}">${budget ? (spent > budget ? 'เกินงบ ' + money(spent-budget) : 'เหลือ ' + money(budget-spent)) + ' · ใช้ไป ' + percent.toFixed(0) + '%' : 'ยังไม่ตั้งงบ'}</p><button class="disclosure" data-disclosure="${esc(cardId)}" onclick="toggleProject(${jsArg(project.id)})" aria-expanded="${expanded.has(cardId)}" aria-controls="${esc(panelId)}">ดูหมวดและรายการ <span aria-hidden="true">⌄</span></button><div class="project-detail" id="${esc(panelId)}"><h3>แยกตามหมวด</h3>${Object.entries(categories).sort((a,b) => b[1]-a[1]).map(([category,value]) => `<div class="chartrow"><span>${esc(category)}</span><div class="bar"><div style="width:${value/max*100}%"></div></div><b>${money(value)}</b></div>`).join('') || '<p class="empty">ยังไม่มีรายจ่าย</p>'}<h3>รายการทั้งหมด</h3>${transactions.map(tx => txrow(tx)).join('') || '<p class="empty">ยังไม่มีรายการ</p>'}<div class="actions"><button class="soft" onclick="editProject(${jsArg(project.id)})">แก้ไขโปรเจกต์</button>${project.status !== 'Archived' ? `<button class="btn" onclick="archiveProject(${jsArg(project.id)})">เก็บเข้าคลัง</button>` : ''}</div></div></article>`;
  }).join('') || '<div class="empty">ยังไม่มีโปรเจกต์<button class="soft" onclick="addProject()">＋ เพิ่มโปรเจกต์แรก</button></div>';
}
function renderSettings(){$('payments').innerHTML=state.payments.map((p,i)=>`<div class="setrow"><div><b>${esc(p)}</b><small class="muted" style="display:block">${p===state.settings.defaultPayment?'ค่าเริ่มต้น':''}</small></div><div>${p!==state.settings.defaultPayment?`<button class="soft" onclick="setDefaultByIndex(${i})">ตั้งเป็นค่าเริ่มต้น</button>`:''} ${state.payments.length>1&&p!==state.settings.defaultPayment?`<button class="danger" onclick="removePayByIndex(${i})">ลบ</button>`:''}</div></div>`).join('');$('pocketSettings').innerHTML=state.pockets.map(p=>`<div class="setrow"><div><b>${esc(p.icon||'💰')} ${esc(p.name)}</b><small class="muted" style="display:block">${money(pocketBalance(p.id))} / ${money(p.goal)}${p.projectId&&projectById(p.projectId)?` • ${esc(projectById(p.projectId).name)}`:''}</small></div><button class="soft" onclick="editPocket('${p.id}')">แก้</button></div>`).join('')||'<div class="empty">ยังไม่มีกระเป๋าเงินเก็บ</div>';$('recList').innerHTML=state.recurring.filter(r=>r.kind!=='installment').map(r=>`<div class="setrow"><div><b>↻ ${r.template.type==='saving'?'💰 ':''}${esc(r.template.note||r.template.category||'เงินเก็บ')} • ${money(r.template.amount)}</b><small class="muted" style="display:block">${r.frequency==='daily'?'ทุกวัน':r.frequency==='weekly'?'ทุกสัปดาห์':'ทุกเดือน'} • ${new Date(r.nextRun).toLocaleString('th-TH')}</small></div><div><button class="switch ${r.enabled?'on':''}" onclick="toggleRec('${r.id}')" type="button" aria-label="เปิดหรือปิดรายการประจำนี้" aria-pressed="${r.enabled?'true':'false'}"></button> <button class="danger" onclick="delRec('${r.id}')">ลบ</button></div></div>`).join('')||'<div class="empty">ยังไม่มีรายการประจำ</div>';$('budSettings').innerHTML=`<div class="setrow"><div><b>งบรวม</b><small class="muted" style="display:block">ใช้จริง ${money(totals().expense)}</small></div><b>${money(state.settings.overallBudget)}</b></div>`+Object.entries(state.budgets).map(([k,v])=>{const used=currentMonthTx().filter(x=>x.type==='expense'&&x.category===k).reduce((s,x)=>s+x.amount,0);return `<div class="setrow"><div>${esc(k)}<small class="muted" style="display:block">ใช้ ${money(used)}</small></div><b>${money(v)}</b></div>`}).join('');$('projectSettings').innerHTML=state.projects.map(p=>`<div class="setrow"><div><b>${esc(p.icon||'▣')} ${esc(p.name)}</b><small class="muted" style="display:block">${esc(statusLabel(p.status))} • งบ ${money(p.budget)}</small></div><button class="soft" onclick="editProject('${p.id}')">แก้</button></div>`).join('')||'<div class="empty">ยังไม่มีโปรเจกต์</div>';$('themeSwitch').classList.toggle('on',state.settings.theme==='dark');$('homeIncomeSwitch')?.classList.toggle('on',state.settings.hideIncomeHome!==false)}
function addPayment(){const x=prompt('ชื่อช่องทางชำระเงิน เช่น บัตรเครดิต')?.trim();if(!x)return;if(state.payments.includes(x))return toastMsg('มีรายการนี้แล้ว');state.payments.push(x);save();renderAll()}
function setDefault(p){state.settings.defaultPayment=p;save();renderAll()}
function setDefaultByIndex(i){const p=state.payments[i];if(p)setDefault(p)}
function removePay(p){if(p===state.settings.defaultPayment)return toastMsg('เลือกช่องทางเริ่มต้นอื่นก่อนลบ');state.payments=state.payments.filter(x=>x!==p);save();renderAll()}
function removePayByIndex(i){const p=state.payments[i];if(p)removePay(p)}
let editingPocketId=null;
function fillPocketProjectOptions(selected=''){const el=$('pocketProjectInput');if(!el)return;el.innerHTML='<option value="">ไม่เชื่อมโปรเจกต์</option>'+state.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.icon||'▣')} ${esc(p.name)}</option>`).join('');if([...el.options].some(o=>o.value===selected))el.value=selected}
function addPocket(inline = false) {
  pocketFromForm = inline && currentView() === 'add';
  editingPocketId = null;
  $('pocketModalTitle').textContent = 'สร้างกระเป๋าเงินเก็บ'; $('pocketSaveBtn').textContent = 'สร้างกระเป๋า';
  $('pocketNameInput').value = ''; $('pocketIconInput').value = '💰'; $('pocketGoalInput').value = ''; $('pocketOpeningInput').value = '0';
  fillPocketProjectOptions(''); updatePocketPreview(); openModal('pocketModal', '#pocketNameInput');
}
function editPocket(pid){const p=pocketById(pid);if(!p)return;editingPocketId=pid;$('pocketModalTitle').textContent='แก้ไขกระเป๋าเงินเก็บ';$('pocketSaveBtn').textContent='บันทึกกระเป๋า';$('pocketNameInput').value=p.name||'';$('pocketIconInput').value=p.icon||'💰';$('pocketGoalInput').value=p.goal||0;$('pocketOpeningInput').value=p.openingBalance||0;fillPocketProjectOptions(p.projectId||'');updatePocketPreview();openModal('pocketModal','#pocketNameInput')}
function closePocketModal() { closeModal('pocketModal'); editingPocketId = null; pocketFromForm = false; }
function updatePocketPreview(){const name=$('pocketNameInput')?.value.trim()||'กองทุนฉุกเฉิน',icon=$('pocketIconInput')?.value||'💰',goal=Number($('pocketGoalInput')?.value||0),project=projectById($('pocketProjectInput')?.value);$('pocketPreviewName').textContent=`${icon} ${name}`;$('pocketPreviewDetail').textContent=`เป้าหมาย ${money(goal)} • ${project?`เชื่อม ${project.name}`:'ไม่เชื่อมโปรเจกต์'}`}
function savePocketModal() {
  clearFieldErrors($('pocketModal'));
  const name = $('pocketNameInput').value.trim(), goal = parseMoney($('pocketGoalInput').value || '0'), opening = parseMoney($('pocketOpeningInput').value || '0');
  if (!name) return fieldError('pocketNameInput','ใส่ชื่อกระเป๋าเงินเก็บ');
  if (!Number.isFinite(goal) || goal < 0) return fieldError('pocketGoalInput','เป้าหมายต้องเป็นจำนวนเงินที่ไม่ติดลบ');
  if (!Number.isFinite(opening) || opening < 0) return fieldError('pocketOpeningInput','ยอดเริ่มต้นต้องเป็นจำนวนเงินที่ไม่ติดลบ');
  const pocketId = editingPocketId || id(), fromForm = pocketFromForm;
  const value = {id:pocketId,name,icon:$('pocketIconInput').value || '💰',goal,openingBalance:opening,projectId:$('pocketProjectInput').value || null};
  if (editingPocketId) state.pockets = state.pockets.map(p => p.id === editingPocketId ? {...p,...value} : p);
  else state.pockets.push(value);
  try {
    save(); closePocketModal(); renderAll();
    if (fromForm) { $('pocket').value = pocketId; clearFieldError('pocket'); updateFormSummary(); stashDraft(); $('pocket').focus(); }
    toastMsg('บันทึกกระเป๋าแล้ว');
  } catch (error) { fieldError('pocketNameInput',error.message); }
}
let editingProjectId=null;
function addProject(){
 editingProjectId=null;
 $('projectModalTitle').textContent='เพิ่มโปรเจกต์';
 $('projectSaveBtn').textContent='เพิ่มโปรเจกต์';
 $('projectNameInput').value='';
 $('projectIconInput').value='✈️';
 $('projectBudgetInput').value='';
 $('projectStatusInput').value='Planning';
 updateProjectPreview();
 openModal('projectModal','#projectNameInput');
}
function editProject(pid){
 const p=projectById(pid);if(!p)return;
 editingProjectId=pid;
 $('projectModalTitle').textContent='แก้ไขโปรเจกต์';
 $('projectSaveBtn').textContent='บันทึกการแก้ไข';
 $('projectNameInput').value=p.name||'';
 $('projectIconInput').value=p.icon||'▣';
 $('projectBudgetInput').value=p.budget||0;
 $('projectStatusInput').value=p.status||'Planning';
 updateProjectPreview();
 openModal('projectModal','#projectNameInput');
}
function closeProjectModal(){
 closeModal('projectModal');
 editingProjectId=null;
}
function updateProjectPreview(){
 const name=$('projectNameInput')?.value.trim()||'ทริปพักผ่อน';
 const icon=$('projectIconInput')?.value||'✈️';
 const budget=Number($('projectBudgetInput')?.value||0);
 const status=$('projectStatusInput')?.value||'Planning';
 $('projectPreviewName').textContent=`${icon} ${name}`;
 $('projectPreviewBudget').textContent=`งบ ${money(budget)} • ${statusLabel(status)}`;
}
function saveProjectModal() {
  clearFieldErrors($('projectModal'));
  const name = $('projectNameInput').value.trim(), budget = parseMoney($('projectBudgetInput').value || '0');
  if (!name) return fieldError('projectNameInput','ใส่ชื่อโปรเจกต์');
  if (!Number.isFinite(budget) || budget < 0) return fieldError('projectBudgetInput','งบต้องเป็นจำนวนเงินที่ไม่ติดลบ');
  const projectId = editingProjectId || id();
  const value = {id:projectId,name,budget,icon:$('projectIconInput').value || '▣',status:$('projectStatusInput').value || 'Planning'};
  if (editingProjectId) state.projects = state.projects.map(p => p.id === projectId ? {...p,...value} : p);
  else state.projects.push(value);
  try { save(); closeProjectModal(); renderAll(); toastMsg('บันทึกโปรเจกต์แล้ว'); }
  catch (error) { fieldError('projectNameInput',error.message); }
}
function archiveProject(pid){const p=projectById(pid);if(p){p.status='Archived';save();renderAll()}}
function renderInstallments() {
  const plans = state.recurring.filter(rec => rec.kind === 'installment');
  const row = (rec, manage) => {
    const remaining = rec.totalInstallments - rec.completedInstallments;
    const balance = installmentRemaining(rec);
    const status = remaining === 0 ? 'ครบทุกงวดแล้ว' : rec.enabled ? `งวดถัดไป ${new Date(rec.nextRun).toLocaleDateString('th-TH')}` : 'พักการบันทึกอัตโนมัติ';
    const controls = manage ? `<div class="installment-actions">${remaining ? `<button class="soft" onclick="toggleRec(${jsArg(rec.id)})">${rec.enabled ? 'พัก' : 'ทำต่อ'}</button>` : ''}<button class="danger" onclick="delRec(${jsArg(rec.id)})">${remaining ? 'ยกเลิกแผน' : 'ลบแผน'}</button></div>` : '';
    return `<div class="installment-row"><div class="detail-head"><b>${esc(rec.template.note || rec.template.category || 'รายการผ่อน')}</b><b class="expense">${money(balance)}</b></div><small class="muted">${money(rec.template.amount)} / เดือน · ${who(rec.template.owner)}${rec.template.owner === 'Both' ? ' · เปา ' + money(expenseShare(rec.template)) + ' / งวด' : ''}</small><div class="progress" role="progressbar" aria-label="งวดที่บันทึกแล้ว" aria-valuemin="0" aria-valuemax="${rec.totalInstallments}" aria-valuenow="${rec.completedInstallments}"><div style="width:${rec.completedInstallments / rec.totalInstallments * 100}%"></div></div><div class="detail-head"><span>เหลือ ${remaining} / ${rec.totalInstallments} งวด</span><span class="muted">บันทึกแล้ว ${rec.completedInstallments} งวด</span></div><small class="muted">${status}</small>${controls}</div>`;
  };
  const active = plans.filter(rec => rec.completedInstallments < rec.totalInstallments);
  $('homeInstallments').innerHTML = active.map(rec => row(rec,false)).join('') || `<p class="empty">${plans.length ? 'บันทึกครบทุกงวดแล้ว' : 'เพิ่มยอดผ่อน แล้วดูยอดคงเหลือที่ลดลงทุกเดือน'}</p>`;
  if (plans.length) $('homeInstallments').innerHTML += '<button class="btn" onclick="openSettingsSection(\'installmentList\')">จัดการรายการผ่อน</button>';
  $('installmentList').innerHTML = plans.map(rec => row(rec,true)).join('') || '<p class="empty">ยังไม่มีรายการผ่อน</p>';
}
function toggleRec(rid){const r=state.recurring.find(x=>x.id===rid);if(r){if(r.kind==='installment'&&r.completedInstallments>=r.totalInstallments)return;r.enabled=!r.enabled;save();checkRecurring();renderAll()}}
function delRec(rid){const rec=state.recurring.find(x=>x.id===rid);if(!rec)return;if(!confirm(rec.kind==='installment'?'ยกเลิกแผนผ่อนนี้? รายจ่ายที่บันทึกไปแล้วยังคงอยู่ และจะไม่เพิ่มงวดใหม่':'ลบรายการประจำนี้? รายการที่บันทึกไปแล้วจะยังคงอยู่'))return;state.recurring=state.recurring.filter(x=>x.id!==rid);removeDraft('recurring_'+rid);save();renderAll()}
function openBudget(){
 $('overallBudget').value=state.settings.overallBudget||0;
 $('catBudFields').innerHTML=state.categories.expense.map((c,i)=>`<div class="field" style="margin-bottom:8px"><label for="catBudget_${i}">${esc(c)}</label><input id="catBudget_${i}" class="input catb" data-cat="${esc(c)}" value="${state.budgets[c]||''}" placeholder="ไม่ตั้งงบ" inputmode="decimal"></div>`).join('');
 openModal('budgetModal','#overallBudget');
}
function closeBudget(){closeModal('budgetModal')}
function saveBudget() {
  clearFieldErrors($('budgetModal'));
  const overall = parseMoney($('overallBudget').value || '0');
  if (!Number.isFinite(overall) || overall < 0) return fieldError('overallBudget','ใส่งบรวมที่ไม่ติดลบ');
  const budgets = {};
  for (const input of document.querySelectorAll('.catb')) {
    const amount = parseMoney(input.value || '0');
    if (!Number.isFinite(amount) || amount < 0) return fieldError(input.id,'ใส่งบหมวดนี้ที่ไม่ติดลบ');
    if (amount > 0) budgets[input.dataset.cat] = amount;
  }
  state.settings.overallBudget = overall; state.budgets = budgets;
  try { save(); closeBudget(); renderAll(); toastMsg('บันทึกงบแล้ว'); }
  catch (error) { fieldError('overallBudget',error.message); }
}
function toggleTheme(){state.settings.theme=state.settings.theme==='dark'?'light':'dark';save();applyTheme();renderSettings();syncA11yState()}
function toggleHomeIncomePrivacy(){state.settings.hideIncomeHome=state.settings.hideIncomeHome===false;save();renderAll();toastMsg(state.settings.hideIncomeHome?'ซ่อนรายรับหน้าแรกแล้ว':'แสดงรายรับหน้าแรกแล้ว')}
function applyTheme(){document.documentElement.setAttribute('data-theme',state.settings.theme)}
function download(content,name,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportCSV(){const rows=[['datetime','type','amount','category','payment','payer','owner','pao_share','tim_share','project','pocket','settlement_from','settlement_to','note'],...state.transactions.map(t=>[t.datetime,t.type,t.amount,t.category||'',t.payment||'',t.payer||'',t.owner||'',t.split?.Pao||'',t.split?.Tim||'',projectById(t.projectId)?.name||'',pocketById(t.pocketId)?.name||'',t.from||'',t.to||'',t.note||''])];download('\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),'pao-tim-money-v5.csv','text/csv;charset=utf-8')}
function backup() {
  const when = new Date().toISOString();
  let data = state;
  if (storageReadBlocked) {
    try { const raw = localStorage.getItem(KEY); if (raw) { download(raw, 'pao-tim-original-data.json','application/json'); return; } } catch (_) {}
    toastMsg('อ่านข้อมูลเดิมไม่ได้ กรุณาเปิดเบราว์เซอร์ใหม่ก่อนสำรอง'); return;
  }
  download(JSON.stringify({...data,backupMeta:{version:1,createdAt:when}},null,2), `pao-tim-backup-${when.slice(0,10)}.json`, 'application/json');
  try { localStorage.setItem(BACKUP_TIME_KEY, when); } catch (_) {}
  renderBackupStatus();
  toastMsg('สร้างไฟล์สำรองแล้ว ตรวจสอบไฟล์ในรายการดาวน์โหลด');
}
async function restore(event) {
  const input = event.target, file = input.files?.[0];
  if (!file) return;
  input.value = '';
  try {
    const parsed = JSON.parse(await file.text());
    const candidate = validateBackup(parsed);
    presentRestore(candidate, file.name, parsed.backupMeta?.createdAt || null, false);
  } catch (error) { toastMsg(error.message === 'invalid-backup' ? 'ไฟล์สำรองไม่สมบูรณ์ ข้อมูลปัจจุบันยังอยู่ครบ' : 'อ่านไฟล์สำรองไม่ได้ ข้อมูลปัจจุบันยังอยู่ครบ'); }
}
function renderAll() {
  renderPays(); renderSelects(); renderCats(); renderPeriodOptions(); renderHome(); renderHistory(); renderSummary(); renderProjects(); renderSettings();
  renderInstallments();
  updateSplit(); updateFormSummary(); syncA11yState(); syncAddControls(); syncBackButton(); renderBackupStatus(); renderDraftNotice();
  $('localNotice').hidden = !!state.settings.localNoticeDismissed;
  $('homePocketsCard').hidden = !state.pockets.length;
  $('homeRecurringCard').hidden = !state.recurring.some(r => r.kind !== 'installment' && r.enabled && (state.settings.hideIncomeHome === false || r.template.type !== 'income'));
  $('homeProjectsCard').hidden = !state.projects.some(p => p.status === 'Active');
  $('setupCard').hidden = state.pockets.length > 0 && state.recurring.length > 0 && state.projects.length > 0;
  $('quickCard').hidden = !$('quick').querySelector('.quick');
  $('monthLabel').textContent = formatMonth(selectedMonth);
}


// Local persistence, recovery, and navigation helpers.
const RECOVERY_KEY = KEY + '_before_restore';
const BACKUP_TIME_KEY = KEY + '_last_backup';
const DRAFT_KEY = KEY + '_drafts';
let toastTimer = null, undoAction = null, savingTx = false, restoringDraft = false;
let formBaseline = '', detailTxId = null, highlightTxId = null, pocketFromForm = false;
let pendingRestore = null, restoringRoute = false;
let settlementSnapshot = 0;
let selectedMonth = monthKey(new Date()), historyPeriod = 'all';
let route = {app:'pt-money',view:'home',detail:null,from:null,scroll:0};
const viewScroll = {}, quickGuard = new Map();
const draftFields = ['amount','dt','cat','project','pay','pocket','savingProject','ps','ts','paoPercent','timPercent','paidPao','paidTim','incomePao','incomeTim','savingPao','savingTim','pocketPao','pocketTim','note','freq','nextRun','installmentCount','planName','installmentBasis','installmentStart','installmentDay','monthlyStart','monthlyDay'];
let draftCache = readDrafts();

function typeLabel(type) { return ({expense:'รายจ่าย',income:'รายรับ',saving:'เงินเก็บ',settlement:'คืนเงิน'})[type] || 'รายการ'; }
function setSavingDirection(direction) {
  form.savingDirection = direction === 'out' ? 'out' : 'in';
  if (form.savingDirection === 'out') toggleRecurring(false);
  $('recurringField').hidden = !!form.editId || form.savingDirection === 'out';
  $('payLabel').textContent = form.savingDirection === 'out' ? 'ถอนกลับไปที่' : 'เงินออกจากไหน';
  clearFieldErrors(); updateFormSummary(); stashDraft();
}
function statusLabel(status) { return ({Planning:'วางแผน',Active:'กำลังใช้งาน',Completed:'เสร็จแล้ว',Archived:'เก็บเข้าคลัง'})[status] || status; }
function jsArg(value) { return esc(JSON.stringify(String(value))); }
function monthKey(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}` : '';
}
function formatMonth(value) { return new Date(value + '-01T12:00:00').toLocaleDateString('th-TH',{month:'long',year:'numeric'}); }
function parseMoney(value) {
  const text = String(value).trim().replace(/,/g,'');
  if (!/^(?:\d+)(?:\.\d{0,2})?$/.test(text)) return NaN;
  const amount = Number(text);
  return Number.isFinite(amount) && amount <= 999999999999.99 ? Math.round(amount * 100) / 100 : NaN;
}
function getSplit(amount) {
  if (form.owner === 'Pao') return {Pao:amount,Tim:0};
  if (form.owner === 'Tim') return {Pao:0,Tim:amount};
  if (form.split === 'custom') return {Pao:parseMoney($('ps').value),Tim:parseMoney($('ts').value)};
  const pao = Math.ceil(amount * 100 / 2);
  return {Pao:pao/100,Tim:(Math.round(amount*100)-pao)/100};
}
function storageFailure(message) {
  const box = document.getElementById('storageError');
  if (box) { box.hidden = false; document.getElementById('storageErrorText').textContent = message; }
  const error = new Error(message); error.name = 'LocalSaveError'; return error;
}
function clearFieldError(id) {
  const el = $(id); if (!el) return;
  el.removeAttribute('aria-invalid');
  const errorId = id + '-error';
  const descriptions = (el.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== errorId);
  if (descriptions.length) el.setAttribute('aria-describedby', descriptions.join(' ')); else el.removeAttribute('aria-describedby');
  $(errorId)?.remove();
}
function clearFieldErrors(root = $('transactionForm')) {
  root?.querySelectorAll('[aria-invalid=true]').forEach(el => clearFieldError(el.id));
  if (root === $('transactionForm')) { $('formError').hidden = true; $('formError').textContent = ''; }
}
function fieldError(id, message) {
  const el = $(id);
  if (id === 'formError') { el.hidden = false; el.textContent = message; }
  else if (el) {
    clearFieldError(id);
    el.setAttribute('aria-invalid','true');
    const node = document.createElement('span'); node.id = id + '-error'; node.className = 'field-error'; node.textContent = message;
    (el.closest('.date-control') || el).insertAdjacentElement('afterend', node);
    el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'),node.id].filter(Boolean).join(' '));
  }
  el?.closest('details')?.setAttribute('open','');
  el?.scrollIntoView({block:'center',behavior:'instant'});
  if (el?.matches('input,select,textarea,button')) el.focus({preventScroll:true});
  else if (el) { el.tabIndex = -1; el.focus({preventScroll:true}); }
  return false;
}
function undoLastAction() {
  if (!undoAction) return;
  const undo = undoAction;
  try { undo(); undoAction = null; toastMsg('เลิกทำแล้ว'); }
  catch (error) { toastMsg(error.message, undo); }
}

function readDrafts() {
  try { const x = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
  catch (_) { return {}; }
}
function draftSnapshot() {
  return {form:clone(form),values:Object.fromEntries(draftFields.map(key => [key,$(key).value])),optional:$('optionalDetails').open};
}
function draftSignature() {
  const draft = draftSnapshot();
  delete draft.form.catExpanded;
  return JSON.stringify({form:draft.form,values:draft.values});
}
function stashDraft() {
  if (restoringDraft || savingTx || currentView() !== 'add') return;
  const key = currentDraftKey();
  if (draftSignature() === formBaseline) { removeDraft(key); return; }
  draftCache[key] = {...draftSnapshot(),baseline:formBaseline,origin:route.from || 'home',updatedAt:Date.now()};
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draftCache)); $('draftStatus').textContent = 'เก็บแบบร่างแล้ว'; }
  catch (_) { $('draftStatus').textContent = 'เก็บแบบร่างในหน้านี้ — อย่าเพิ่งปิดแท็บ'; }
}
function removeDraft(key) {
  delete draftCache[key];
  try { sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draftCache)); } catch (_) {}
  if ($('draftStatus')) $('draftStatus').textContent = '';
}
function restoreDraft(key) {
  const draft = draftCache[key];
  if (!draft?.form || !draft.values || !['expense','income','saving'].includes(draft.form.type)) return false;
  if (draft.form.editId && !state.transactions.some(t => t.id === draft.form.editId)) { removeDraft(key); return false; }
  if (draft.form.recurringEditId && !state.recurring.some(rec => rec.id === draft.form.recurringEditId)) { removeDraft(key); return false; }
  restoringDraft = true;
  form = {...form,...draft.form};
  if (form.type === 'expense' && form.recurring && !form.recurringEditId) { form.monthly = true; form.recurring = false; }
  setType(form.type); renderPays(); renderSelects();
  for (const field of draftFields) if (typeof draft.values[field] === 'string') $(field).value = draft.values[field];
  if ((form.installment || form.monthly) && !draft.values.installmentStart) {
    const start = new Date(draft.values.dt);
    if (Number.isFinite(start.getTime())) { $('installmentStart').value = $('monthlyStart').value = monthKey(start); $('installmentDay').value = $('monthlyDay').value = String(start.getDate()); }
    $('installmentBasis').value = 'monthly';
    $('planName').value = draft.values.note || '';
  }
  $('optionalDetails').open = !!draft.optional;
  toggleRecurring(!!form.recurring); syncInstallmentForm(); syncChoices(); renderCats(); updateSplit(); updateFormSummary();
  formBaseline = draft.baseline || '';
  $('draftStatus').textContent = 'กลับมาทำแบบร่างต่อ';
  restoringDraft = false;
  return true;
}
function syncChoices() {
  for (const [attr,key] of [['payer','payer'],['owner','owner'],['incowner','incOwner'],['savowner','savOwner'],['split','split']]) document.querySelectorAll(`[data-${attr}]`).forEach(b => b.classList.toggle('active',b.dataset[attr] === form[key]));
  syncA11yState();
}
function renderDraftNotice() {
  const drafts = Object.values(draftCache).filter(x => x?.form && (x.form.editId ? state.transactions.some(t => t.id === x.form.editId) : true) && (x.form.recurringEditId ? state.recurring.some(rec => rec.id === x.form.recurringEditId) : true)).sort((a,b) => b.updatedAt-a.updatedAt);
  $('draftNotice').hidden = !drafts.length;
  if (drafts.length) $('draftDescription').textContent = `${entryLabel(entryKindFor(drafts[0].form))} ${drafts[0].values.amount ? money(parseMoney(drafts[0].values.amount) || 0) : ''}${drafts.length > 1 ? ` · มี ${drafts.length} แบบร่าง แยกตามประเภท` : ' · กรอกต่อจากที่ค้างไว้ได้'}`;
}
function resumeLatestDraft() {
  const drafts = Object.entries(draftCache).filter(([,x]) => x?.form).sort((a,b) => b[1].updatedAt-a[1].updatedAt);
  if (!drafts.length) return;
  const [key,draft] = drafts[0];
  if (draft.form.recurringEditId) editRecurring(draft.form.recurringEditId); else if (draft.form.editId) editTx(draft.form.editId); else openEntry(entryKindFor(draft.form));
}
function clearForm() {
  if (draftSignature() !== formBaseline && !confirm(form.editId || form.recurringEditId ? 'คืนค่าฟอร์มเป็นข้อมูลที่บันทึกไว้? การแก้ไขในแบบร่างนี้จะถูกล้าง' : 'ล้างข้อมูลที่กรอกในฟอร์มนี้?')) return;
  const editId = form.editId, recurringEditId = form.recurringEditId, kind = entryKindFor();
  removeDraft(currentDraftKey());
  if (recurringEditId) editRecurring(recurringEditId); else if (editId) editTx(editId); else openEntry(kind,{fresh:true});
  $('amount').focus();
}
function dismissLocalNotice() { state.settings.localNoticeDismissed = true; save(); renderAll(); }

function setPeriod(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return;
  selectedMonth = value;
  renderAll();
}
function renderPeriodOptions() {
  document.querySelectorAll('[data-period]').forEach(el => el.value = selectedMonth);
  const months = new Set([selectedMonth, monthKey(new Date()), ...state.transactions.map(t => monthKey(t.datetime))]);
  if (historyPeriod !== 'all') months.add(historyPeriod);
  $('historyPeriod').innerHTML = '<option value="all">ทุกช่วงเวลา</option>' + [...months].filter(Boolean).sort().reverse().map(month => `<option value="${month}">${formatMonth(month)}</option>`).join('');
  $('historyPeriod').value = historyPeriod;
}
function clearHistoryFilters() {
  historyPeriod = 'all'; $('search').value = ''; $('typeFilter').value = 'all'; $('ownerFilter').value = 'all'; $('projectFilter').value = 'all';
  renderPeriodOptions(); renderHistory();
}
function openSettingsSection(id) { show('settings',{detail:id,from:currentView(),target:id}); }
function focusSetting(id) {
  const target = $(id)?.closest('.card');
  if (!target) return;
  target.tabIndex = -1; target.focus({preventScroll:true}); target.scrollIntoView({block:'start',behavior:'instant'});
}
function openTx(txid) {
  const tx = state.transactions.find(t => t.id === txid);
  if (!tx) return;
  detailTxId = txid;
  const label = tx.note || tx.category || typeLabel(tx.type);
  $('txModalTitle').textContent = label;
  const fields = [['ประเภท',typeLabel(tx.type)],['วันที่',new Date(tx.datetime).toLocaleString('th-TH')],['จำนวนเงิน',money(Math.abs(tx.amount))]];
  if (tx.type === 'settlement') fields.push(['คืนเงิน',`${who(tx.from)} → ${who(tx.to)}`]);
  else {
    fields.push(['ช่องทาง',tx.payment || 'ไม่ระบุ'],['เจ้าของรายการ',who(tx.owner)]);
    if (tx.payer) fields.push(['ผู้จ่ายเงินจริง',who(tx.payer)]);
    if (tx.split) fields.push(['ส่วนของเปา',money(tx.split.Pao)],['ส่วนของติม',money(tx.split.Tim)]);
    if (tx.installmentNumber) fields.push(['งวดผ่อน',`${tx.installmentNumber} / ${tx.installmentTotal}`]);
    if (tx.projectId) fields.push(['โปรเจกต์',projectById(tx.projectId)?.name || 'โปรเจกต์เดิม']);
    if (tx.pocketId) fields.push(['กระเป๋า',pocketById(tx.pocketId)?.name || 'กระเป๋าเดิม']);
  }
  $('txDetailContent').innerHTML = `<dl class="tx-info">${fields.map(([label,value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  $('txEditButton').hidden = tx.type === 'settlement';
  $('txEditButton').setAttribute('aria-label','แก้ไข ' + label);
  $('txDeleteButton').setAttribute('aria-label','ลบ ' + label);
  openModal('txModal');
}
function editFromDetail() { const txid = detailTxId; closeModal('txModal',false); editTx(txid); }

function validateBackup(input) {
  const invalid = () => { throw new Error('invalid-backup'); };
  if (!input || typeof input !== 'object' || !Array.isArray(input.transactions) || !Array.isArray(input.pockets) || !Array.isArray(input.projects) || !Array.isArray(input.recurring) || !Array.isArray(input.payments) || !input.settings || !input.categories || !input.budgets) invalid();
  if (!input.payments.length || input.payments.some(x => typeof x !== 'string' || !x.trim())) invalid();
  for (const type of ['expense','income']) if (!Array.isArray(input.categories[type]) || input.categories[type].some(x => typeof x !== 'string')) invalid();
  const validId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
  const validNumber = value => (typeof value === 'number' || typeof value === 'string') && value !== '' && Number.isFinite(Number(value));
  for (const list of [input.transactions,input.pockets,input.projects,input.recurring]) {
    const ids = new Set();
    for (const item of list) { if (!item || !validId(item.id) || ids.has(item.id)) invalid(); ids.add(item.id); }
  }
  function validateTx(tx, template = false) {
    if (!['expense','income','saving','settlement'].includes(tx.type) || !validNumber(tx.amount) || Number(tx.amount) === 0 || (Number(tx.amount) < 0 && (tx.type !== 'saving' || template))) invalid();
    if (!template && !Number.isFinite(new Date(tx.datetime).getTime())) invalid();
    if (tx.type === 'expense') {
      if (!['Pao','Tim'].includes(tx.payer) || !tx.split || !validNumber(tx.split.Pao) || !validNumber(tx.split.Tim) || Number(tx.split.Pao) < 0 || Number(tx.split.Tim) < 0 || Math.abs(Number(tx.split.Pao)+Number(tx.split.Tim)-Number(tx.amount)) > .011) invalid();
    }
    if (tx.type !== 'settlement' && !['Pao','Tim','Both'].includes(tx.owner)) invalid();
    if (tx.type === 'settlement' && (!['Pao','Tim'].includes(tx.from) || !['Pao','Tim'].includes(tx.to) || tx.from === tx.to)) invalid();
    for (const field of ['projectId','pocketId','recurringId']) if (tx[field] && !validId(tx[field])) invalid();
  }
  input.transactions.forEach(tx => validateTx(tx));
  input.recurring.forEach(rec => {
    if (!['daily','weekly','monthly'].includes(rec.frequency) || !Number.isFinite(new Date(rec.nextRun).getTime()) || !rec.template) invalid();
    validateTx(rec.template,true);
    if (rec.kind === 'installment' && (rec.frequency !== 'monthly' || rec.template.type !== 'expense' || !Number.isInteger(rec.totalInstallments) || rec.totalInstallments < 1 || rec.totalInstallments > 600 || !Number.isInteger(rec.completedInstallments) || rec.completedInstallments < 0 || rec.completedInstallments > rec.totalInstallments || !Number.isInteger(rec.dayOfMonth) || rec.dayOfMonth < 1 || rec.dayOfMonth > 31)) invalid();
    if (rec.kind === 'installment' && rec.installmentTotalAmount != null) {
      const totalCents = Math.round(Number(rec.installmentTotalAmount) * 100), shares = rec.installmentTotalSplit;
      if (!validNumber(rec.installmentTotalAmount) || !Number.isSafeInteger(totalCents) || totalCents < rec.totalInstallments || !shares || !validNumber(shares.Pao) || !validNumber(shares.Tim) || Number(shares.Pao) < 0 || Number(shares.Tim) < 0 || Math.round(Number(shares.Pao) * 100) + Math.round(Number(shares.Tim) * 100) !== totalCents || Math.round(Number(rec.template.amount) * 100) !== Math.floor(totalCents / rec.totalInstallments)) invalid();
    }
    if (rec.kind === 'monthly-expense' && (rec.frequency !== 'monthly' || rec.template.type !== 'expense' || !Number.isInteger(rec.dayOfMonth) || rec.dayOfMonth < 1 || rec.dayOfMonth > 31)) invalid();
  });
  input.pockets.forEach(p => { if (typeof p.name !== 'string' || !validNumber(p.goal ?? 0) || !validNumber(p.openingBalance ?? 0) || Number(p.goal) < 0 || Number(p.openingBalance) < 0) invalid(); });
  input.projects.forEach(p => { if (typeof p.name !== 'string' || !validNumber(p.budget ?? 0) || Number(p.budget) < 0 || !['Planning','Active','Completed','Archived'].includes(p.status)) invalid(); });
  if (!validNumber(input.settings.overallBudget ?? 0) || Number(input.settings.overallBudget) < 0 || Object.values(input.budgets).some(n => !validNumber(n) || Number(n) < 0)) invalid();
  return normalizeState(input);
}
function presentRestore(candidate, filename, createdAt, rollback) {
  pendingRestore = {candidate,rollback};
  $('restoreTitle').textContent = rollback ? 'ย้อนกลับไปก่อนกู้คืน' : 'ตรวจสอบก่อนกู้คืน';
  $('restoreFileName').textContent = filename + (createdAt && Number.isFinite(new Date(createdAt).getTime()) ? ' · ' + new Date(createdAt).toLocaleString('th-TH') : ' · ไฟล์นี้ไม่ระบุเวลาสำรอง');
  const summary = (label,value) => `<div><b>${label}</b><p>${value.transactions.length} รายการ</p><small>${value.pockets.length} กระเป๋า · ${value.projects.length} โปรเจกต์</small><small>${value.recurring.filter(rec=>rec.kind!=='installment').length} รายการประจำ · ${value.recurring.filter(rec=>rec.kind==='installment').length} แผนผ่อน</small></div>`;
  $('restoreComparison').innerHTML = `<div class="restore-comparison">${summary('ข้อมูลปัจจุบัน',state)}${summary('ข้อมูลที่จะใช้',candidate)}</div>`;
  $('confirmRestoreButton').textContent = rollback ? 'ย้อนกลับไปข้อมูลนี้' : 'แทนที่ด้วยข้อมูลนี้';
  $('restoreError').hidden = true;
  openModal('restoreModal','#confirmRestoreButton');
}
function cancelRestore() { pendingRestore = null; closeModal('restoreModal'); }
function confirmRestore() {
  if (!pendingRestore) return;
  const candidate = pendingRestore.candidate;
  let oldRecovery = null, recoveryWritten = false;
  try {
    oldRecovery = localStorage.getItem(RECOVERY_KEY);
    const originalRaw = localStorage.getItem(KEY);
    localStorage.setItem(RECOVERY_KEY, JSON.stringify({createdAt:new Date().toISOString(),state:clone(state),raw:originalRaw,readBlocked:storageReadBlocked}));
    recoveryWritten = true;
    localStorage.setItem(KEY,JSON.stringify(candidate));
  } catch (_) {
    if (recoveryWritten) { try { if (oldRecovery) localStorage.setItem(RECOVERY_KEY,oldRecovery); else localStorage.removeItem(RECOVERY_KEY); } catch (_) {} }
    $('restoreError').hidden = false; $('restoreError').textContent = 'ยังเก็บสำเนาและกู้คืนไม่ได้ อาจมีพื้นที่ไม่พอ ข้อมูลปัจจุบันยังไม่ถูกแทนที่'; return;
  }
  state = candidate; lastSavedState = clone(candidate); storageReadBlocked = false; $('storageError').hidden = true;
  draftCache = {}; try { sessionStorage.removeItem(DRAFT_KEY); } catch (_) {}
  pendingRestore = null; closeModal('restoreModal'); resetForm(); applyTheme(); show('settings',{replace:true,target:'backupSettings',saved:true});
  toastMsg('กู้คืนแล้ว ย้อนกลับได้ที่ส่วนสำรองและกู้คืนข้อมูล');
}
function previewRollback() {
  try {
    const recovery = JSON.parse(localStorage.getItem(RECOVERY_KEY));
    if (recovery.readBlocked) { toastMsg('สำเนาเดิมมีข้อมูลที่อ่านไม่ได้ ดาวน์โหลดไฟล์เดิมเก็บไว้ได้'); return; }
    presentRestore(validateBackup(recovery.state),'สำเนาก่อนกู้คืนครั้งล่าสุด',recovery.createdAt,true);
  } catch (_) { toastMsg('อ่านสำเนาก่อนกู้คืนไม่ได้ ข้อมูลปัจจุบันยังอยู่ครบ'); }
}
function downloadRecovery() {
  try {
    const recovery = JSON.parse(localStorage.getItem(RECOVERY_KEY));
    const content = recovery.raw ?? JSON.stringify(recovery.state,null,2);
    if (typeof content !== 'string') throw new Error('missing-recovery');
    download(content,'pao-tim-before-restore.json','application/json');
  } catch (_) { toastMsg('ดาวน์โหลดสำเนาเดิมไม่ได้'); }
}
function renderBackupStatus() {
  let last = null, recovery = null;
  try { last = localStorage.getItem(BACKUP_TIME_KEY); recovery = JSON.parse(localStorage.getItem(RECOVERY_KEY) || 'null'); } catch (_) {}
  $('backupStatus').textContent = `${state.transactions.length} รายการ · ${last ? 'สร้างไฟล์สำรองล่าสุด ' + new Date(last).toLocaleString('th-TH') : 'ยังไม่เคยสร้างไฟล์สำรอง'}`;
  $('recoveryRow').hidden = !recovery?.state;
  if (recovery?.state) $('recoveryStatus').textContent = `${recovery.state.transactions?.length || 0} รายการ · ${new Date(recovery.createdAt).toLocaleString('th-TH')}`;
}
function updateViewportInsets() {
  const viewport = window.visualViewport;
  const keyboard = viewport && viewport.scale === 1 ? Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop) : 0;
  document.documentElement.style.setProperty('--keyboard-inset',keyboard + 'px');
  const dock = $('saveDock');
  if (dock?.offsetHeight) document.documentElement.style.setProperty('--save-height',dock.offsetHeight + 'px');
}

document.addEventListener('input',event => {
  if ($('transactionForm').contains(event.target)) { clearFieldError(event.target.id); stashDraft(); }
});
document.addEventListener('change',event => {
  if ($('transactionForm').contains(event.target)) { clearFieldError(event.target.id); updateFormSummary(); stashDraft(); }
});
document.addEventListener('click',event => {
  if (event.target.closest('[data-payer],[data-owner],[data-incowner],[data-savowner],[data-split],#recSwitch,#installmentSwitch,#expTab,#incTab,#savTab')) stashDraft();
});
window.addEventListener('error',event => { if (event.error?.name === 'LocalSaveError') { event.preventDefault(); toastMsg(event.error.message); } });
window.addEventListener('pagehide',stashDraft);
window.addEventListener('beforeunload',event => {
  stashDraft();
  if ($('storageError') && !$('storageError').hidden && currentView() === 'add' && draftSignature() !== formBaseline) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('popstate',event => {
  stashDraft();
  if (visibleModal()) closeTopModal();
  route = event.state?.app === 'pt-money' ? event.state : {app:'pt-money',view:'home',scroll:0};
  restoringRoute = true;
  if (route.view === 'add') {
    if (route.recurringEditId && state.recurring.some(rec => rec.id === route.recurringEditId)) editRecurring(route.recurringEditId);
    else if (route.editId && state.transactions.some(t => t.id === route.editId)) editTx(route.editId);
    else openEntry(route.entryKind || 'expense');
  } else show(route.view || 'home',{fromPop:true});
  restoringRoute = false;
  if (route.detail && route.view === 'settings') requestAnimationFrame(() => focusSetting(route.detail));
});
window.visualViewport?.addEventListener('resize',updateViewportInsets);
window.visualViewport?.addEventListener('scroll',updateViewportInsets);
window.addEventListener('resize',updateViewportInsets);
new ResizeObserver(updateViewportInsets).observe($('saveDock'));

function openProject(projectId) { show('projects',{detail:'project',from:currentView()}); toggleProject(projectId,true); requestAnimationFrame(() => document.getElementById('project_'+projectId)?.scrollIntoView({block:'start',behavior:'instant'})); }
applyTheme(); resetForm(); renderAll();
if (storageReadBlocked) storageFailure('อ่านข้อมูลเดิมไม่ได้ จึงยังไม่บันทึกทับ กรุณาดาวน์โหลดสำเนาหรือเปิดเบราว์เซอร์นี้ใหม่');
else { try { checkRecurring(); } catch (_) {} }
const initialView = location.hash.slice(1);
const initialRoute = history.state?.app === 'pt-money' && history.state.view === initialView ? history.state : null;
if (initialRoute) {
  route = initialRoute;
  restoringRoute = true;
  if (initialView === 'add') {
    if (route.recurringEditId && state.recurring.some(rec => rec.id === route.recurringEditId)) editRecurring(route.recurringEditId);
    else if (route.editId && state.transactions.some(tx => tx.id === route.editId)) editTx(route.editId);
    else openEntry(route.entryKind || 'expense');
  } else show(initialView,{fromPop:true});
  restoringRoute = false;
} else if (['history','summary','projects','settings'].includes(initialView)) show(initialView,{replace:true});
else if (initialView === 'add') openAdd();
else history.replaceState(route,'','#home');
syncAddControls(); updateViewportInsets(); initFloatingAdd();

function dailyAllowance(t=totals(),now=new Date()) {
 const [year,month]=selectedMonth.split('-').map(Number);
 const current=selectedMonth===monthKey(now),past=selectedMonth<monthKey(now);
 const days=new Date(year,month,0).getDate()-(current?now.getDate()-1:0);
 const budget=Number(state.settings.overallBudget)||0;
 const remaining=budget>0?budget-t.expense:t.available;
 return {current,past,days,remaining,amount:Math.floor(Math.max(0,remaining)/days*100)/100,source:budget>0?'งบคงเหลือ':'เงินคงเหลือหลังหักรายจ่ายและเงินเก็บ'};
}

function initFloatingAdd() {
 const button=$('fab'); let drag=null,suppressClick=false;
 function place(x,y) {
   const bottom=document.querySelector('.bottom');
   const limit=bottom&&getComputedStyle(bottom).display!=='none'?bottom.getBoundingClientRect().top:window.innerHeight;
   x=Math.min(Math.max(8,x),Math.max(8,window.innerWidth-button.offsetWidth-8));
   y=Math.min(Math.max(8,y),Math.max(8,limit-button.offsetHeight-8));
   button.style.left=x+'px';button.style.top=y+'px';button.style.right='auto';button.style.bottom='auto';
   return {x,y};
 }
 function remember(position) {state.settings.fabPos=position;try{save()}catch(error){toastMsg(error.message)}}
 function restore() {if(button.offsetWidth&&state.settings.fabPos)place(state.settings.fabPos.x,state.settings.fabPos.y)}
 button.addEventListener('pointerdown',event=>{
   if(!event.isPrimary||event.button!==0)return;
   const rect=button.getBoundingClientRect();suppressClick=false;
   drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,moved:false};
   button.setPointerCapture(event.pointerId);
 });
 button.addEventListener('pointermove',event=>{
   if(!drag||drag.id!==event.pointerId)return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(!drag.moved&&Math.hypot(dx,dy)<8)return;
   drag.moved=true;button.classList.add('dragging');place(drag.left+dx,drag.top+dy);
 });
 function finish(event) {
   if(!drag||drag.id!==event.pointerId)return;
   suppressClick=drag.moved;
   if(drag.moved){const rect=button.getBoundingClientRect();remember({x:rect.left,y:rect.top})}
   drag=null;button.classList.remove('dragging');
   if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);
 }
 button.addEventListener('pointerup',finish);button.addEventListener('pointercancel',finish);
 button.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){suppressClick=false;return}openAddSheet()});
 button.addEventListener('keydown',event=>{
   const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
   if(!directions[event.key])return;
   event.preventDefault();const rect=button.getBoundingClientRect(),[dx,dy]=directions[event.key],step=event.shiftKey?40:10;
   remember(place(rect.left+dx*step,rect.top+dy*step));
 });
 window.addEventListener('resize',restore);
 new MutationObserver(()=>requestAnimationFrame(restore)).observe(document.body,{attributes:true,attributeFilter:['data-view']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderHome()});
 restore();
}

// Personal ledger v6 -------------------------------------------------------
// Stable participant IDs remain Pao/Tim; names and the primary perspective
// are settings so old backups and recurring records keep their identity.
var ledgerMode = 'mine';

function userName(user) {
  const fallback = user === 'Tim' ? 'ติม' : 'เปา';
  return state?.settings?.users?.[user]?.name || fallback;
}

function primaryUser() {
  return state?.settings?.primaryUser === 'Tim' ? 'Tim' : 'Pao';
}

function partnerUser() {
  return FinanceCore.otherUser(primaryUser());
}

function who(value) {
  if (value === 'Pao' || value === 'Tim') return userName(value);
  return `${userName('Pao')} & ${userName('Tim')}`;
}

function cleanTx(value = {}) {
  return FinanceCore.normalizeTransaction(cleanObject(value));
}

function cleanPocket(value = {}) {
  const pocket = cleanObject(value);
  const legacyOwner = !['Pao','Tim'].includes(pocket.owner);
  return {
    ...pocket,
    owner:legacyOwner ? 'Pao' : pocket.owner,
    goal:Math.max(0,num(pocket.goal)),
    openingBalance:Math.max(0,num(pocket.openingBalance)),
    needsReview:pocket.needsReview === true || legacyOwner
  };
}

function cleanProject(value = {}) {
  const project = cleanObject(value);
  const total = Math.max(0,num(project.budgetTotal ?? project.budget));
  const rawShares = project.budgetShares;
  const shares = rawShares && Number.isFinite(Number(rawShares.Pao)) && Number.isFinite(Number(rawShares.Tim))
    ? {Pao:Math.max(0,num(rawShares.Pao)),Tim:Math.max(0,num(rawShares.Tim))}
    : null;
  return {...project,budget:total,budgetTotal:total,budgetShares:shares};
}

function cleanRecurring(value = {}) {
  const rec = {...cleanObject(value)};
  const next = new Date(rec.nextRun);
  const fallbackDay = Number.isFinite(next.getTime()) ? next.getDate() : new Date().getDate();
  rec.enabled = rec.enabled !== false;
  rec.frequency = ['daily','weekly','monthly'].includes(rec.frequency) ? rec.frequency : 'monthly';
  rec.nextRun = Number.isFinite(next.getTime()) ? next.toISOString() : new Date().toISOString();
  rec.dayOfMonth = Math.min(31,Math.max(1,Math.round(num(rec.dayOfMonth,fallbackDay))));
  rec.template = cleanTx(rec.template || {});
  if (['monthly-expense','monthly-income'].includes(rec.kind)) {
    rec.frequency = 'monthly';
    rec.kind = rec.template.type === 'income' ? 'monthly-income' : 'monthly-expense';
  }
  if (rec.kind === 'installment') {
    rec.frequency = 'monthly';
    rec.totalInstallments = Math.min(600,Math.max(1,Math.round(num(rec.totalInstallments,1))));
    rec.completedInstallments = Math.min(rec.totalInstallments,Math.max(0,Math.round(num(rec.completedInstallments))));
    rec.installmentTotalAmount = Math.abs(num(rec.installmentTotalAmount,rec.template.amount * rec.totalInstallments));
    rec.installmentTotalShares = FinanceCore.validPair(rec.installmentTotalShares,rec.installmentTotalAmount)
      ? FinanceCore.pair(rec.installmentTotalShares)
      : FinanceCore.validPair(rec.installmentTotalSplit,rec.installmentTotalAmount)
        ? FinanceCore.pair(rec.installmentTotalSplit)
        : {
            Pao:FinanceCore.fromCents(FinanceCore.toCents(FinanceCore.expenseShares(rec.template).Pao) * rec.totalInstallments),
            Tim:FinanceCore.fromCents(FinanceCore.toCents(FinanceCore.expenseShares(rec.template).Tim) * rec.totalInstallments)
          };
    rec.installmentTotalPaid = FinanceCore.validPair(rec.installmentTotalPaid,rec.installmentTotalAmount)
      ? FinanceCore.pair(rec.installmentTotalPaid)
      : {
          Pao:FinanceCore.fromCents(FinanceCore.toCents(FinanceCore.expensePaid(rec.template).Pao) * rec.totalInstallments),
          Tim:FinanceCore.fromCents(FinanceCore.toCents(FinanceCore.expensePaid(rec.template).Tim) * rec.totalInstallments)
        };
    rec.installmentTotalSplit = {...rec.installmentTotalShares};
    if (rec.completedInstallments === rec.totalInstallments) rec.enabled = false;
  }
  return rec;
}

function normalizeState(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const value = clone(DEF);
  const settings = cleanObject(source.settings);
  value.schemaVersion = 6;
  value.settings = {...value.settings,...settings};
  value.settings.theme = settings.theme === 'dark' ? 'dark' : 'light';
  value.settings.fabPos = cleanFabPos(settings.fabPos);
  value.settings.hideIncomeHome = settings.hideIncomeHome !== false;
  value.settings.primaryUser = settings.primaryUser === 'Tim' ? 'Tim' : 'Pao';
  value.settings.users = {
    Pao:{name:String(settings.users?.Pao?.name || 'เปา').trim().slice(0,40) || 'เปา'},
    Tim:{name:String(settings.users?.Tim?.name || 'ติม').trim().slice(0,40) || 'ติม'}
  };
  const legacyPaoBook = {overall:Math.max(0,num(settings.overallBudget)),categories:cleanBudgetMap(source.budgets)};
  const books = cleanObject(settings.budgetsByUser);
  value.settings.budgetsByUser = {
    Pao:{overall:Math.max(0,num(books.Pao?.overall,legacyPaoBook.overall)),categories:cleanBudgetMap(books.Pao?.categories || legacyPaoBook.categories)},
    Tim:{overall:Math.max(0,num(books.Tim?.overall)),categories:cleanBudgetMap(books.Tim?.categories)}
  };
  value.categories = {
    expense:cleanList(source.categories?.expense,DEF.categories.expense),
    income:cleanList(source.categories?.income,DEF.categories.income)
  };
  value.payments = cleanList(source.payments,DEF.payments).map(item => String(item).trim()).filter(Boolean);
  if (!value.payments.length) value.payments = clone(DEF.payments);
  if (!value.payments.includes(value.settings.defaultPayment)) value.settings.defaultPayment = value.payments[0];
  value.pockets = cleanList(source.pockets,[]).map(cleanPocket);
  value.projects = cleanList(source.projects,[]).map(cleanProject);
  value.transactions = cleanList(source.transactions,[]).map(cleanTx);
  value.recurring = cleanList(source.recurring,[]).map(cleanRecurring);
  const activeBook = value.settings.budgetsByUser[value.settings.primaryUser];
  value.settings.overallBudget = activeBook.overall;
  value.budgets = clone(activeBook.categories);
  return value;
}

function validateBackup(input) {
  const invalid = () => { throw new Error('invalid-backup'); };
  if (!input || typeof input !== 'object' || !Array.isArray(input.transactions) || !input.settings || !input.categories) invalid();
  for (const field of ['pockets','projects','recurring','payments']) if (input[field] != null && !Array.isArray(input[field])) invalid();
  const candidate = normalizeState(input);
  if (!candidate.payments.length || candidate.payments.some(item => typeof item !== 'string' || !item.trim())) invalid();
  const ids = new Set();
  for (const list of [candidate.transactions,candidate.pockets,candidate.projects,candidate.recurring]) {
    for (const item of list) {
      if (!item || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(item.id) || ids.has(`${list === candidate.transactions ? 't' : list === candidate.pockets ? 'p' : list === candidate.projects ? 'j' : 'r'}:${item.id}`)) invalid();
      ids.add(`${list === candidate.transactions ? 't' : list === candidate.pockets ? 'p' : list === candidate.projects ? 'j' : 'r'}:${item.id}`);
    }
  }
  for (const tx of candidate.transactions) {
    if (!['expense','income','saving','settlement'].includes(tx.type) || !Number.isFinite(Number(tx.amount)) || Number(tx.amount) <= 0 || !Number.isFinite(new Date(tx.datetime).getTime())) invalid();
    if (tx.type === 'expense' && (!FinanceCore.validPair(tx.shares,tx.amount) || !FinanceCore.validPair(tx.paid,tx.amount))) invalid();
    if (tx.type === 'income' && !FinanceCore.validPair(tx.shares,tx.amount)) invalid();
    if (tx.type === 'saving' && (!['in','out'].includes(tx.direction) || !tx.allocations.length || Math.abs(FinanceCore.toCents(tx.allocations.reduce((sum,item) => sum + item.amount,0))-FinanceCore.toCents(tx.amount)) > 0)) invalid();
    if (tx.type === 'settlement' && (!['Pao','Tim'].includes(tx.from) || !['Pao','Tim'].includes(tx.to) || tx.from === tx.to)) invalid();
  }
  return candidate;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return normalizeState();
    const parsed = JSON.parse(raw);
    if (Number(parsed.schemaVersion || 5) < 6 && !localStorage.getItem(KEY + '_before_v6')) {
      try { localStorage.setItem(KEY + '_before_v6',JSON.stringify({createdAt:new Date().toISOString(),raw,state:parsed})); } catch (_) {}
    }
    return validateBackup(parsed);
  } catch (_) {
    storageReadBlocked = true;
    return normalizeState();
  }
}

function save() {
  if (storageReadBlocked) throw storageFailure('อ่านข้อมูลเดิมไม่ได้ กรุณาสำรองข้อมูลหรือเปิดเบราว์เซอร์นี้ใหม่ก่อนบันทึก');
  try {
    state.schemaVersion = 6;
    const book = budgetBook();
    state.settings.overallBudget = book.overall;
    state.budgets = clone(book.categories);
    localStorage.setItem(KEY,JSON.stringify(state));
    lastSavedState = clone(state);
    $('storageError').hidden = true;
  } catch (error) {
    state = clone(lastSavedState);
    throw storageFailure('พื้นที่จัดเก็บอาจเต็มหรือถูกปิดกั้น ข้อมูลเดิมยังอยู่ กรุณาแก้ไขแล้วบันทึกอีกครั้ง');
  }
}

function budgetBook(user = primaryUser()) {
  state.settings.budgetsByUser ||= {};
  state.settings.budgetsByUser[user] ||= {overall:0,categories:{}};
  const book = state.settings.budgetsByUser[user];
  book.overall = Math.max(0,num(book.overall));
  book.categories = cleanBudgetMap(book.categories);
  return book;
}

function currentMonthTx() {
  return state.transactions.filter(tx => monthKey(tx.datetime) === selectedMonth);
}

function expenseShare(tx, user = primaryUser()) {
  return tx?.type === 'expense' ? FinanceCore.economicShare(tx,user) : 0;
}

function paoExpenseTotal(list = currentMonthTx()) {
  return FinanceCore.fromCents(list.reduce((sum,tx) => sum + FinanceCore.toCents(expenseShare(tx,primaryUser())),0));
}

function totals(list = currentMonthTx(), user = primaryUser()) {
  return FinanceCore.totals(list,user);
}

function pocketBalance(pocketId) {
  const pocket = pocketById(pocketId);
  let cents = FinanceCore.toCents(pocket?.openingBalance || 0);
  for (const tx of state.transactions.filter(item => item.type === 'saving')) {
    const sign = tx.direction === 'out' ? -1 : 1;
    for (const allocation of FinanceCore.savingAllocations(tx)) if (allocation.pocketId === pocketId) cents += sign * FinanceCore.toCents(allocation.amount);
  }
  return FinanceCore.fromCents(cents);
}

function projectSpend(projectId, monthOnly = false, user = null) {
  const list = (monthOnly ? currentMonthTx() : state.transactions).filter(tx => tx.type === 'expense' && tx.projectId === projectId);
  const cents = list.reduce((sum,tx) => sum + FinanceCore.toCents(user ? FinanceCore.economicShare(tx,user) : tx.amount),0);
  return FinanceCore.fromCents(cents);
}

function projectSaving(projectId, user = null) {
  const list = state.transactions.filter(tx => tx.type === 'saving' && tx.projectId === projectId);
  return FinanceCore.fromCents(list.reduce((sum,tx) => sum + FinanceCore.toCents(user ? FinanceCore.economicShare(tx,user) : (tx.direction === 'out' ? -tx.amount : tx.amount)),0));
}

function debtFor(list = state.transactions) {
  return FinanceCore.debtFor(list);
}

function dailyAllowance(value = totals(), now = new Date()) {
  const [year,month] = selectedMonth.split('-').map(Number);
  const current = selectedMonth === monthKey(now), past = selectedMonth < monthKey(now);
  const days = new Date(year,month,0).getDate() - (current ? now.getDate()-1 : 0);
  const availableRemaining = value.available;
  const remaining = Math.max(0,availableRemaining);
  return {current,past,days,availableRemaining,remaining,over:availableRemaining < 0,amount:past ? 0 : FinanceCore.fromCents(Math.floor(remaining*100/days)),source:'เงินคงเหลือหลังหักรายจ่ายและเงินเก็บ'};
}

function renderSelects() {
  const existing = state.transactions.find(tx => tx.id === form.editId) || state.recurring.find(rec => rec.id === form.recurringEditId)?.template;
  const projectOptions = selected => '<option value="">ไม่ระบุโปรเจกต์</option>' + state.projects.filter(project => project.status !== 'Archived' || project.id === selected || project.id === existing?.projectId).map(project => `<option value="${esc(project.id)}">${esc(project.icon || '▣')} ${esc(project.name)}${project.status === 'Archived' ? ' (เก็บเข้าคลัง)' : ''}</option>`).join('');
  for (const key of ['project','savingProject']) {
    const element = $(key), current = element.value;
    element.innerHTML = projectOptions(current);
    element.value = [...element.options].some(option => option.value === current) ? current : '';
  }
  const pocketOption = pocket => `<option value="${esc(pocket.id)}">${esc(pocket.icon || '💰')} ${esc(pocket.name)} · ${esc(who(pocket.owner))}${pocket.needsReview ? ' · ควรตรวจสอบ' : ''}</option>`;
  const currentPocket = $('pocket').value || existing?.pocketId || '';
  $('pocket').innerHTML = state.pockets.length ? '<option value="">เลือกกระเป๋า</option>' + state.pockets.map(pocketOption).join('') : '<option value="">ยังไม่มีกระเป๋า</option>';
  if ([...$('pocket').options].some(option => option.value === currentPocket)) $('pocket').value = currentPocket;
  for (const user of ['Pao','Tim']) {
    const element = $('pocket' + user), current = element.value;
    const pockets = state.pockets.filter(pocket => pocket.owner === user);
    element.innerHTML = `<option value="">กระเป๋าของ${esc(who(user))}</option>` + pockets.map(pocketOption).join('');
    if ([...element.options].some(option => option.value === current)) element.value = current;
  }
  const filter = $('projectFilter'), selected = filter.value || 'all';
  filter.innerHTML = '<option value="all">ทุกโปรเจกต์</option><option value="none">ไม่มีโปรเจกต์</option>' + state.projects.map(project => `<option value="${esc(project.id)}">${esc(project.name)}</option>`).join('');
  filter.value = [...filter.options].some(option => option.value === selected) ? selected : 'all';
}

function getPaid(amount) {
  if (form.payer === 'Pao') return {Pao:amount,Tim:0};
  if (form.payer === 'Tim') return {Pao:0,Tim:amount};
  return {Pao:parseMoney($('paidPao').value),Tim:parseMoney($('paidTim').value)};
}

function getSplit(amount) {
  if (form.owner === 'Pao') return {Pao:amount,Tim:0};
  if (form.owner === 'Tim') return {Pao:0,Tim:amount};
  const paid = getPaid(amount);
  if (form.split === 'custom') return {Pao:parseMoney($('ps').value),Tim:parseMoney($('ts').value)};
  if (form.split === 'percent') return FinanceCore.percentSplit(amount,parseMoney($('paoPercent').value),paid);
  return FinanceCore.halfSplit(amount,paid);
}

function getIncomeShares(amount) {
  if (form.incOwner === 'Pao') return {Pao:amount,Tim:0};
  if (form.incOwner === 'Tim') return {Pao:0,Tim:amount};
  const custom = {Pao:parseMoney($('incomePao').value),Tim:parseMoney($('incomeTim').value)};
  return FinanceCore.validPair(custom,amount) ? custom : FinanceCore.halfSplit(amount);
}

function getSavingAllocations(amount) {
  if (form.savOwner !== 'Both') return [{user:form.savOwner,amount,pocketId:$('pocket').value || null}];
  return [
    {user:'Pao',amount:parseMoney($('savingPao').value),pocketId:$('pocketPao').value || null},
    {user:'Tim',amount:parseMoney($('savingTim').value),pocketId:$('pocketTim').value || null}
  ];
}

function syncComplement(sourceId, otherId) {
  const amount = parseMoney($('amount').value), share = parseMoney($(sourceId).value);
  if (!Number.isFinite(amount) || !Number.isFinite(share) || share < 0 || share > amount) { $(otherId).value = ''; return; }
  $(otherId).value = FinanceCore.fromCents(FinanceCore.toCents(amount)-FinanceCore.toCents(share)).toFixed(2);
}

function syncCustomSplit(source) {
  if (form.type !== 'expense' || form.owner !== 'Both' || form.split !== 'custom') return;
  if (source === 'ps' || source === 'ts') form.splitAnchor = source;
  const anchor = form.splitAnchor || ($('ps').value.trim() ? 'ps' : $('ts').value.trim() ? 'ts' : null);
  if (anchor) syncComplement(anchor,anchor === 'ps' ? 'ts' : 'ps');
}

function syncPaidSplit(source) {
  if (form.payer !== 'Both') return;
  form.paidAnchor = source;
  syncComplement(source,source === 'paidPao' ? 'paidTim' : 'paidPao');
}

function syncIncomeSplit(source) {
  if (form.incOwner !== 'Both') return;
  form.incomeAnchor = source;
  syncComplement(source,source === 'incomePao' ? 'incomeTim' : 'incomePao');
}

function syncSavingSplit(source) {
  if (form.savOwner !== 'Both') return;
  form.savingAnchor = source;
  syncComplement(source,source === 'savingPao' ? 'savingTim' : 'savingPao');
}

function syncPercentSplit(source) {
  const value = parseMoney($(source).value);
  const other = source === 'paoPercent' ? 'timPercent' : 'paoPercent';
  if (!Number.isFinite(value) || value < 0 || value > 100) { $(other).value = ''; return; }
  $(other).value = FinanceCore.fromCents(10000-FinanceCore.toCents(value)).toFixed(2).replace(/\.00$/,'');
}

function updateSplit() {
  const expense = form.type === 'expense';
  const sharedExpense = expense && form.owner === 'Both';
  const sharedPayment = expense && form.payer === 'Both';
  $('splitBox').classList.toggle('show',sharedExpense);
  $('splitBox').hidden = !sharedExpense;
  $('paidSplitBox').classList.toggle('show',sharedPayment);
  $('paidSplitBox').hidden = !sharedPayment;
  $('customSplit').style.display = sharedExpense && form.split === 'custom' ? 'grid' : 'none';
  $('percentSplit').style.display = sharedExpense && form.split === 'percent' ? 'grid' : 'none';
  $('customSplitHelp').hidden = !(sharedExpense && form.split === 'custom');
  const sharedIncome = form.type === 'income' && form.incOwner === 'Both';
  $('incomeSplitBox').hidden = !sharedIncome;
  $('incomeSplitBox').style.display = sharedIncome ? 'block' : 'none';
  const sharedSaving = form.type === 'saving' && form.savOwner === 'Both';
  $('savingSplitBox').hidden = !sharedSaving;
  $('savingSplitBox').style.display = sharedSaving ? 'block' : 'none';
  const pocketField = $('pocket').closest('.field');
  if (pocketField) pocketField.style.display = form.type === 'saving' && !sharedSaving ? 'grid' : 'none';
  if (sharedPayment && !$('paidPao').value && !$('paidTim').value) {
    const split = FinanceCore.halfSplit(parseMoney($('amount').value) || 0);
    $('paidPao').value = split.Pao ? split.Pao.toFixed(2) : '';
    $('paidTim').value = split.Tim ? split.Tim.toFixed(2) : '';
  }
  if (sharedIncome && !$('incomePao').value && !$('incomeTim').value) {
    const split = FinanceCore.halfSplit(parseMoney($('amount').value) || 0);
    $('incomePao').value = split.Pao ? split.Pao.toFixed(2) : '';
    $('incomeTim').value = split.Tim ? split.Tim.toFixed(2) : '';
  }
  if (sharedSaving && !$('savingPao').value && !$('savingTim').value) {
    const split = FinanceCore.halfSplit(parseMoney($('amount').value) || 0);
    $('savingPao').value = split.Pao ? split.Pao.toFixed(2) : '';
    $('savingTim').value = split.Tim ? split.Tim.toFixed(2) : '';
  }
  renderUserLabels();
}

function updateFormSummary() {
  const amount = parseMoney($('amount').value) || 0;
  let summary = '', hint = '';
  if (form.type === 'income') {
    const shares = getIncomeShares(amount);
    hint = form.incOwner === 'Both' ? `${who('Pao')} ${money(shares.Pao)} · ${who('Tim')} ${money(shares.Tim)}` : `รายรับ ${money(amount)} ของ${who(form.incOwner)}`;
    summary = `<b>${esc(hint)}</b>`;
  } else if (form.type === 'saving') {
    const allocations = getSavingAllocations(amount), withdrawal = form.savingDirection === 'out';
    hint = `${withdrawal ? 'ถอน' : 'ออม'} ${money(amount)}${allocations.length > 1 ? ` · ${who('Pao')} ${money(allocations[0].amount)} · ${who('Tim')} ${money(allocations[1].amount)}` : ''}`;
    summary = `<b>${esc(hint)}</b><br><small>${withdrawal ? 'คืนเงินไปเหลือใช้ ไม่นับเป็นรายรับ' : 'ลดเงินเหลือใช้ แต่ไม่นับเป็นรายจ่าย'} · ไม่กระทบยอดค้างกัน</small>`;
  } else {
    const shares = getSplit(amount), paid = getPaid(amount);
    const preview = FinanceCore.normalizeTransaction({type:'expense',amount,shares,paid});
    const delta = FinanceCore.debtDeltaPao(preview);
    const debtor = delta > 0 ? who('Tim') : who('Pao'), creditor = delta > 0 ? who('Pao') : who('Tim');
    hint = delta ? `${debtor}ค้าง${creditor} ${money(Math.abs(delta))}` : 'รายการนี้ไม่เพิ่มยอดค้าง';
    summary = `${who('Pao')}รับผิดชอบ ${money(shares.Pao)} · จ่ายจริง ${money(paid.Pao)}<br>${who('Tim')}รับผิดชอบ ${money(shares.Tim)} · จ่ายจริง ${money(paid.Tim)}<br><b>${esc(hint)}</b>`;
  }
  $('formSummary').innerHTML = summary;
  $('saveHint').textContent = hint;
  $('saveTxButton').textContent = `${form.recurringEditId ? 'บันทึกการแก้ไขรายการประจำ' : form.editId ? 'บันทึกการแก้ไข' : 'บันทึก' + typeLabel(form.type)}${amount > 0 ? ' ' + money(amount) : ''}`;
  if (form.installment && !form.editId) {
    const quote = installmentQuote(), start = scheduleDate('installment');
    $('installmentPreview').textContent = quote ? `เดือนละ ${money(quote.amount)} · ${quote.count} เดือน · รวม ${money(quote.total)}${quote.finalAmount !== quote.amount ? ` · เดือนสุดท้าย ${money(quote.finalAmount)}` : ''}${start ? ` · เริ่ม ${formatMonth(monthKey(start))}` : ''}` : 'ใส่ยอดเงินและจำนวนเดือนเพื่อดูยอดผ่อน';
    $('saveTxButton').textContent = 'บันทึกแผนผ่อน' + (quote ? ` ${quote.count} เดือน` : '');
  } else if (form.monthly && !form.editId) {
    const start = scheduleDate('monthly');
    const action = form.type === 'income' ? 'รับ' : 'จ่าย';
    $('monthlyPreview').textContent = start ? `${action}เดือนละ ${money(amount)} · ทุกวันที่ ${$('monthlyDay').value} · เริ่ม ${formatMonth(monthKey(start))}` : 'เลือกเดือนเริ่มต้น';
    $('saveTxButton').textContent = form.recurringEditId ? 'บันทึกการแก้ไขรายการประจำ' : form.type === 'income' ? 'บันทึกรายรับประจำเดือน' : 'บันทึกรายจ่ายประจำเดือน';
  }
  const pocket = pocketById($('pocket').value);
  $('pocketBalanceHint').textContent = pocket ? `ยอดคงเหลือ ${money(pocketBalance(pocket.id))} · เจ้าของ ${who(pocket.owner)}` : '';
  renderUserLabels();
}

function resetForm() {
  restoringDraft = true;
  const primary = primaryUser();
  form = {type:'expense',payer:primary,owner:primary,incOwner:primary,savOwner:primary,split:'half',splitAnchor:null,paidAnchor:null,incomeAnchor:null,savingAnchor:null,recurring:false,installment:false,monthly:false,editId:null,recurringEditId:null,catExpanded:false,savingDirection:'in'};
  for (const key of ['amount','note','ps','ts','paidPao','paidTim','incomePao','incomeTim','savingPao','savingTim','nextRun','cat','categorySearch','installmentCount','planName']) if ($(key)) $(key).value = '';
  $('paoPercent').value = $('timPercent').value = '50';
  document.querySelectorAll('[data-month-day]').forEach(element => { if (!element.options.length) element.innerHTML = Array.from({length:31},(_,index) => `<option value="${index+1}">${index+1}</option>`).join(''); element.value = '1'; });
  $('installmentStart').value = $('monthlyStart').value = monthKey(new Date());
  $('installmentBasis').value = 'total';
  $('dt').value = ldt(); $('freq').value = 'monthly';
  $('project').value = ''; $('savingProject').value = ''; $('pocket').value = ''; $('pocketPao').value = ''; $('pocketTim').value = '';
  $('optionalDetails').open = false;
  renderPays(); renderSelects(); setType('expense'); toggleRecurring(false); syncChoices(); clearFieldErrors();
  formBaseline = draftSignature();
  $('draftStatus').textContent = '';
  restoringDraft = false;
}

function sliceInstallmentPair(totalPair,totalAmount,beforeCents,afterCents) {
  const total = BigInt(FinanceCore.toCents(totalAmount)), paoTotal = BigInt(FinanceCore.toCents(totalPair.Pao));
  if (total <= 0n) return {Pao:0,Tim:0};
  const cumulative = cents => Number((BigInt(cents) * paoTotal + total / 2n) / total);
  const pao = cumulative(afterCents)-cumulative(beforeCents), amount = afterCents-beforeCents;
  return {Pao:FinanceCore.fromCents(pao),Tim:FinanceCore.fromCents(amount-pao)};
}

function installmentPayment(rec, number) {
  const total = FinanceCore.toCents(rec.installmentTotalAmount), regular = Math.floor(total/rec.totalInstallments);
  const before = regular*(number-1), after = number === rec.totalInstallments ? total : regular*number;
  const amount = FinanceCore.fromCents(after-before);
  const shares = sliceInstallmentPair(rec.installmentTotalShares || rec.installmentTotalSplit,rec.installmentTotalAmount,before,after);
  const paid = sliceInstallmentPair(rec.installmentTotalPaid || {Pao:rec.template.payer === 'Pao' ? rec.installmentTotalAmount : 0,Tim:rec.template.payer === 'Tim' ? rec.installmentTotalAmount : 0},rec.installmentTotalAmount,before,after);
  return {amount,shares,paid,split:{...shares},owner:FinanceCore.ownerFromShares(shares),payer:FinanceCore.payerFromPaid(paid)};
}

function installmentRemaining(rec) {
  const total = FinanceCore.toCents(rec.installmentTotalAmount || rec.template.amount*rec.totalInstallments);
  if (rec.completedInstallments >= rec.totalInstallments) return 0;
  return FinanceCore.fromCents(total-Math.floor(total/rec.totalInstallments)*rec.completedInstallments);
}

function saveTx() {
  if (savingTx) return;
  clearFieldErrors();
  const amount = parseMoney($('amount').value);
  if (!Number.isFinite(amount) || amount <= 0) return fieldError('amount','ใส่จำนวนเงินมากกว่า 0 และทศนิยมไม่เกิน 2 ตำแหน่ง');
  const existingRecurring = state.recurring.find(rec => rec.id === form.recurringEditId);
  if (form.recurringEditId && !existingRecurring) return fieldError('formError','ไม่พบรายการประจำเดิม รายการอาจถูกลบไปแล้ว');
  const scheduleKind = !form.editId ? form.type === 'expense' && form.installment ? 'installment' : ['expense','income'].includes(form.type) && form.monthly ? 'monthly' : null : null;
  const date = scheduleKind ? scheduleDate(scheduleKind) : new Date($('dt').value);
  if (!date || !Number.isFinite(date.getTime())) return fieldError(scheduleKind ? scheduleKind+'Start' : 'dt','เลือกเดือนหรือวันที่ให้ครบ');
  if (scheduleKind && !$('planName').value.trim()) return fieldError('planName',form.type === 'income' ? 'ตั้งชื่อรายรับ เช่น เงินเดือน หรือค่าเช่า' : 'ตั้งชื่อรายการ เช่น ผ่อนโทรศัพท์ หรือค่าเช่าห้อง');
  if (form.type !== 'saving' && !$('cat').value) return fieldError('catChoices','เลือกหมวดหมู่ก่อนบันทึก');
  const existing = state.transactions.find(tx => tx.id === form.editId);
  if (form.editId && !existing) return fieldError('formError','ไม่พบรายการเดิม รายการอาจถูกลบไปแล้ว');
  let tx = {...existing,id:existing?.id || id(),type:form.type,amount,datetime:existing && ldt(new Date(existing.datetime)) === $('dt').value ? existing.datetime : date.toISOString(),payment:$('pay').value,note:$('note').value.trim(),recurringId:existing?.recurringId || null,recurringGenerated:existing?.recurringGenerated || false};
  if (scheduleKind) tx.note = [$('planName').value.trim(),tx.note].filter(Boolean).join(' · ');
  delete tx.shares; delete tx.paid; delete tx.split; delete tx.payer; delete tx.owner; delete tx.allocations; delete tx.direction; delete tx.category; delete tx.pocketId; delete tx.projectId;
  if (form.type === 'expense') {
    const shares = getSplit(amount), paid = getPaid(amount);
    if (!FinanceCore.validPair(shares,amount)) return fieldError(form.split === 'percent' ? 'paoPercent' : 'ps',`ส่วนรับผิดชอบต้องรวมเป็น ${money(amount)}`);
    if (!FinanceCore.validPair(paid,amount)) return fieldError('paidPao',`ยอดที่จ่ายจริงต้องรวมเป็น ${money(amount)}`);
    Object.assign(tx,{category:$('cat').value,projectId:$('project').value || null,shares,paid,split:{...shares},owner:FinanceCore.ownerFromShares(shares),payer:FinanceCore.payerFromPaid(paid)});
  } else if (form.type === 'income') {
    const shares = getIncomeShares(amount);
    if (!FinanceCore.validPair(shares,amount)) return fieldError('incomePao',`ส่วนรายรับต้องรวมเป็น ${money(amount)}`);
    Object.assign(tx,{category:$('cat').value,shares,owner:FinanceCore.ownerFromShares(shares)});
  } else {
    const allocations = getSavingAllocations(amount);
    if (allocations.some(item => !Number.isFinite(item.amount) || item.amount < 0) || FinanceCore.toCents(allocations.reduce((sum,item) => sum+item.amount,0)) !== FinanceCore.toCents(amount)) return fieldError(form.savOwner === 'Both' ? 'savingPao' : 'amount',`ส่วนเงินเก็บต้องรวมเป็น ${money(amount)}`);
    if (allocations.some(item => !item.pocketId)) return fieldError(form.savOwner === 'Both' ? (allocations[0].pocketId ? 'pocketTim' : 'pocketPao') : 'pocket','เลือกกระเป๋าเงินเก็บให้ครบ');
    if (form.savingDirection === 'out') for (const allocation of allocations) {
      const available = pocketBalance(allocation.pocketId) - (existing?.type === 'saving' && existing.direction === 'in' ? existing.allocations.filter(item => item.pocketId === allocation.pocketId).reduce((sum,item) => sum+item.amount,0) : 0);
      if (allocation.amount > available + .001) return fieldError('amount',`ถอนได้ไม่เกินยอดคงเหลือ ${money(available)}`);
    }
    Object.assign(tx,{direction:form.savingDirection,allocations,owner:form.savOwner,pocketId:allocations[0].pocketId,projectId:$('savingProject').value || null});
  }
  tx = FinanceCore.normalizeTransaction(tx);
  if (existing && FinanceCore.toCents(FinanceCore.debtDeltaPao(existing)) !== FinanceCore.toCents(FinanceCore.debtDeltaPao(tx))) {
    const before = debtFor(), after = FinanceCore.fromCents(FinanceCore.toCents(before)-FinanceCore.toCents(FinanceCore.debtDeltaPao(existing))+FinanceCore.toCents(FinanceCore.debtDeltaPao(tx)));
    if (!confirm(`การแก้ไขนี้จะเปลี่ยนยอดค้างสุทธิจาก ${money(Math.abs(before))} เป็น ${money(Math.abs(after))} ยืนยันแก้ไข?`)) return;
  }
  let recurring = null;
  if (!existing && form.type === 'expense' && form.installment) {
    const quote = installmentQuote();
    if (!quote) return fieldError('amount','ยอดรวมต้องแบ่งได้อย่างน้อยเดือนละ 0.01 บาท');
    const multiplier = $('installmentBasis').value === 'monthly' ? quote.count : 1;
    const multiplyPair = value => ({Pao:FinanceCore.fromCents(FinanceCore.toCents(value.Pao)*multiplier),Tim:FinanceCore.fromCents(FinanceCore.toCents(value.Tim)*multiplier)});
    recurring = {id:id(),kind:'installment',enabled:true,frequency:'monthly',nextRun:date.toISOString(),dayOfMonth:Number($('installmentDay').value),totalInstallments:quote.count,completedInstallments:0,installmentTotalAmount:quote.total,installmentTotalShares:multiplyPair(tx.shares),installmentTotalPaid:multiplyPair(tx.paid),template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
    recurring.installmentTotalSplit = {...recurring.installmentTotalShares};
    Object.assign(recurring.template,installmentPayment(recurring,1));
  } else if (scheduleKind === 'monthly') {
    recurring = {...existingRecurring,id:existingRecurring?.id || id(),kind:form.type === 'income' ? 'monthly-income' : 'monthly-expense',enabled:existingRecurring?.enabled !== false,frequency:'monthly',nextRun:date.toISOString(),dayOfMonth:Number($('monthlyDay').value),template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
  } else if (!existing && form.recurring && !(form.type === 'saving' && form.savingDirection === 'out')) {
    const next = new Date($('nextRun').value);
    if (!Number.isFinite(next.getTime()) || (!existingRecurring && next.getTime() <= Date.now())) return fieldError('nextRun','เลือกเวลารอบถัดไปหลังจากเวลาปัจจุบัน');
    recurring = {...existingRecurring,id:existingRecurring?.id || id(),enabled:existingRecurring?.enabled !== false,frequency:$('freq').value,nextRun:next.toISOString(),dayOfMonth:next.getDate(),template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
  }
  savingTx = true; $('saveTxButton').disabled = true;
  const draftKey = currentDraftKey(), oldTx = existing ? clone(existing) : null, oldRecurring = existingRecurring ? clone(existingRecurring) : null;
  const generatedBefore = new Set(state.transactions.map(item => item.id)), scheduled = !!scheduleKind || !!existingRecurring;
  const target = route.from && route.from !== 'add' ? route.from : existing ? 'history' : existingRecurring ? 'settings' : 'home';
  try {
    if (existing) state.transactions = state.transactions.map(item => item.id === tx.id ? tx : item);
    else if (!scheduled) state.transactions.push(tx);
    if (recurring) {
      if (existingRecurring) state.recurring = state.recurring.map(item => item.id === recurring.id ? recurring : item);
      else state.recurring.push(recurring);
    }
    if (scheduled && recurring) generateDueTransactions(recurring);
    const newlyGeneratedIds = new Set(state.transactions.filter(item => !generatedBefore.has(item.id)).map(item => item.id));
    save(); removeDraft(draftKey); highlightTxId = tx.id; resetForm(); show(target,{replace:true,restore:!!existing || !!existingRecurring,saved:true});
    toastMsg(existingRecurring ? 'แก้ไขรายการประจำแล้ว รอบที่บันทึกไปแล้วยังคงเดิม' : existing ? 'บันทึกการแก้ไขแล้ว' : recurring ? 'บันทึกรายการประจำแล้ว' : `บันทึก ${money(amount)} แล้ว`,() => {
      state.transactions = oldTx ? state.transactions.map(item => item.id === tx.id ? oldTx : item) : state.transactions.filter(item => existingRecurring ? !newlyGeneratedIds.has(item.id) : scheduled ? item.recurringId !== recurring.id : item.id !== tx.id);
      if (oldRecurring) state.recurring = state.recurring.map(item => item.id === oldRecurring.id ? oldRecurring : item);
      else if (recurring) state.recurring = state.recurring.filter(item => item.id !== recurring.id);
      save(); renderAll();
    });
  } catch (error) { fieldError('formError',error.message); }
  finally { savingTx = false; $('saveTxButton').disabled = false; }
}

function editTx(txid) {
  const tx = state.transactions.find(item => item.id === txid);
  if (!tx || tx.type === 'settlement') return;
  const origin = currentView() === 'add' ? route.from || 'history' : currentView();
  resetForm(); form.editId = tx.id; setType(tx.type); renderPays(); renderSelects();
  $('amount').value = Math.abs(tx.amount); $('dt').value = ldt(new Date(tx.datetime)); $('note').value = tx.note || ''; $('pay').value = tx.payment || state.settings.defaultPayment;
  if (tx.type !== 'saving') { $('cat').value = tx.category || ''; renderCats(); }
  if (tx.type === 'expense') {
    const shares = FinanceCore.expenseShares(tx), paid = FinanceCore.expensePaid(tx);
    form.owner = FinanceCore.ownerFromShares(shares); form.payer = FinanceCore.payerFromPaid(paid); form.split = Math.abs(shares.Pao-shares.Tim) <= .01 ? 'half' : 'custom';
    $('ps').value = shares.Pao; $('ts').value = shares.Tim; $('paidPao').value = paid.Pao; $('paidTim').value = paid.Tim; $('project').value = tx.projectId || '';
  } else if (tx.type === 'income') {
    const shares = FinanceCore.incomeShares(tx); form.incOwner = FinanceCore.ownerFromShares(shares); $('incomePao').value = shares.Pao; $('incomeTim').value = shares.Tim;
  } else {
    const allocations = FinanceCore.savingAllocations(tx); form.savOwner = allocations.length > 1 ? 'Both' : allocations[0]?.user || primaryUser(); form.savingDirection = tx.direction;
    $('savingProject').value = tx.projectId || '';
    if (form.savOwner === 'Both') {
      const pao = allocations.find(item => item.user === 'Pao'), tim = allocations.find(item => item.user === 'Tim');
      $('savingPao').value = pao?.amount || ''; $('savingTim').value = tim?.amount || ''; $('pocketPao').value = pao?.pocketId || ''; $('pocketTim').value = tim?.pocketId || '';
    } else $('pocket').value = allocations[0]?.pocketId || tx.pocketId || '';
  }
  syncChoices(); updateSplit(); updateFormSummary(); $('optionalDetails').open = !!(tx.note || tx.projectId); formBaseline = draftSignature(); restoreDraft(tx.id); show('add',{from:origin});
}

function editRecurring(recurringId) {
  const rec = state.recurring.find(item => item.id === recurringId);
  if (!rec || rec.kind === 'installment') return;
  const tx = FinanceCore.normalizeTransaction(rec.template);
  const origin = currentView() === 'add' ? route.from || 'settings' : currentView();
  resetForm();
  form.recurringEditId = rec.id;
  setType(tx.type);
  const monthly = ['monthly-expense','monthly-income'].includes(rec.kind);
  form.monthly = monthly;
  form.recurring = !monthly;
  renderPays(); renderSelects();
  $('amount').value = Math.abs(tx.amount);
  $('dt').value = ldt(new Date(rec.nextRun));
  $('pay').value = tx.payment || state.settings.defaultPayment;
  if (tx.type !== 'saving') { $('cat').value = tx.category || ''; renderCats(); }
  if (monthly) {
    const noteParts = String(tx.note || '').split(' · ');
    $('planName').value = noteParts.shift() || tx.category || '';
    $('note').value = noteParts.join(' · ');
    $('monthlyStart').value = monthKey(new Date(rec.nextRun));
    $('monthlyDay').value = String(rec.dayOfMonth || new Date(rec.nextRun).getDate());
  } else {
    $('note').value = tx.note || '';
    $('freq').value = rec.frequency || 'monthly';
    $('nextRun').value = ldt(new Date(rec.nextRun));
  }
  if (tx.type === 'expense') {
    const shares = FinanceCore.expenseShares(tx), paid = FinanceCore.expensePaid(tx);
    form.owner = FinanceCore.ownerFromShares(shares); form.payer = FinanceCore.payerFromPaid(paid); form.split = Math.abs(shares.Pao-shares.Tim) <= .01 ? 'half' : 'custom';
    $('ps').value = shares.Pao; $('ts').value = shares.Tim; $('paidPao').value = paid.Pao; $('paidTim').value = paid.Tim; $('project').value = tx.projectId || '';
  } else if (tx.type === 'income') {
    const shares = FinanceCore.incomeShares(tx); form.incOwner = FinanceCore.ownerFromShares(shares); $('incomePao').value = shares.Pao; $('incomeTim').value = shares.Tim;
  } else {
    const allocations = FinanceCore.savingAllocations(tx); form.savOwner = allocations.length > 1 ? 'Both' : allocations[0]?.user || primaryUser(); form.savingDirection = tx.direction || 'in'; $('savingProject').value = tx.projectId || '';
    if (form.savOwner === 'Both') {
      const pao = allocations.find(item => item.user === 'Pao'), tim = allocations.find(item => item.user === 'Tim');
      $('savingPao').value = pao?.amount || ''; $('savingTim').value = tim?.amount || ''; $('pocketPao').value = pao?.pocketId || ''; $('pocketTim').value = tim?.pocketId || '';
    } else $('pocket').value = allocations[0]?.pocketId || tx.pocketId || '';
  }
  syncInstallmentForm();
  $('recSwitch').classList.toggle('on',form.recurring);
  $('recSwitch').setAttribute('aria-pressed',String(form.recurring));
  syncChoices(); updateSplit(); updateFormSummary();
  $('optionalDetails').open = !!(tx.note || tx.projectId || !monthly);
  formBaseline = draftSignature();
  restoreDraft('recurring_'+rec.id);
  show('add',{from:origin});
}

function renderUserLabels() {
  if (!state?.settings?.users) return;
  const primary = primaryUser(), partner = partnerUser();
  $('brandName').textContent = `${userName('Pao')} & ${userName('Tim')} Money`;
  $('homeTitle').textContent = `ภาพรวมของ${who(primary)}`;
  $('expenseLabel').textContent = `รายจ่ายของ${who(primary)}`;
  $('expenseHint').textContent = `รวมส่วนของ${who(primary)}ในรายการหาร`;
  $('debtTitle').textContent = `ระหว่าง${who('Pao')} & ${who('Tim')}`;
  $('grossPaoLabel').textContent = `${who('Pao')}สำรองให้${who('Tim')}`;
  $('grossTimLabel').textContent = `${who('Tim')}สำรองให้${who('Pao')}`;
  const labels = {
    owner:{Pao:`${who('Pao')}${primary === 'Pao' ? ' · ของฉัน' : ' · อีกคน'}`,Tim:`${who('Tim')}${primary === 'Tim' ? ' · ของฉัน' : ' · อีกคน'}`,Both:'หารกัน'},
    payer:{Pao:who('Pao'),Tim:who('Tim'),Both:'ช่วยกันจ่าย'},
    incowner:{Pao:who('Pao'),Tim:who('Tim'),Both:'ทั้งคู่'},
    savowner:{Pao:who('Pao'),Tim:who('Tim'),Both:'ทั้งคู่'}
  };
  for (const [attr,map] of Object.entries(labels)) document.querySelectorAll(`[data-${attr}]`).forEach(button => { button.textContent = map[button.dataset[attr]] || button.textContent; });
  document.querySelector('label[for="ps"]').textContent = `ส่วนของ${who('Pao')}`;
  document.querySelector('label[for="ts"]').textContent = `ส่วนของ${who('Tim')}`;
  document.querySelector('label[for="paidPao"]').textContent = `${who('Pao')}จ่าย`;
  document.querySelector('label[for="paidTim"]').textContent = `${who('Tim')}จ่าย`;
  document.querySelector('label[for="incomePao"]').textContent = `ส่วนของ${who('Pao')}`;
  document.querySelector('label[for="incomeTim"]').textContent = `ส่วนของ${who('Tim')}`;
  document.querySelector('label[for="savingPao"]').textContent = `ส่วนของ${who('Pao')}`;
  document.querySelector('label[for="savingTim"]').textContent = `ส่วนของ${who('Tim')}`;
  if ($('primaryUserInput')) {
    $('primaryUserInput').options[0].textContent = who('Pao');
    $('primaryUserInput').options[1].textContent = who('Tim');
  }
  if ($('ownerFilter')) {
    const selectedOwner = $('ownerFilter').value;
    $('ownerFilter').innerHTML = `<option value="all">ทุกคน</option><option value="Pao">${esc(who('Pao'))}</option><option value="Tim">${esc(who('Tim'))}</option><option value="Both">ทั้งคู่ / รายการหาร</option>`;
    $('ownerFilter').value = ['all','Pao','Tim','Both'].includes(selectedOwner) ? selectedOwner : 'all';
  }
  $('budgetModalTitle').textContent = `ตั้งงบรายเดือนของ${who(primary)}`;
}

function saveUserSettings() {
  clearFieldErrors($('userSettings'));
  const pao = $('userNamePao').value.trim(), tim = $('userNameTim').value.trim();
  if (!pao) return fieldError('userNamePao','ใส่ชื่อคนที่ 1');
  if (!tim) return fieldError('userNameTim','ใส่ชื่อคนที่ 2');
  if (pao.toLocaleLowerCase('th-TH') === tim.toLocaleLowerCase('th-TH')) return fieldError('userNameTim','ใช้ชื่อที่ต่างกันเพื่อไม่ให้สับสน');
  state.settings.users = {Pao:{name:pao.slice(0,40)},Tim:{name:tim.slice(0,40)}};
  state.settings.primaryUser = $('primaryUserInput').value === 'Tim' ? 'Tim' : 'Pao';
  const book = budgetBook(); state.settings.overallBudget = book.overall; state.budgets = clone(book.categories);
  try { save(); resetForm(); renderAll(); toastMsg(`เปลี่ยนมุมมองหลักเป็น ${who(primaryUser())} แล้ว`); }
  catch (error) { fieldError('userNamePao',error.message); }
}

function setLedgerMode(mode) {
  ledgerMode = ['mine','shared','all'].includes(mode) ? mode : 'mine';
  historyPeriod = selectedMonth;
  renderPeriodOptions(); renderHistory();
}

function openSharedLedger() {
  ledgerMode = 'shared';
  $('typeFilter').value = 'all'; $('ownerFilter').value = 'all'; $('search').value = ''; $('projectFilter').value = 'all';
  historyPeriod = selectedMonth; renderPeriodOptions(); show('history',{detail:'shared',from:currentView()});
}

function openHistory(type = 'all', mode = 'mine') {
  ledgerMode = ['mine','shared','all'].includes(mode) ? mode : mode === 'PaoShare' ? 'mine' : 'mine';
  $('typeFilter').value = type; $('ownerFilter').value = 'all'; $('search').value = ''; $('projectFilter').value = 'all';
  historyPeriod = selectedMonth; renderPeriodOptions(); show('history',{detail:'period',from:currentView()});
}

function transactionSource(tx) {
  if (tx.installmentNumber) return {label:`รายการผ่อน · งวด ${tx.installmentNumber}/${tx.installmentTotal || '?'}`,className:'installment-badge'};
  if (tx.recurringGenerated || tx.recurringId) return {label:'รายการประจำ',className:'recurring-badge'};
  return null;
}

function clearHistoryFilters() {
  historyPeriod = selectedMonth; ledgerMode = 'mine'; $('search').value = ''; $('typeFilter').value = 'all'; $('ownerFilter').value = 'all'; $('projectFilter').value = 'all';
  renderPeriodOptions(); renderHistory();
}

function txrow(tx, shareOwner = null, context = null) {
  const mode = context || (shareOwner ? 'mine' : 'all');
  const primary = shareOwner || primaryUser();
  const title = tx.note || tx.category || (tx.type === 'settlement' ? 'คืนเงินกัน' : 'เงินเก็บ');
  const cls = tx.type === 'income' ? 'income' : tx.type === 'expense' ? 'expense' : 'saving';
  const date = new Date(tx.datetime).toLocaleDateString('th-TH',{day:'numeric',month:'short'});
  const project = projectById(tx.projectId), allocations = tx.type === 'saving' ? FinanceCore.savingAllocations(tx) : [];
  let shown = Math.abs(tx.amount), sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : tx.type === 'settlement' ? '✓' : tx.direction === 'out' ? '←' : '→';
  let meta = '', debtNote = '';
  if (tx.type === 'expense') {
    const shares = FinanceCore.expenseShares(tx), paid = FinanceCore.expensePaid(tx), delta = FinanceCore.debtDeltaPao(tx);
    if (mode === 'mine') shown = shares[primary];
    else if (mode === 'shared') shown = Math.abs(FinanceCore.debtForUser(tx,primary)) || shares[primary] || tx.amount;
    meta = `${who(FinanceCore.ownerFromShares(shares))} · จ่ายโดย ${paid.Pao > 0 && paid.Tim > 0 ? who('Both') : who(FinanceCore.payerFromPaid(paid))} · ${date}`;
    if (mode === 'mine') meta += ` · ยอดเต็ม ${money(tx.amount)}`;
    if (delta) debtNote = `${delta > 0 ? who('Tim')+'ค้าง'+who('Pao') : who('Pao')+'ค้าง'+who('Tim')} ${money(Math.abs(delta))}`;
  } else if (tx.type === 'income') {
    shown = mode === 'all' ? tx.amount : FinanceCore.economicShare(tx,primary);
    meta = `${who(tx.owner)} · ${date}${mode !== 'all' ? ` · ยอดรวม ${money(tx.amount)}` : ''}`;
  } else if (tx.type === 'saving') {
    shown = mode === 'all' ? tx.amount : Math.abs(FinanceCore.economicShare(tx,primary));
    meta = `${tx.direction === 'out' ? 'ถอนกลับมาใช้' : 'ออมเข้า'} · ${allocations.map(item => `${who(item.user)} ${money(item.amount)}`).join(' · ')} · ${date}`;
  } else {
    meta = `${who(tx.from)} → ${who(tx.to)} · ${date}`;
  }
  const tag = project?.name || (allocations.length === 1 ? pocketById(allocations[0].pocketId)?.name : ''), source = transactionSource(tx);
  const tags = `${source ? `<span class="badge source-badge ${source.className}">${esc(source.label)}</span>` : ''}${tag ? `<span class="badge project-badge">${esc(tag)}</span>` : ''}`;
  return `<button class="tx ${tx.id === highlightTxId ? 'tx-highlight' : ''}" data-tx-id="${esc(tx.id)}" onclick="openTx(${jsArg(tx.id)})" aria-label="ดู ${esc(title)} ${money(shown)}${source ? ` ${esc(source.label)}` : ''}"><span class="ico" aria-hidden="true">${icon(tx)}</span><span><span class="tx-title">${esc(title)}${tx.needsReview ? '<span class="badge review-badge">ควรตรวจสอบ</span>' : ''}</span><span class="tx-meta">${esc(meta)}</span>${debtNote ? `<span class="tx-debt-note">${esc(debtNote)}</span>` : ''}${tags ? `<span class="tx-tags">${tags}</span>` : ''}</span><span class="amt ${cls}">${sign}${money(shown)}</span></button>`;
}

function renderHistory() {
  ledgerMode = ['mine','shared','all'].includes(ledgerMode) ? ledgerMode : 'mine';
  historyPeriod = $('historyPeriod').value || historyPeriod || selectedMonth;
  const primary = primaryUser(), query = $('search').value.trim().toLowerCase(), type = $('typeFilter').value, owner = $('ownerFilter').value, project = $('projectFilter').value;
  const inMode = tx => ledgerMode === 'mine' ? tx.type !== 'settlement' && Math.abs(FinanceCore.economicShare(tx,primary)) > .001 : ledgerMode === 'shared' ? tx.type === 'settlement' || FinanceCore.isSharedExpense(tx) : tx.type !== 'settlement';
  const list = [...state.transactions].filter(tx => inMode(tx) && (historyPeriod === 'all' || monthKey(tx.datetime) === historyPeriod) && (type === 'all' || tx.type === type) && (owner === 'all' || tx.owner === owner) && (project === 'all' || (project === 'none' ? !tx.projectId : tx.projectId === project)) && (!query || `${tx.note || ''} ${tx.category || ''} ${tx.payment || ''} ${projectById(tx.projectId)?.name || ''}`.toLowerCase().includes(query))).sort((a,b) => new Date(b.datetime)-new Date(a.datetime));
  const labels = {mine:['รายการของฉัน',`รายการที่กระทบ ${who(primary)} ในช่วงเวลาที่เลือก`],shared:['หารกัน',`รายการร่วม สำรองจ่าย และคืนเงินระหว่าง ${who('Pao')} กับ ${who('Tim')}`],all:['รายการทั้งหมด','ข้อมูลรายรับ รายจ่าย และเงินเก็บของทั้งสองคน']};
  $('historyTitle').textContent = labels[ledgerMode][0]; $('historySubtitle').textContent = labels[ledgerMode][1];
  for (const [mode,id] of [['mine','ledgerMine'],['shared','ledgerShared'],['all','ledgerAll']]) { $(id).classList.toggle('active',ledgerMode === mode); $(id).setAttribute('aria-selected',String(ledgerMode === mode)); }
  let day = '';
  $('historyList').innerHTML = list.map(tx => { const date = new Date(tx.datetime).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}), heading = date !== day ? `<h2 class="date-heading">${date}</h2>` : ''; day = date; return heading + txrow(tx,ledgerMode === 'all' ? null : primary,ledgerMode); }).join('') || '<div class="empty">ไม่พบรายการตามเงื่อนไขนี้<button class="btn" onclick="clearHistoryFilters()">ล้างตัวกรอง</button></div>';
  const personalTotal = ledgerMode === 'mine' ? list.reduce((sum,tx) => sum + (tx.type === 'expense' ? FinanceCore.economicShare(tx,primary) : 0),0) : null;
  $('historyCount').textContent = `${list.length} รายการ · ${historyPeriod === 'all' ? 'ทุกช่วงเวลา' : formatMonth(historyPeriod)}${personalTotal != null ? ` · รายจ่ายของ${who(primary)} ${money(personalTotal)}` : ''}`;
}

function renderPockets(target = 'homePockets') {
  const element = $(target); if (!element) return;
  const pockets = target === 'homePockets' ? state.pockets.filter(pocket => pocket.owner === primaryUser()) : state.pockets;
  element.innerHTML = pockets.map(pocket => {
    const balance = pocketBalance(pocket.id), percent = pocket.goal > 0 ? Math.max(0,balance/pocket.goal*100) : 0;
    return `<div class="pocket"><div class="pocket-top"><b>${esc(pocket.icon || '💰')} ${esc(pocket.name)}</b><span class="status">${esc(who(pocket.owner))}</span></div><div class="big">${money(balance)}</div><small>${pocket.goal ? 'เป้าหมาย '+money(pocket.goal) : 'ยังไม่ตั้งเป้าหมาย'}${pocket.needsReview ? ' · ควรตรวจสอบเจ้าของ' : ''}</small>${pocket.goal ? `<div class="progress saving" style="margin-top:9px"><div style="width:${Math.min(100,percent)}%"></div></div>` : ''}</div>`;
  }).join('') || `<div class="empty">ยังไม่มีกระเป๋าของ${who(primaryUser())}<br><button class="soft" onclick="addPocket()">＋ เพิ่มกระเป๋า</button></div>`;
}

function renderBudget() {
  const spent = totals().expense, book = budgetBook(), budget = book.overall, percent = budget > 0 ? spent/budget*100 : 0, over = budget > 0 && spent > budget;
  $('budUsed').textContent = money(spent); $('budTotal').textContent = money(budget); $('budProg').style.width = Math.min(100,Math.max(0,percent))+'%'; $('budProg').parentElement.classList.toggle('over',over);
  $('budHint').textContent = !budget ? `ยังไม่ตั้งงบของ${who(primaryUser())}` : `${over ? 'เกินงบ '+money(spent-budget) : 'เหลือ '+money(budget-spent)} · ใช้ไป ${percent.toFixed(0)}%`;
  $('budHint').className = over ? 'expense' : 'muted'; $('budSpent2').textContent = money(spent); $('budRemain2').textContent = money(Math.max(0,budget-spent));
  const categories = [...new Set([...Object.keys(book.categories),...currentMonthTx().filter(tx => tx.type === 'expense').map(tx => tx.category)])];
  const rows = categories.map(category => ({category,limit:Number(book.categories[category] || 0),used:currentMonthTx().filter(tx => tx.type === 'expense' && tx.category === category).reduce((sum,tx) => sum+FinanceCore.economicShare(tx,primaryUser()),0)})).sort((a,b) => b.used-a.used);
  $('budOver2').textContent = rows.filter(row => row.limit && row.used > row.limit).length+' หมวด';
  $('budgetDetail').innerHTML = rows.map(row => `<div class="detail-row"><div class="detail-head"><div><b>${esc(row.category)}</b><br><small>${row.limit ? 'งบ '+money(row.limit) : 'ยังไม่ตั้งงบหมวดนี้'}</small></div><div class="detail-right"><b>${money(row.used)}</b>${row.limit ? `<br><small class="${row.used > row.limit ? 'expense' : 'muted'}">${row.used > row.limit ? 'เกิน '+money(row.used-row.limit) : 'เหลือ '+money(row.limit-row.used)}</small>` : ''}</div></div></div>`).join('') || '<p class="empty">ยังไม่มีรายจ่ายในเดือนนี้</p>';
}

function debtSourceRows() {
  return state.transactions.map(tx => ({tx,delta:FinanceCore.debtDeltaPao(tx)})).filter(row => Math.abs(row.delta) > .001).sort((a,b) => new Date(b.tx.datetime)-new Date(a.tx.datetime));
}

function renderDebt() {
  const rows = debtSourceRows(), expenses = rows.filter(row => row.tx.type === 'expense'), net = debtFor();
  const timGross = expenses.filter(row => row.delta > 0).reduce((sum,row) => sum+row.delta,0), paoGross = expenses.filter(row => row.delta < 0).reduce((sum,row) => sum-row.delta,0);
  $('grossTim').textContent = money(timGross); $('grossPao').textContent = money(paoGross); $('debtNet2').textContent = money(Math.abs(net));
  $('debtLabel').textContent = net > 0 ? `${who('Tim')}ค้าง${who('Pao')}` : net < 0 ? `${who('Pao')}ค้าง${who('Tim')}` : 'ยอดสุทธิ';
  $('debtAmt').textContent = money(Math.abs(net)); $('debtDesc').textContent = net === 0 ? 'ไม่มีใครค้างใคร' : 'ยอดสะสมหลังหักรายการคืนเงินแล้ว';
  $('debtActions').innerHTML = Math.abs(net) > .01 ? '<button onclick="event.stopPropagation();settleDebt()">บันทึกคืนเงิน</button>' : '';
  $('debtTxDetail').innerHTML = rows.slice(0,5).map(({tx,delta}) => `<div class="debt-tx"><div class="ico">${icon(tx)}</div><div><b>${esc(tx.note || tx.category || 'คืนเงิน')}</b><small>${tx.type === 'settlement' ? `${who(tx.from)} → ${who(tx.to)}` : `${delta > 0 ? who('Tim')+'ค้าง'+who('Pao') : who('Pao')+'ค้าง'+who('Tim')} ${money(Math.abs(delta))}`}</small><small>${new Date(tx.datetime).toLocaleDateString('th-TH')}</small></div><b>${money(Math.abs(delta))}</b></div>`).join('') || '<div style="padding:8px 0">ยังไม่มีรายการระหว่างกัน</div>';
}

function settleDebt() {
  const net = FinanceCore.fromCents(FinanceCore.toCents(debtFor()));
  if (!net) return toastMsg('ไม่มีหนี้ที่ต้องคืน');
  settlementSnapshot = net;
  $('settlementDirection').textContent = net > 0 ? `${who('Tim')}คืนเงินให้${who('Pao')}` : `${who('Pao')}คืนเงินให้${who('Tim')}`;
  $('settlementLimit').textContent = 'ยอดค้างทั้งหมด '+money(Math.abs(net)); $('settlementAmount').value = ''; $('settlementDate').value = ldt(); $('settlementNote').value = ''; $('settlementError').hidden = true; clearFieldErrors($('settlementModal')); openModal('settlementModal','#settlementAmount');
}

function saveSettlement() {
  const net = FinanceCore.fromCents(FinanceCore.toCents(debtFor()));
  if (net !== settlementSnapshot) { closeModal('settlementModal',false); settleDebt(); return toastMsg('ยอดค้างเปลี่ยนแล้ว กรุณาตรวจจำนวนอีกครั้ง'); }
  const amount = parseMoney($('settlementAmount').value), date = new Date($('settlementDate').value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > Math.abs(net)) return fieldError('settlementAmount',`ใส่จำนวนมากกว่า 0 และไม่เกิน ${money(Math.abs(net))}`);
  if (!Number.isFinite(date.getTime())) return fieldError('settlementDate','เลือกวันที่และเวลา');
  const from = net > 0 ? 'Tim' : 'Pao', to = net > 0 ? 'Pao' : 'Tim';
  const tx = {id:id(),type:'settlement',amount,datetime:date.toISOString(),from,to,note:$('settlementNote').value.trim() || `คืนเงิน ${who(from)} → ${who(to)}`};
  state.transactions.push(tx);
  try { save(); closeModal('settlementModal'); renderAll(); toastMsg('บันทึกการคืนเงินแล้ว',() => { state.transactions = state.transactions.filter(item => item.id !== tx.id); save(); renderAll(); }); }
  catch (error) { $('settlementError').hidden = false; $('settlementError').textContent = error.message; }
}

function renderHomeProjects() {
  const user = primaryUser();
  $('homeProjects').innerHTML = state.projects.filter(project => project.status === 'Active').slice(0,3).map(project => `<button class="tx" onclick="openProject(${jsArg(project.id)})"><span class="ico">${esc(project.icon || '▣')}</span><span><span class="tx-title">${esc(project.name)}</span><span class="tx-meta">ส่วนของ${who(user)}เดือนนี้ ${money(projectSpend(project.id,true,user))} · ยอดเต็ม ${money(projectSpend(project.id,true))}</span></span><span>›</span></button>`).join('');
}

function renderHome() {
  const value = totals(), hideIncome = state.settings.hideIncomeHome !== false, daily = dailyAllowance(value), primary = primaryUser();
  const savingMath = value.saving >= 0 ? `− เงินเก็บสุทธิ ${money(value.saving)}` : `＋ ถอนจากเงินเก็บ ${money(Math.abs(value.saving))}`;
  const actualRemaining = daily.availableRemaining >= 0 ? money(daily.availableRemaining) : `฿0.00 (ใช้เกิน ${money(Math.abs(daily.availableRemaining))})`;
  const dailyBreakdown = hideIncome ? `เงินเหลือจริงหลังหักรายจ่ายและเงินเก็บ ${actualRemaining}` : `รายรับ ${money(value.income)} − รายจ่าย ${money(value.expense)} ${savingMath} = เงินเหลือจริง ${actualRemaining}`;
  $('dailyAvailable').textContent = daily.past ? '—' : money(daily.amount); $('dailyHint').textContent = daily.past ? 'เดือนนี้สิ้นสุดแล้ว' : `${dailyBreakdown} · ${money(daily.remaining)} ÷ ${daily.days} วันที่เหลือ${daily.over ? ' · ใช้เกินเงินเหลือแล้ว' : ''}`;
  $('monthLabel').textContent = formatMonth(selectedMonth); $('homeMetrics').classList.toggle('privacy-on',hideIncome); $('availableCard').hidden = hideIncome; $('incomeCard').hidden = hideIncome;
  $('available').textContent = money(value.available); $('income').textContent = money(value.income); $('expense').textContent = money(value.expense); $('saving').textContent = money(value.saving); $('rate').textContent = hideIncome ? '' : `อัตราเงินเก็บ ${value.rate.toFixed(1)}%`;
  const recent = currentMonthTx().filter(tx => tx.type !== 'settlement' && Math.abs(FinanceCore.economicShare(tx,primary)) > .001 && (!hideIncome || tx.type !== 'income')).sort((a,b) => new Date(b.datetime)-new Date(a.datetime)).slice(0,6);
  $('recent').innerHTML = recent.map(tx => txrow(tx,primary,'mine')).join('') || '<div class="empty">ยังไม่มีรายการของ User หลักในเดือนนี้<br><button class="soft" onclick="openAdd()">＋ เพิ่มรายการแรก</button></div>';
  const unique = []; for (const tx of recent) { if (!unique.some(item => item.type === tx.type && item.note === tx.note)) unique.push(tx); if (unique.length === 4) break; }
  $('quick').innerHTML = unique.map(tx => `<div class="quick"><button class="quick-main" onclick="quickAddNow('${tx.id}')"><b>${icon(tx)} ${esc(tx.note || tx.category || 'เงินเก็บ')}</b><small>${money(Math.abs(FinanceCore.economicShare(tx,primary)))} · ส่วนของ${who(primary)}</small></button><button class="quick-edit" onclick="quickAdd('${tx.id}')">แก้ก่อนบันทึก</button></div>`).join('') || '<div class="empty">รายการที่ใช้ซ้ำของ User หลักจะมาอยู่ตรงนี้</div>';
  renderPockets();
  const recurring = state.recurring.filter(rec => rec.kind !== 'installment' && rec.enabled && Math.abs(FinanceCore.economicShare(rec.template,primary)) > .001 && (!hideIncome || rec.template.type !== 'income')).sort((a,b) => new Date(a.nextRun)-new Date(b.nextRun)).slice(0,4);
  $('homeRecurring').innerHTML = recurring.map(rec => { const typeClass = rec.template.type === 'income' ? 'income' : rec.template.type === 'expense' ? 'expense' : 'saving'; return `<div class="setrow"><div><b>↻ ${esc(rec.template.note || rec.template.category || 'เงินเก็บ')}</b><small class="muted" style="display:block">${esc(typeLabel(rec.template.type))}ประจำ · ครั้งถัดไป ${new Date(rec.nextRun).toLocaleDateString('th-TH')}</small></div><b class="${typeClass}">${money(Math.abs(FinanceCore.economicShare(rec.template,primary)))}</b></div>`; }).join('') || '<div class="empty">ยังไม่มีรายการประจำของ User หลัก</div>';
  renderBudget(); renderDebt(); renderHomeProjects();
}

function renderSummary() {
  const user = primaryUser(), value = totals(), expenses = currentMonthTx().filter(tx => tx.type === 'expense' && FinanceCore.economicShare(tx,user) > 0);
  $('sInc').textContent = money(value.income); $('sExp').textContent = money(value.expense); $('sSav').textContent = money(value.saving); $('sAvail').textContent = money(value.available); $('sRate').textContent = `อัตราเงินเก็บ ${value.rate.toFixed(1)}%`;
  const categories = {}; expenses.forEach(tx => categories[tx.category] = (categories[tx.category] || 0)+FinanceCore.economicShare(tx,user));
  let max = Math.max(1,...Object.values(categories)); $('catChart').innerHTML = Object.entries(categories).sort((a,b) => b[1]-a[1]).map(([name,amount]) => `<div class="chartrow"><span>${esc(name)}</span><div class="bar"><div style="width:${amount/max*100}%"></div></div><b>${money(amount)}</b></div>`).join('') || '<div class="empty">ยังไม่มีรายจ่ายเดือนนี้</div>';
  const projects = state.projects.map(project => [project.name,projectSpend(project.id,true,user)]).filter(item => item[1] > 0); max = Math.max(1,...projects.map(item => item[1])); $('projectChart').innerHTML = projects.map(([name,amount]) => `<div class="chartrow"><span>${esc(name)}</span><div class="bar"><div style="width:${amount/max*100}%"></div></div><b>${money(amount)}</b></div>`).join('') || '<div class="empty">เดือนนี้ยังไม่มีการใช้จ่ายโปรเจกต์</div>';
  const kinds = {ส่วนตัว:0,'หารกัน':0}; expenses.forEach(tx => { const shares = FinanceCore.expenseShares(tx); kinds[shares.Pao > 0 && shares.Tim > 0 ? 'หารกัน' : 'ส่วนตัว'] += FinanceCore.economicShare(tx,user); }); max = Math.max(1,...Object.values(kinds)); $('ownerChart').innerHTML = Object.entries(kinds).map(([name,amount]) => `<div class="chartrow"><span>${name}</span><div class="bar"><div style="width:${amount/max*100}%"></div></div><b>${money(amount)}</b></div>`).join('');
  const net = debtFor(); $('sumDebt').innerHTML = net === 0 ? 'ไม่มีใครค้างใคร' : `${net > 0 ? who('Tim')+'ค้าง'+who('Pao') : who('Pao')+'ค้าง'+who('Tim')} <b>${money(Math.abs(net))}</b>`;
  const pockets = state.pockets.filter(pocket => pocket.owner === user); $('pocketSummary').innerHTML = pockets.map(pocket => `<div class="detail-row"><div class="detail-head"><div><b>${esc(pocket.icon || '💰')} ${esc(pocket.name)}</b><br><small class="muted">เป้าหมาย ${money(pocket.goal)}</small></div><b>${money(pocketBalance(pocket.id))}</b></div></div>`).join('') || `<div class="empty">ยังไม่มีกระเป๋าของ${who(user)}</div>`;
}

function projectCategoryBreakdown(projectId,user = primaryUser(),monthOnly = false) {
  const categories = {};
  (monthOnly ? currentMonthTx() : state.transactions).filter(tx => tx.type === 'expense' && tx.projectId === projectId).forEach(tx => { categories[tx.category] = (categories[tx.category] || 0)+FinanceCore.economicShare(tx,user); });
  return categories;
}

function renderProjects() {
  const user = primaryUser(), expanded = new Set([...document.querySelectorAll('.project-card.expanded')].map(element => element.id));
  $('projectList').innerHTML = [...state.projects].sort((a,b) => (a.status === 'Archived')-(b.status === 'Archived')).map(project => {
    const personalSpent = projectSpend(project.id,false,user), grossSpent = projectSpend(project.id), monthSpent = projectSpend(project.id,true,user);
    const totalBudget = Number(project.budgetTotal || project.budget || 0), personalBudget = project.budgetShares ? Number(project.budgetShares[user] || 0) : 0;
    const percent = personalBudget > 0 ? personalSpent/personalBudget*100 : 0, categories = projectCategoryBreakdown(project.id,user,true), max = Math.max(1,...Object.values(categories));
    const transactions = currentMonthTx().filter(tx => tx.projectId === project.id && tx.type !== 'settlement').sort((a,b) => new Date(b.datetime)-new Date(a.datetime));
    const cardId = 'project_'+project.id, panelId = 'projectPanel_'+project.id;
    return `<article class="card project-card ${expanded.has(cardId) ? 'expanded' : ''}" id="${esc(cardId)}"><div class="project-title"><h2>${esc(project.icon || '▣')} ${esc(project.name)}</h2><span class="status">${esc(statusLabel(project.status))}</span></div><div class="project-stat personal-project-stat"><div><small>ส่วนของ${esc(who(user))}ทั้งหมด</small><b>${money(personalSpent)}</b></div><div><small>ยอดเต็มทั้งหมด</small><b>${money(grossSpent)}</b></div><div><small>งบส่วนของ${esc(who(user))}</small><b>${personalBudget ? money(personalBudget) : 'ยังไม่ตั้ง'}</b></div><div><small>งบรวมโปรเจกต์</small><b>${money(totalBudget)}</b></div></div>${personalBudget ? `<div class="progress ${personalSpent > personalBudget ? 'over' : ''}"><div style="width:${Math.min(100,percent)}%"></div></div><p class="${personalSpent > personalBudget ? 'expense' : 'muted'}">${personalSpent > personalBudget ? 'เกินงบส่วนตัว '+money(personalSpent-personalBudget) : 'เหลืองบส่วนตัว '+money(personalBudget-personalSpent)} · เดือนที่เลือก ${money(monthSpent)}</p>` : `<p class="muted">เดือนที่เลือก ${money(monthSpent)} · ยังไม่ตั้งงบส่วนของ${esc(who(user))}</p>`}<button class="disclosure" data-disclosure="${esc(cardId)}" onclick="toggleProject(${jsArg(project.id)})" aria-expanded="${expanded.has(cardId)}" aria-controls="${esc(panelId)}">ดูหมวดและรายการของเดือน <span>⌄</span></button><div class="project-detail" id="${esc(panelId)}"><h3>ส่วนของ${esc(who(user))}แยกตามหมวด</h3>${Object.entries(categories).sort((a,b) => b[1]-a[1]).map(([category,value]) => `<div class="chartrow"><span>${esc(category)}</span><div class="bar"><div style="width:${value/max*100}%"></div></div><b>${money(value)}</b></div>`).join('') || '<p class="empty">ยังไม่มีรายจ่ายเดือนนี้</p>'}<h3>รายการเดือนที่เลือก</h3>${transactions.map(tx => txrow(tx,user,'mine')).join('') || '<p class="empty">ยังไม่มีรายการ</p>'}<div class="actions"><button class="soft" onclick="editProject(${jsArg(project.id)})">แก้ไขโปรเจกต์</button>${project.status !== 'Archived' ? `<button class="btn" onclick="archiveProject(${jsArg(project.id)})">เก็บเข้าคลัง</button>` : ''}</div></div></article>`;
  }).join('') || '<div class="empty">ยังไม่มีโปรเจกต์<button class="soft" onclick="addProject()">＋ เพิ่มโปรเจกต์แรก</button></div>';
}

function addProject() {
  editingProjectId = null; $('projectModalTitle').textContent = 'เพิ่มโปรเจกต์'; $('projectSaveBtn').textContent = 'เพิ่มโปรเจกต์'; $('projectNameInput').value = ''; $('projectBudgetInput').value = ''; $('projectBudgetPaoInput').value = ''; $('projectBudgetTimInput').value = ''; $('projectIconInput').value = '✈️'; $('projectStatusInput').value = 'Planning'; updateProjectPreview(); openModal('projectModal','#projectNameInput');
}

function editProject(projectId) {
  const project = projectById(projectId); if (!project) return;
  editingProjectId = projectId; $('projectModalTitle').textContent = 'แก้ไขโปรเจกต์'; $('projectSaveBtn').textContent = 'บันทึก'; $('projectNameInput').value = project.name; $('projectBudgetInput').value = project.budgetTotal || project.budget || ''; $('projectBudgetPaoInput').value = project.budgetShares?.Pao ?? ''; $('projectBudgetTimInput').value = project.budgetShares?.Tim ?? ''; $('projectIconInput').value = project.icon || '▣'; $('projectStatusInput').value = project.status || 'Planning'; updateProjectPreview(); openModal('projectModal','#projectNameInput');
}

function updateProjectPreview() {
  const name = $('projectNameInput')?.value.trim() || 'ทริปพักผ่อน', icon = $('projectIconInput')?.value || '✈️', total = Number($('projectBudgetInput')?.value || 0), pao = Number($('projectBudgetPaoInput')?.value || 0), tim = Number($('projectBudgetTimInput')?.value || 0);
  $('projectPreviewName').textContent = `${icon} ${name}`; $('projectPreviewBudget').textContent = `งบรวม ${money(total)} · ${who('Pao')} ${money(pao)} · ${who('Tim')} ${money(tim)} · ${statusLabel($('projectStatusInput')?.value || 'Planning')}`;
}

function saveProjectModal() {
  clearFieldErrors($('projectModal'));
  const name = $('projectNameInput').value.trim(), total = parseMoney($('projectBudgetInput').value || '0');
  let pao = $('projectBudgetPaoInput').value.trim() === '' ? null : parseMoney($('projectBudgetPaoInput').value), tim = $('projectBudgetTimInput').value.trim() === '' ? null : parseMoney($('projectBudgetTimInput').value);
  if (!name) return fieldError('projectNameInput','ใส่ชื่อโปรเจกต์');
  if (!Number.isFinite(total) || total < 0) return fieldError('projectBudgetInput','งบรวมต้องเป็นจำนวนที่ไม่ติดลบ');
  if (pao !== null && (!Number.isFinite(pao) || pao < 0)) return fieldError('projectBudgetPaoInput','งบส่วนของคนที่ 1 ไม่ถูกต้อง');
  if (tim !== null && (!Number.isFinite(tim) || tim < 0)) return fieldError('projectBudgetTimInput','งบส่วนของคนที่ 2 ไม่ถูกต้อง');
  if (pao !== null && tim === null) tim = FinanceCore.fromCents(FinanceCore.toCents(total)-FinanceCore.toCents(pao));
  if (tim !== null && pao === null) pao = FinanceCore.fromCents(FinanceCore.toCents(total)-FinanceCore.toCents(tim));
  if ((pao !== null || tim !== null) && (!Number.isFinite(pao) || !Number.isFinite(tim) || pao < 0 || tim < 0 || FinanceCore.toCents(pao)+FinanceCore.toCents(tim) !== FinanceCore.toCents(total))) return fieldError('projectBudgetPaoInput','งบของทั้งสองคนต้องรวมเท่ากับงบรวม');
  const projectId = editingProjectId || id(), value = {id:projectId,name,budget:total,budgetTotal:total,budgetShares:pao === null ? null : {Pao:pao,Tim:tim},icon:$('projectIconInput').value || '▣',status:$('projectStatusInput').value || 'Planning'};
  if (editingProjectId) state.projects = state.projects.map(project => project.id === projectId ? {...project,...value} : project); else state.projects.push(value);
  try { save(); closeProjectModal(); renderAll(); toastMsg('บันทึกโปรเจกต์แล้ว'); } catch (error) { fieldError('projectNameInput',error.message); }
}

function addPocket(inline = false) {
  editingPocketId = null; pocketFromForm = inline; $('pocketModalTitle').textContent = 'เพิ่มกระเป๋าเงินเก็บ'; $('pocketSaveBtn').textContent = 'เพิ่มกระเป๋า'; $('pocketNameInput').value = ''; $('pocketGoalInput').value = ''; $('pocketOpeningInput').value = ''; $('pocketOwnerInput').value = primaryUser(); $('pocketIconInput').value = '💰'; fillPocketProjectOptions(''); updatePocketPreview(); openModal('pocketModal','#pocketNameInput');
}

function editPocket(pocketId) {
  const pocket = pocketById(pocketId); if (!pocket) return;
  editingPocketId = pocketId; pocketFromForm = false; $('pocketModalTitle').textContent = 'แก้ไขกระเป๋า'; $('pocketSaveBtn').textContent = 'บันทึก'; $('pocketNameInput').value = pocket.name; $('pocketGoalInput').value = pocket.goal || ''; $('pocketOpeningInput').value = pocket.openingBalance || ''; $('pocketOwnerInput').value = pocket.owner || 'Pao'; $('pocketIconInput').value = pocket.icon || '💰'; fillPocketProjectOptions(pocket.projectId || ''); updatePocketPreview(); openModal('pocketModal','#pocketNameInput');
}

function updatePocketPreview() {
  const name = $('pocketNameInput')?.value.trim() || 'กองทุนฉุกเฉิน', icon = $('pocketIconInput')?.value || '💰', goal = Number($('pocketGoalInput')?.value || 0), owner = $('pocketOwnerInput')?.value || primaryUser();
  $('pocketPreviewName').textContent = `${icon} ${name}`; $('pocketPreviewDetail').textContent = `เจ้าของ ${who(owner)} · เป้าหมาย ${money(goal)}`;
}

function savePocketModal() {
  clearFieldErrors($('pocketModal'));
  const name = $('pocketNameInput').value.trim(), goal = parseMoney($('pocketGoalInput').value || '0'), opening = parseMoney($('pocketOpeningInput').value || '0'), owner = $('pocketOwnerInput').value;
  if (!name) return fieldError('pocketNameInput','ใส่ชื่อกระเป๋า');
  if (!Number.isFinite(goal) || goal < 0) return fieldError('pocketGoalInput','เป้าหมายต้องไม่ติดลบ');
  if (!Number.isFinite(opening) || opening < 0) return fieldError('pocketOpeningInput','ยอดเริ่มต้นต้องไม่ติดลบ');
  const pocketId = editingPocketId || id(), value = {id:pocketId,name,goal,openingBalance:opening,owner:owner === 'Tim' ? 'Tim' : 'Pao',needsReview:false,icon:$('pocketIconInput').value || '💰',projectId:$('pocketProjectInput').value || null};
  if (editingPocketId) state.pockets = state.pockets.map(pocket => pocket.id === pocketId ? {...pocket,...value} : pocket); else state.pockets.push(value);
  const returnToForm = pocketFromForm;
  try { save(); closePocketModal(); renderAll(); if (returnToForm) { $('pocket').value = pocketId; updateFormSummary(); } toastMsg('บันทึกกระเป๋าแล้ว'); } catch (error) { fieldError('pocketNameInput',error.message); }
}

function openBudget() {
  const book = budgetBook(); $('overallBudget').value = book.overall || 0; $('catBudFields').innerHTML = state.categories.expense.map((category,index) => `<div class="field" style="margin-bottom:8px"><label for="catBudget_${index}">${esc(category)}</label><input id="catBudget_${index}" class="input catb" data-cat="${esc(category)}" value="${book.categories[category] || ''}" placeholder="ไม่ตั้งงบ" inputmode="decimal"></div>`).join(''); renderUserLabels(); openModal('budgetModal','#overallBudget');
}

function saveBudget() {
  clearFieldErrors($('budgetModal')); const overall = parseMoney($('overallBudget').value || '0');
  if (!Number.isFinite(overall) || overall < 0) return fieldError('overallBudget','ใส่งบรวมที่ไม่ติดลบ');
  const categories = {}; for (const input of document.querySelectorAll('.catb')) { const amount = parseMoney(input.value || '0'); if (!Number.isFinite(amount) || amount < 0) return fieldError(input.id,'ใส่งบหมวดนี้ที่ไม่ติดลบ'); if (amount > 0) categories[input.dataset.cat] = amount; }
  state.settings.budgetsByUser[primaryUser()] = {overall,categories}; state.settings.overallBudget = overall; state.budgets = clone(categories);
  try { save(); closeBudget(); renderAll(); toastMsg(`บันทึกงบของ${who(primaryUser())}แล้ว`); } catch (error) { fieldError('overallBudget',error.message); }
}

function renderInstallments() {
  const user = primaryUser(), plans = state.recurring.filter(rec => rec.kind === 'installment');
  const row = (rec,manage) => { const remaining = rec.totalInstallments-rec.completedInstallments, balance = installmentRemaining(rec), nextShare = FinanceCore.economicShare(rec.template,user), controls = manage ? `<div class="installment-actions">${remaining ? `<button class="soft" onclick="toggleRec(${jsArg(rec.id)})">${rec.enabled ? 'พัก' : 'ทำต่อ'}</button>` : ''}<button class="danger" onclick="delRec(${jsArg(rec.id)})">${remaining ? 'ยกเลิกแผน' : 'ลบแผน'}</button></div>` : ''; return `<div class="installment-row"><div class="detail-head"><b>${esc(rec.template.note || rec.template.category || 'รายการผ่อน')}</b><b class="expense">${money(balance)}</b></div><small class="muted">ส่วนของ${who(user)}งวดถัดไป ${money(nextShare)} · ยอดเต็ม ${money(rec.template.amount)}</small><div class="progress"><div style="width:${rec.completedInstallments/rec.totalInstallments*100}%"></div></div><div class="detail-head"><span>เหลือ ${remaining} / ${rec.totalInstallments} งวด</span><span class="muted">บันทึกแล้ว ${rec.completedInstallments} งวด</span></div>${controls}</div>`; };
  const active = plans.filter(rec => rec.completedInstallments < rec.totalInstallments && Math.abs(FinanceCore.economicShare(rec.template,user)) > .001); $('homeInstallments').innerHTML = active.map(rec => row(rec,false)).join('') || '<p class="empty">ยังไม่มีรายการผ่อนของ User หลัก</p>'; if (plans.length) $('homeInstallments').innerHTML += '<button class="btn" onclick="openSettingsSection(\'installmentList\')">จัดการรายการผ่อน</button>'; $('installmentList').innerHTML = plans.map(rec => row(rec,true)).join('') || '<p class="empty">ยังไม่มีรายการผ่อน</p>';
}

function renderSettings() {
  $('userNamePao').value = userName('Pao'); $('userNameTim').value = userName('Tim'); $('primaryUserInput').value = primaryUser();
  $('payments').innerHTML = state.payments.map((payment,index) => `<div class="setrow"><div><b>${esc(payment)}</b><small class="muted" style="display:block">${payment === state.settings.defaultPayment ? 'ค่าเริ่มต้น' : ''}</small></div><div>${payment !== state.settings.defaultPayment ? `<button class="soft" onclick="setDefaultByIndex(${index})">ตั้งเป็นค่าเริ่มต้น</button>` : ''} ${state.payments.length > 1 && payment !== state.settings.defaultPayment ? `<button class="danger" onclick="removePayByIndex(${index})">ลบ</button>` : ''}</div></div>`).join('');
  $('pocketSettings').innerHTML = state.pockets.map(pocket => `<div class="setrow"><div><b>${esc(pocket.icon || '💰')} ${esc(pocket.name)} <span class="badge">${esc(who(pocket.owner))}</span>${pocket.needsReview ? '<span class="badge review-badge">ควรตรวจสอบ</span>' : ''}</b><small class="muted" style="display:block">${money(pocketBalance(pocket.id))} / ${money(pocket.goal)}</small></div><button class="soft" onclick="editPocket(${jsArg(pocket.id)})">แก้</button></div>`).join('') || '<div class="empty">ยังไม่มีกระเป๋าเงินเก็บ</div>';
  $('recList').innerHTML = state.recurring.filter(rec => rec.kind !== 'installment').map(rec => { const name = rec.template.note || rec.template.category || 'รายการประจำ'; return `<div class="setrow"><div><b>↻ ${esc(name)} · ${money(Math.abs(FinanceCore.economicShare(rec.template,primaryUser())))}</b><small class="muted" style="display:block">${esc(typeLabel(rec.template.type))}ประจำ · ส่วนของ${who(primaryUser())} · ครั้งถัดไป ${new Date(rec.nextRun).toLocaleString('th-TH')}</small></div><div><button class="soft" onclick="editRecurring(${jsArg(rec.id)})" aria-label="แก้ไขรายการประจำ ${esc(name)}">แก้ไข</button> <button class="switch ${rec.enabled ? 'on' : ''}" onclick="toggleRec(${jsArg(rec.id)})" aria-label="เปิดหรือพักรายการประจำ ${esc(name)}" aria-pressed="${rec.enabled ? 'true' : 'false'}"></button> <button class="danger" onclick="delRec(${jsArg(rec.id)})" aria-label="ลบรายการประจำ ${esc(name)}">ลบ</button></div></div>`; }).join('') || '<div class="empty">ยังไม่มีรายการประจำ</div>';
  const book = budgetBook(); $('budSettings').innerHTML = `<div class="setrow"><div><b>งบรวมของ${esc(who(primaryUser()))}</b><small class="muted" style="display:block">ใช้จริง ${money(totals().expense)}</small></div><b>${money(book.overall)}</b></div>` + Object.entries(book.categories).map(([category,limit]) => `<div class="setrow"><div>${esc(category)}</div><b>${money(limit)}</b></div>`).join('');
  $('projectSettings').innerHTML = state.projects.map(project => `<div class="setrow"><div><b>${esc(project.icon || '▣')} ${esc(project.name)}</b><small class="muted" style="display:block">งบรวม ${money(project.budgetTotal || project.budget)} · ส่วนของ${who(primaryUser())} ${project.budgetShares ? money(project.budgetShares[primaryUser()]) : 'ยังไม่ตั้ง'}</small></div><button class="soft" onclick="editProject(${jsArg(project.id)})">แก้</button></div>`).join('') || '<div class="empty">ยังไม่มีโปรเจกต์</div>';
  $('themeSwitch').classList.toggle('on',state.settings.theme === 'dark'); $('homeIncomeSwitch').classList.toggle('on',state.settings.hideIncomeHome !== false); renderUserLabels();
}

function setPeriod(value) {
  if (!/^\d{4}-\d{2}$/.test(value)) return;
  selectedMonth = value; historyPeriod = value; renderAll();
}

function renderPeriodOptions() {
  document.querySelectorAll('[data-period]').forEach(element => element.value = selectedMonth);
  const months = new Set([selectedMonth,monthKey(new Date()),...state.transactions.map(tx => monthKey(tx.datetime))]);
  $('historyPeriod').innerHTML = '<option value="all">ทุกช่วงเวลา</option>' + [...months].filter(Boolean).sort().reverse().map(month => `<option value="${month}">${formatMonth(month)}</option>`).join('');
  if (![...$('historyPeriod').options].some(option => option.value === historyPeriod)) historyPeriod = selectedMonth;
  $('historyPeriod').value = historyPeriod;
}

function openTx(txid) {
  const tx = state.transactions.find(item => item.id === txid); if (!tx) return;
  detailTxId = txid; const label = tx.note || tx.category || typeLabel(tx.type); $('txModalTitle').textContent = label;
  const fields = [['ประเภท',typeLabel(tx.type)],['วันที่',new Date(tx.datetime).toLocaleString('th-TH')],['ยอดเต็ม',money(Math.abs(tx.amount))]];
  if (tx.type === 'expense') { const shares = FinanceCore.expenseShares(tx), paid = FinanceCore.expensePaid(tx), delta = FinanceCore.debtDeltaPao(tx); fields.push([`ส่วนของ${who('Pao')}`,money(shares.Pao)],[`ส่วนของ${who('Tim')}`,money(shares.Tim)],[`${who('Pao')}จ่ายจริง`,money(paid.Pao)],[`${who('Tim')}จ่ายจริง`,money(paid.Tim)],['ผลต่อยอดค้าง',delta === 0 ? 'ไม่เพิ่มยอดค้าง' : `${delta > 0 ? who('Tim')+'ค้าง'+who('Pao') : who('Pao')+'ค้าง'+who('Tim')} ${money(Math.abs(delta))}`]); }
  else if (tx.type === 'income') { const shares = FinanceCore.incomeShares(tx); fields.push([`ส่วนของ${who('Pao')}`,money(shares.Pao)],[`ส่วนของ${who('Tim')}`,money(shares.Tim)]); }
  else if (tx.type === 'saving') for (const allocation of FinanceCore.savingAllocations(tx)) fields.push([`${tx.direction === 'out' ? 'ถอนของ' : 'ออมของ'}${who(allocation.user)}`,`${money(allocation.amount)} · ${pocketById(allocation.pocketId)?.name || 'กระเป๋าเดิม'}`]);
  else fields.push(['คืนเงิน',`${who(tx.from)} → ${who(tx.to)}`]);
  const source = transactionSource(tx); if (source) fields.push(['ที่มา',source.label]);
  if (tx.projectId) fields.push(['โปรเจกต์',projectById(tx.projectId)?.name || 'โปรเจกต์เดิม']); if (tx.needsReview) fields.push(['สถานะ','รายการจากข้อมูลเดิม ควรตรวจสอบส่วนแบ่ง']);
  $('txDetailContent').innerHTML = `<dl class="tx-info">${fields.map(([name,value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`; $('txEditButton').hidden = tx.type === 'settlement'; $('txEditButton').setAttribute('aria-label','แก้ไข '+label); $('txDeleteButton').setAttribute('aria-label','ลบ '+label); openModal('txModal');
}

function deleteTx(txid) {
  const tx = state.transactions.find(item => item.id === txid); if (!tx) return;
  const before = debtFor(), after = FinanceCore.fromCents(FinanceCore.toCents(before)-FinanceCore.toCents(FinanceCore.debtDeltaPao(tx)));
  const affectsDebt = Math.abs(FinanceCore.debtDeltaPao(tx)) > .001;
  const message = affectsDebt ? `ลบ ${tx.note || tx.category || 'รายการนี้'}? ยอดค้างสุทธิจะเปลี่ยนจาก ${money(Math.abs(before))} เป็น ${money(Math.abs(after))}` : `ลบ ${tx.note || tx.category || 'รายการนี้'} ${money(Math.abs(tx.amount))}?`;
  if (!confirm(message)) return;
  state.transactions = state.transactions.filter(item => item.id !== txid);
  try { save(); removeDraft(txid); if (visibleModal()) closeTopModal(); renderAll(); toastMsg('ลบรายการแล้ว',() => { if (!state.transactions.some(item => item.id === tx.id)) state.transactions.push(tx); save(); renderAll(); }); } catch (error) { toastMsg(error.message); }
}

function transactionExportRows() {
  return [['datetime','type','gross_amount','category','payment','pao_share','tim_share','pao_paid','tim_paid','saving_direction','saving_allocations','project','settlement_from','settlement_to','needs_review','note'],...state.transactions.map(tx => { const shares = tx.type === 'expense' ? FinanceCore.expenseShares(tx) : tx.type === 'income' ? FinanceCore.incomeShares(tx) : {Pao:'',Tim:''}, paid = tx.type === 'expense' ? FinanceCore.expensePaid(tx) : {Pao:'',Tim:''}; return [tx.datetime,tx.type,tx.amount,tx.category || '',tx.payment || '',shares.Pao,shares.Tim,paid.Pao,paid.Tim,tx.direction || '',tx.type === 'saving' ? FinanceCore.savingAllocations(tx).map(item => `${item.user}:${item.amount}:${pocketById(item.pocketId)?.name || item.pocketId}`).join('|') : '',projectById(tx.projectId)?.name || '',tx.from || '',tx.to || '',tx.needsReview ? 'yes' : '',tx.note || '']; })];
}

function exportCSV() {
  const csv = transactionExportRows().map(row => row.map(value => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
  download('\ufeff'+csv,'pao-tim-money-v6.csv','text/csv;charset=utf-8');
}

async function exportGoogleSheets() {
  const sheet = window.open('https://sheets.new','_blank');
  if (sheet) sheet.opener = null;
  const tsv = transactionExportRows().map(row => row.map(value => String(value).replace(/[\t\r\n]+/g,' ')).join('\t')).join('\n');
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
    await navigator.clipboard.writeText(tsv);
    toastMsg(sheet ? 'เปิด Google Sheets แล้ว — กด Ctrl+V หรือวางที่ช่อง A1' : 'คัดลอกข้อมูลแล้ว — อนุญาตหน้าต่างใหม่ แล้วกดปุ่มนี้อีกครั้ง');
  } catch (_) {
    exportCSV();
    toastMsg(sheet ? 'เปิด Google Sheets แล้ว — นำเข้าไฟล์ CSV ที่ดาวน์โหลด' : 'ดาวน์โหลด CSV แล้ว — เปิดหรือนำเข้าใน Google Sheets ได้เลย');
  }
}

function backup() {
  const when = new Date().toISOString();
  download(JSON.stringify({...state,backupMeta:{version:6,createdAt:when}},null,2),`pao-tim-backup-v6-${when.slice(0,10)}.json`,'application/json');
  try { localStorage.setItem(BACKUP_TIME_KEY,when); } catch (_) {}
  renderBackupStatus(); toastMsg('สร้างไฟล์สำรอง v6 แล้ว');
}

function renderAll() {
  renderPays(); renderSelects(); renderCats(); renderPeriodOptions(); renderHome(); renderHistory(); renderSummary(); renderProjects(); renderSettings(); renderInstallments(); updateSplit(); updateFormSummary(); syncA11yState(); syncAddControls(); syncBackButton(); renderBackupStatus(); renderDraftNotice(); renderUserLabels();
  $('localNotice').hidden = !!state.settings.localNoticeDismissed; $('homePocketsCard').hidden = !state.pockets.some(pocket => pocket.owner === primaryUser()); $('homeRecurringCard').hidden = !state.recurring.some(rec => rec.kind !== 'installment' && rec.enabled && Math.abs(FinanceCore.economicShare(rec.template,primaryUser())) > .001); $('homeProjectsCard').hidden = !state.projects.some(project => project.status === 'Active'); $('setupCard').hidden = state.pockets.length > 0 && state.recurring.length > 0 && state.projects.length > 0; $('quickCard').hidden = !$('quick').querySelector('.quick'); $('monthLabel').textContent = formatMonth(selectedMonth);
}

document.addEventListener('input',event => {
  if (['projectBudgetPaoInput','projectBudgetTimInput'].includes(event.target?.id)) updateProjectPreview();
});
document.addEventListener('change',event => {
  if (event.target?.id === 'pocketOwnerInput') updatePocketPreview();
});
