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
let form={type:'expense',payer:'Pao',owner:'Pao',incOwner:'Pao',savOwner:'Pao',split:'half',recurring:false,editId:null,catExpanded:false};
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
function handleAddControl() { openAdd(); }
function show(view, options = {}) {
  if (!['home','history','summary','projects','settings','add'].includes(view)) return;
  if (visibleModal()) closeTopModal();
  const previous = currentView();
  viewScroll[previous] = window.scrollY;
  if (previous === 'add' && !options.saved) stashDraft();
  if (!options.fromPop && !restoringRoute) {
    history.replaceState({...route, scroll:window.scrollY, app:'pt-money'}, '', location.href);
    route = {app:'pt-money', view, detail:options.detail || (view === 'add' ? 'form' : null), from:options.from || (view === 'add' ? previous : null), editId:view === 'add' ? form.editId : null, scroll:options.restore ? (viewScroll[view] || 0) : 0};
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
function openHistory(type = 'all') {
  $('typeFilter').value = type;
  $('ownerFilter').value = 'all';
  $('search').value = '';
  $('projectFilter').value = 'all';
  historyPeriod = selectedMonth;
  renderPeriodOptions();
  show('history', {detail:'period', from:currentView()});
}
function openAddSheet(){openModal('addSheet','.sheet-option')}
function closeAddSheet(){closeModal('addSheet')}
function startAdd(type='expense'){closeAddSheet();openAdd(type)}
function openAdd(typeOrRecurring = 'expense', withRecurring = false) {
  const type = typeof typeOrRecurring === 'boolean' ? 'expense' : typeOrRecurring || 'expense';
  const recurring = typeof typeOrRecurring === 'boolean' ? typeOrRecurring : withRecurring;
  const previous = currentView() === 'add' ? route.from || 'home' : currentView();
  resetForm();
  if (!restoreDraft('new')) {
    setType(type);
    if (recurring) { toggleRecurring(true); $('optionalDetails').open = true; }
    formBaseline = draftSignature();
  }
  show('add', {from:previous});
  if (!form.editId && !$('amount').value) $('amount').focus({preventScroll:true});
}
document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>b.dataset.view==='add'?handleAddControl():show(b.dataset.view)));
document.addEventListener('click',e=>{const cat=e.target.closest?.('[data-cat-choice]');if(cat){setCategory(cat.dataset.catChoice);return}if(e.target.closest?.('[data-cat-toggle]'))toggleCats()});
function toggleCard(id){const el=$(id);if(!el)return;el.classList.toggle('expanded');syncA11yState()}
function projectById(id){return state.projects.find(p=>p.id===id)}
function pocketById(id){return state.pockets.find(p=>p.id===id)}
function currentMonthTx() { return state.transactions.filter(t => monthKey(t.datetime) === selectedMonth); }
function totals(){const x=currentMonthTx(),income=x.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),expense=x.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),saving=x.filter(t=>t.type==='saving').reduce((s,t)=>s+t.amount,0);return{income,expense,saving,available:income-expense-saving,rate:income?saving/income*100:0}}
function pocketBalance(pid){const p=pocketById(pid);return Number(p?.openingBalance||0)+state.transactions.filter(t=>t.type==='saving'&&t.pocketId===pid).reduce((s,t)=>s+t.amount,0)}
function projectSpend(pid,monthOnly=false){const list=(monthOnly?currentMonthTx():state.transactions).filter(t=>t.type==='expense'&&t.projectId===pid);return list.reduce((s,t)=>s+t.amount,0)}
function projectSaving(pid){const linkedPocketIds=new Set(state.pockets.filter(p=>p.projectId===pid).map(p=>p.id));const pocketTotal=[...linkedPocketIds].reduce((s,pid)=>s+pocketBalance(pid),0);const directTotal=state.transactions.filter(t=>t.type==='saving'&&t.projectId===pid&&!linkedPocketIds.has(t.pocketId)).reduce((s,t)=>s+t.amount,0);return pocketTotal+directTotal}
function debtFor(list=state.transactions){let b=0;list.forEach(t=>{if(t.type==='expense'){if(t.payer==='Pao')b+=t.split?.Tim||0;if(t.payer==='Tim')b-=t.split?.Pao||0}else if(t.type==='settlement'){if(t.from==='Tim'&&t.to==='Pao')b-=t.amount;if(t.from==='Pao'&&t.to==='Tim')b+=t.amount}});return b}
function debtTx(){const expenseRows=state.transactions.filter(t=>t.type==='expense').map(t=>({...t,timOwes:t.payer==='Pao'?Number(t.split?.Tim||0):0,paoOwes:t.payer==='Tim'?Number(t.split?.Pao||0):0}));const settlementRows=state.transactions.filter(t=>t.type==='settlement').map(t=>({...t,timOwes:t.from==='Pao'&&t.to==='Tim'?Number(t.amount||0):0,paoOwes:t.from==='Tim'&&t.to==='Pao'?Number(t.amount||0):0,settlement:true}));return [...expenseRows,...settlementRows].filter(t=>t.timOwes>0||t.paoOwes>0).sort((a,b)=>new Date(b.datetime)-new Date(a.datetime))}
function icon(t){if(t.type==='settlement')return '✓';if(t.type==='saving')return '💰';const m={'อาหาร':'🍚','กาแฟ / เครื่องดื่ม':'☕','เดินทาง':'🚗','Shopping':'🛍️','Subscription':'📱','เงินเดือน':'💼','ท่องเที่ยว':'✈️','ที่พัก':'🏨','Entertainment':'🎢','สุขภาพ':'🏥'};return m[t.category]||(t.type==='income'?'💵':'🧾')}
function txrow(t) {
  const title = t.note || t.category || (t.type === 'settlement' ? 'บันทึกคืนเงิน' : 'เงินเก็บ');
  const sign = t.type === 'income' ? '+' : t.type === 'saving' ? (t.amount < 0 ? '←' : '→') : t.type === 'settlement' ? '✓' : '−';
  const cls = t.type === 'income' ? 'income' : t.type === 'expense' ? 'expense' : 'saving';
  const owner = t.type === 'settlement' ? `${who(t.from)} → ${who(t.to)}` : who(t.owner);
  const date = new Date(t.datetime).toLocaleDateString('th-TH', {day:'numeric',month:'short'});
  const project = projectById(t.projectId), pocket = pocketById(t.pocketId);
  const tag = t.type === 'saving' && pocket ? pocket.name : project?.name;
  return `<button class="tx ${t.id === highlightTxId ? 'tx-highlight' : ''}" data-tx-id="${esc(t.id)}" onclick="openTx(${jsArg(t.id)})" aria-label="${esc(`ดู ${title} ${money(Math.abs(t.amount))} ${owner}`)}"><span class="ico" aria-hidden="true">${icon(t)}</span><span><span class="tx-title">${esc(title)}</span><span class="tx-meta">${esc(owner)} · ${date}${t.recurringGenerated ? ' · ประจำ' : ''}</span>${tag ? `<span class="tx-tags"><span class="badge project-badge">${esc(tag)}</span></span>` : ''}</span><span class="amt ${cls}">${sign}${money(Math.abs(t.amount))}</span></button>`;
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
  const existing = state.transactions.find(t => t.id === form.editId);
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
  if (changed) { form.catExpanded = false; $('cat').value = ''; $('categorySearch').value = ''; }
  for (const [id, value] of [['expTab','expense'],['incTab','income'],['savTab','saving']]) $(id).classList.toggle('active', value === type);
  document.querySelectorAll('.expOnly,.incOnly,.savingOnly,.nonSaving').forEach(el => {
    const visible = el.classList.contains('expOnly') ? type === 'expense' : el.classList.contains('incOnly') ? type === 'income' : el.classList.contains('savingOnly') ? type === 'saving' : type !== 'saving';
    el.style.display = visible ? 'grid' : 'none';
  });
  $('payLabel').textContent = type === 'saving' ? 'เงินออกจากไหน' : type === 'income' ? 'รับผ่าน' : 'จ่ายผ่าน';
  $('formTitle').textContent = (form.editId ? 'แก้ไข' : 'เพิ่ม') + typeLabel(type);
  $('formSubtitle').textContent = form.editId ? 'แก้เฉพาะรายการนี้ รายการประจำรอบอื่นคงเดิม' : type === 'expense' ? 'ระบุยอดและคนที่แบ่งค่าใช้จ่าย' : type === 'saving' ? 'แยกเงินไว้ในกระเป๋าออม' : 'บันทึกเงินที่ได้รับ';
  $('recurringField').hidden = !!form.editId || (type === 'saving' && form.savingDirection === 'out');
  clearFieldErrors();
  renderCats(); renderSelects(); updateSplit(); updateFormSummary(); syncA11yState();
}
function bindChoice(attr,key){document.querySelectorAll(`[data-${attr}]`).forEach(b=>b.addEventListener('click',()=>{form[key]=b.dataset[attr];document.querySelectorAll(`[data-${attr}]`).forEach(x=>x.classList.toggle('active',x===b));updateSplit();updateFormSummary();syncA11yState()}))}
bindChoice('payer','payer');bindChoice('owner','owner');bindChoice('incowner','incOwner');bindChoice('savowner','savOwner');bindChoice('split','split');
function updateSplit(){$('splitBox').classList.toggle('show',form.type==='expense'&&form.owner==='Both');$('customSplit').style.display=form.type==='expense'&&form.owner==='Both'&&form.split==='custom'?'grid':'none'}
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
  $('saveTxButton').textContent = `${form.editId ? 'บันทึกการแก้ไข' : 'บันทึก' + typeLabel(form.type)}${amount > 0 ? ' ' + money(amount) : ''}`;
  if (form.type === 'saving') $('payLabel').textContent = form.savingDirection === 'out' ? 'ถอนกลับไปที่' : 'เงินออกจากไหน';
  $('savingIn').classList.toggle('active',form.savingDirection !== 'out');
  $('savingOut').classList.toggle('active',form.savingDirection === 'out');
  $('savingIn').setAttribute('aria-pressed',String(form.savingDirection !== 'out'));
  $('savingOut').setAttribute('aria-pressed',String(form.savingDirection === 'out'));
  $('pocketBalanceHint').textContent = pocketById($('pocket').value) ? 'ยอดคงเหลือ ' + money(pocketBalance($('pocket').value)) : '';
}
function toggleRecurring(force) {
  form.recurring = typeof force === 'boolean' ? force : !form.recurring;
  $('recSwitch').classList.toggle('on',form.recurring); $('recBox').classList.toggle('show',form.recurring);
  if (form.recurring && !$('nextRun').value) {
    const next = {nextRun:new Date().toISOString(),frequency:$('freq').value,dayOfMonth:new Date().getDate()};
    advance(next); $('nextRun').value = ldt(new Date(next.nextRun));
  }
  syncA11yState();
}
function resetForm() {
  restoringDraft = true;
  form = {type:'expense',payer:'Pao',owner:'Pao',incOwner:'Pao',savOwner:'Pao',split:'half',recurring:false,editId:null,catExpanded:false,savingDirection:'in'};
  for (const key of ['amount','note','ps','ts','nextRun','cat','categorySearch']) $(key).value = '';
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
  const date = new Date($('dt').value);
  if (!Number.isFinite(date.getTime())) return fieldError('dt', 'เลือกวันที่และเวลาให้ครบ');
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
  if (!existing && form.recurring && !(form.type === 'saving' && form.savingDirection === 'out')) {
    const next = new Date($('nextRun').value);
    if (!Number.isFinite(next.getTime()) || next.getTime() <= Date.now()) return fieldError('nextRun', 'เลือกเวลารอบถัดไปหลังจากเวลาปัจจุบัน');
    recurring = {id:id(),enabled:true,frequency:$('freq').value,nextRun:next.toISOString(),dayOfMonth:next.getDate(),template:{...tx,id:null,datetime:null,recurringId:null,recurringGenerated:false}};
  }
  savingTx = true; $('saveTxButton').disabled = true;
  const draftKey = form.editId || 'new';
  const target = route.from && route.from !== 'add' ? route.from : existing ? 'history' : 'home';
  const oldTx = existing ? clone(existing) : null;
  try {
    if (existing) state.transactions = state.transactions.map(t => t.id === tx.id ? tx : t);
    else state.transactions.push(tx);
    if (recurring) state.recurring.push(recurring);
    save();
    removeDraft(draftKey);
    highlightTxId = tx.id;
    resetForm(); show(target, {replace:true,restore:!!existing,saved:true});
    toastMsg(existing ? 'บันทึกการแก้ไขแล้ว' : `บันทึก ${money(amount)} แล้ว`, () => {
      state.transactions = oldTx ? state.transactions.map(t => t.id === tx.id ? oldTx : t) : state.transactions.filter(t => t.id !== tx.id);
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
function checkRecurring(){let c=0,now=Date.now();state.recurring.forEach(r=>{let g=0;while(r.enabled&&new Date(r.nextRun).getTime()<=now&&g<24){state.transactions.push({...clone(r.template),id:id(),datetime:r.nextRun,recurringId:r.id,recurringGenerated:true});advance(r);c++;g++}});if(c){save();renderAll();toastMsg(`บันทึกรายการประจำอัตโนมัติ ${c} รายการ`)}}
setInterval(() => { try { checkRecurring(); } catch (_) {} },60000);
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
  const from = net > 0 ? 'Tim' : 'Pao', to = net > 0 ? 'Pao' : 'Tim', amount = Math.abs(net);
  if (!confirm(`บันทึกว่า${who(from)}คืนเงินให้${who(to)} ${money(amount)} แล้ว? ปุ่มนี้ไม่ได้โอนเงินจริง`)) return;
  const tx = {id:id(),type:'settlement',amount,datetime:new Date().toISOString(),from,to,note:`คืนเงิน ${who(from)} → ${who(to)}`};
  state.transactions.push(tx);
  save(); renderAll();
  toastMsg('บันทึกการคืนเงินแล้ว', () => { state.transactions = state.transactions.filter(t => t.id !== tx.id); save(); renderAll(); });
}
function renderHomeProjects() {
  $('homeProjects').innerHTML = state.projects.filter(p => p.status === 'Active').slice(0,3).map(project => `<button class="tx" onclick="openProject(${jsArg(project.id)})"><span class="ico" aria-hidden="true">${esc(project.icon || '▣')}</span><span><span class="tx-title">${esc(project.name)}</span><span class="tx-meta">ใช้ทั้งหมด ${money(projectSpend(project.id))}</span></span><span aria-hidden="true">›</span></button>`).join('');
}
function renderHome(){
 const t=totals(),hideIncome=state.settings.hideIncomeHome!==false;
 $('monthLabel').textContent=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date());
 $('homeMetrics')?.classList.toggle('privacy-on',hideIncome);
 if($('availableCard'))$('availableCard').hidden=hideIncome;
 if($('incomeCard'))$('incomeCard').hidden=hideIncome;
 $('available').textContent=money(t.available);
 $('income').textContent=money(t.income);
 $('expense').textContent=money(t.expense);
 $('saving').textContent=money(t.saving);
 $('rate').textContent=hideIncome?'':`อัตราเงินเก็บ ${t.rate.toFixed(1)}%`;
 const visibleTx=currentMonthTx().filter(x=>!hideIncome||x.type!=='income'),r=[...visibleTx].sort((a,b)=>new Date(b.datetime)-new Date(a.datetime)).slice(0,6);
 $('recent').innerHTML=r.map(x=>txrow(x)).join('')||'<div class="empty">ยังไม่มีรายการที่แสดงในหน้าแรก<br><button class="soft" onclick="openAdd()">＋ เพิ่มรายการแรก</button></div>';
 const uq=[];
 for(const x of r){if(x.type==='settlement')continue;if(!uq.some(y=>y.type===x.type&&y.note===x.note))uq.push(x);if(uq.length===4)break}
 $('quick').innerHTML=uq.map(x=>`<div class="quick"><button class="quick-main" onclick="quickAddNow('${x.id}')"><b>${icon(x)} ${esc(x.note||x.category||'เงินเก็บ')}</b><small>${money(x.amount)} • แตะเพื่อบันทึกซ้ำ</small></button><button class="quick-edit" onclick="quickAdd('${x.id}')">แก้ก่อนบันทึก</button></div>`).join('')||'<div class="empty">เพิ่มรายการสักครั้งก่อน แล้วรายการที่ใช้ซ้ำบ่อยจะมาอยู่ตรงนี้<br><button class="soft" onclick="openAdd()">＋ เพิ่มรายการ</button></div>';
 renderPockets();
 const recur=state.recurring.filter(r=>r.enabled&&(!hideIncome||r.template.type!=='income')).sort((a,b)=>new Date(a.nextRun)-new Date(b.nextRun)).slice(0,4);
 $('homeRecurring').innerHTML=recur.map(r=>`<div class="setrow"><div><b>↻ ${r.template.type==='saving'?'💰 ':''}${esc(r.template.note||r.template.category||'เงินเก็บ')}</b><small class="muted" style="display:block">${r.frequency==='daily'?'ทุกวัน':r.frequency==='weekly'?'ทุกสัปดาห์':'ทุกเดือน'} • ครั้งถัดไป ${new Date(r.nextRun).toLocaleDateString('th-TH')}</small></div><b class="${r.template.type==='saving'?'saving':'expense'}">${money(r.template.amount)}</b></div>`).join('')||'<div class="empty">ยังไม่มีรายการประจำ<br><button class="soft" onclick="openAdd(true)">＋ ตั้งรายการประจำ</button></div>';
 renderBudget();renderDebt();renderHomeProjects();
}
function renderHistory() {
  historyPeriod = $('historyPeriod').value || historyPeriod;
  const query = $('search').value.trim().toLowerCase(), type = $('typeFilter').value, owner = $('ownerFilter').value, project = $('projectFilter').value;
  const list = [...state.transactions].filter(t => (historyPeriod === 'all' || monthKey(t.datetime) === historyPeriod) && (type === 'all' || t.type === type) && (owner === 'all' || t.owner === owner) && (project === 'all' || (project === 'none' ? !t.projectId : t.projectId === project)) && (!query || `${t.note || ''} ${t.category || ''} ${t.payment || ''} ${projectById(t.projectId)?.name || ''} ${pocketById(t.pocketId)?.name || ''}`.toLowerCase().includes(query))).sort((a,b) => new Date(b.datetime) - new Date(a.datetime));
  let day = '';
  $('historyList').innerHTML = list.map(t => {
    const date = new Date(t.datetime).toLocaleDateString('th-TH', {day:'numeric',month:'long',year:'numeric'});
    const heading = date !== day ? `<h2 class="date-heading">${date}</h2>` : '';
    day = date;
    return heading + txrow(t);
  }).join('') || '<div class="empty">ไม่พบรายการตามเงื่อนไขนี้<button class="btn" onclick="clearHistoryFilters()">ล้างตัวกรอง</button></div>';
  $('historyCount').textContent = `${list.length} รายการ · ${historyPeriod === 'all' ? 'ทุกช่วงเวลา' : formatMonth(historyPeriod)}`;
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
function renderSettings(){$('payments').innerHTML=state.payments.map((p,i)=>`<div class="setrow"><div><b>${esc(p)}</b><small class="muted" style="display:block">${p===state.settings.defaultPayment?'ค่าเริ่มต้น':''}</small></div><div>${p!==state.settings.defaultPayment?`<button class="soft" onclick="setDefaultByIndex(${i})">ตั้งเป็นค่าเริ่มต้น</button>`:''} ${state.payments.length>1&&p!==state.settings.defaultPayment?`<button class="danger" onclick="removePayByIndex(${i})">ลบ</button>`:''}</div></div>`).join('');$('pocketSettings').innerHTML=state.pockets.map(p=>`<div class="setrow"><div><b>${esc(p.icon||'💰')} ${esc(p.name)}</b><small class="muted" style="display:block">${money(pocketBalance(p.id))} / ${money(p.goal)}${p.projectId&&projectById(p.projectId)?` • ${esc(projectById(p.projectId).name)}`:''}</small></div><button class="soft" onclick="editPocket('${p.id}')">แก้</button></div>`).join('')||'<div class="empty">ยังไม่มีกระเป๋าเงินเก็บ</div>';$('recList').innerHTML=state.recurring.map(r=>`<div class="setrow"><div><b>↻ ${r.template.type==='saving'?'💰 ':''}${esc(r.template.note||r.template.category||'เงินเก็บ')} • ${money(r.template.amount)}</b><small class="muted" style="display:block">${r.frequency==='daily'?'ทุกวัน':r.frequency==='weekly'?'ทุกสัปดาห์':'ทุกเดือน'} • ${new Date(r.nextRun).toLocaleString('th-TH')}</small></div><div><button class="switch ${r.enabled?'on':''}" onclick="toggleRec('${r.id}')" type="button" aria-label="เปิดหรือปิดรายการประจำนี้" aria-pressed="${r.enabled?'true':'false'}"></button> <button class="danger" onclick="delRec('${r.id}')">ลบ</button></div></div>`).join('')||'<div class="empty">ยังไม่มีรายการประจำ</div>';$('budSettings').innerHTML=`<div class="setrow"><div><b>งบรวม</b><small class="muted" style="display:block">ใช้จริง ${money(totals().expense)}</small></div><b>${money(state.settings.overallBudget)}</b></div>`+Object.entries(state.budgets).map(([k,v])=>{const used=currentMonthTx().filter(x=>x.type==='expense'&&x.category===k).reduce((s,x)=>s+x.amount,0);return `<div class="setrow"><div>${esc(k)}<small class="muted" style="display:block">ใช้ ${money(used)}</small></div><b>${money(v)}</b></div>`}).join('');$('projectSettings').innerHTML=state.projects.map(p=>`<div class="setrow"><div><b>${esc(p.icon||'▣')} ${esc(p.name)}</b><small class="muted" style="display:block">${esc(statusLabel(p.status))} • งบ ${money(p.budget)}</small></div><button class="soft" onclick="editProject('${p.id}')">แก้</button></div>`).join('')||'<div class="empty">ยังไม่มีโปรเจกต์</div>';$('themeSwitch').classList.toggle('on',state.settings.theme==='dark');$('homeIncomeSwitch')?.classList.toggle('on',state.settings.hideIncomeHome!==false)}
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
function toggleRec(rid){const r=state.recurring.find(x=>x.id===rid);if(r){r.enabled=!r.enabled;save();renderAll()}}
function delRec(rid){if(!confirm('ลบรายการประจำนี้?'))return;state.recurring=state.recurring.filter(x=>x.id!==rid);save();renderAll()}
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
  updateSplit(); updateFormSummary(); syncA11yState(); syncAddControls(); syncBackButton(); renderBackupStatus(); renderDraftNotice();
  $('localNotice').hidden = !!state.settings.localNoticeDismissed;
  $('homePocketsCard').hidden = !state.pockets.length;
  $('homeRecurringCard').hidden = !state.recurring.some(r => r.enabled && (state.settings.hideIncomeHome === false || r.template.type !== 'income'));
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
let selectedMonth = monthKey(new Date()), historyPeriod = 'all';
let route = {app:'pt-money',view:'home',detail:null,from:null,scroll:0};
const viewScroll = {}, quickGuard = new Map();
const draftFields = ['amount','dt','cat','project','pay','pocket','savingProject','ps','ts','note','freq','nextRun'];
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
  const key = form.editId || 'new';
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
  if (key !== 'new' && !state.transactions.some(t => t.id === key)) { removeDraft(key); return false; }
  restoringDraft = true;
  form = {...form,...draft.form};
  setType(form.type); renderPays(); renderSelects();
  for (const field of draftFields) if (typeof draft.values[field] === 'string') $(field).value = draft.values[field];
  $('optionalDetails').open = !!draft.optional;
  toggleRecurring(!!form.recurring); syncChoices(); renderCats(); updateSplit(); updateFormSummary();
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
  const drafts = Object.values(draftCache).filter(x => x?.form && (x.form.editId ? state.transactions.some(t => t.id === x.form.editId) : true)).sort((a,b) => b.updatedAt-a.updatedAt);
  $('draftNotice').hidden = !drafts.length;
  if (drafts.length) $('draftDescription').textContent = `${typeLabel(drafts[0].form.type)} ${drafts[0].values.amount ? money(parseMoney(drafts[0].values.amount) || 0) : ''} · เก็บแบบร่างในแท็บนี้`;
}
function resumeLatestDraft() {
  const drafts = Object.entries(draftCache).filter(([,x]) => x?.form).sort((a,b) => b[1].updatedAt-a[1].updatedAt);
  if (!drafts.length) return;
  const [key,draft] = drafts[0];
  if (key === 'new') openAdd(draft.form.type); else editTx(key);
}
function clearForm() {
  if (draftSignature() !== formBaseline && !confirm(form.editId ? 'คืนค่าฟอร์มเป็นข้อมูลที่บันทึกไว้? การแก้ไขในแบบร่างนี้จะถูกล้าง' : 'ล้างข้อมูลที่กรอกในฟอร์มนี้?')) return;
  const editId = form.editId;
  removeDraft(editId || 'new');
  if (editId) editTx(editId); else resetForm();
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
  input.recurring.forEach(rec => { if (!['daily','weekly','monthly'].includes(rec.frequency) || !Number.isFinite(new Date(rec.nextRun).getTime()) || !rec.template) invalid(); validateTx(rec.template,true); });
  input.pockets.forEach(p => { if (typeof p.name !== 'string' || !validNumber(p.goal ?? 0) || !validNumber(p.openingBalance ?? 0) || Number(p.goal) < 0 || Number(p.openingBalance) < 0) invalid(); });
  input.projects.forEach(p => { if (typeof p.name !== 'string' || !validNumber(p.budget ?? 0) || Number(p.budget) < 0 || !['Planning','Active','Completed','Archived'].includes(p.status)) invalid(); });
  if (!validNumber(input.settings.overallBudget ?? 0) || Number(input.settings.overallBudget) < 0 || Object.values(input.budgets).some(n => !validNumber(n) || Number(n) < 0)) invalid();
  return normalizeState(input);
}
function presentRestore(candidate, filename, createdAt, rollback) {
  pendingRestore = {candidate,rollback};
  $('restoreTitle').textContent = rollback ? 'ย้อนกลับไปก่อนกู้คืน' : 'ตรวจสอบก่อนกู้คืน';
  $('restoreFileName').textContent = filename + (createdAt && Number.isFinite(new Date(createdAt).getTime()) ? ' · ' + new Date(createdAt).toLocaleString('th-TH') : ' · ไฟล์นี้ไม่ระบุเวลาสำรอง');
  const summary = (label,value) => `<div><b>${label}</b><p>${value.transactions.length} รายการ</p><small>${value.pockets.length} กระเป๋า · ${value.projects.length} โปรเจกต์</small><small>${value.recurring.length} รายการประจำ</small></div>`;
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
  if (event.target.closest('[data-payer],[data-owner],[data-incowner],[data-savowner],[data-split],#recSwitch,#expTab,#incTab,#savTab')) stashDraft();
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
    if (route.editId && state.transactions.some(t => t.id === route.editId)) editTx(route.editId);
    else openAdd();
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
    if (route.editId && state.transactions.some(tx => tx.id === route.editId)) editTx(route.editId);
    else openAdd();
  } else show(initialView,{fromPop:true});
  restoringRoute = false;
} else if (['history','summary','projects','settings'].includes(initialView)) show(initialView,{replace:true});
else if (initialView === 'add') openAdd();
else history.replaceState(route,'','#home');
syncAddControls(); updateViewportInsets();
