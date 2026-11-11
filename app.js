
(()=>{'use strict';

const $=id=>document.getElementById(id);
const KEY='hb_ledger_tx_v1',CFG='hb_ledger_cfg_v1';
const fmt=n=>new Intl.NumberFormat('fa-IR').format(Math.round(Number(n)||0));
const money=n=>fmt(n)+' ریال';
const labels={purchase:'خرید',sale:'فروش',receipt:'دریافت',payment:'پرداخت',expense:'هزینه'};
let tx=JSON.parse(localStorage.getItem(KEY)||'[]'),client=null,user=null,session=null;
let cashType='receipt';

const save=()=>localStorage.setItem(KEY,JSON.stringify(tx));
const active=()=>tx.filter(x=>!x.deleted_at);
const cfg=()=>JSON.parse(localStorage.getItem(CFG)||'{}');
const pad=n=>String(n).padStart(2,'0');

function digits(s){
 return String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
 .replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}
function gregorianToJalali(gy,gm,gd){
 const gdm=[0,31,((gy%4===0&&gy%100!==0)||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
 let gy2=gm>2?gy+1:gy;
 let days=355666+365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)+gd;
 for(let i=0;i<gm;i++)days+=gdm[i];
 let jy=-1595;
 let cycle=Math.floor(days/12053);days%=12053;jy+=33*cycle;
 let n=Math.floor(days/1461);jy+=4*n;days%=1461;
 if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365;}
 let jm, jd;
 if(days<186){jm=1+Math.floor(days/31);jd=1+days%31;}
 else{jm=7+Math.floor((days-186)/30);jd=1+(days-186)%30;}
 return [jy,jm,jd];
}
function jalaliToGregorian(jy,jm,jd){
 jy=Number(jy);jm=Number(jm);jd=Number(jd);
 let gy=jy+621;
 let r=jalCal(jy);
 let leapJ=r.leap;
 let march=r.march;
 let n=jd;
 if(jm<=6)n+=(jm-1)*31;
 else n+=186+(jm-7)*30;
 let gDays=gregorianDays(gy,1,march)+n-1;
 let date=new Date(Date.UTC(gy,0,gDays));
 return date.toISOString().slice(0,10);
}
function jalCal(jy){
 let breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
 let bl=breaks.length,gy=jy+621,leapJ=-14,jp=breaks[0],jm, jump,n,i;
 if(jy<jp||jy>=breaks[bl-1])return {leap:0,march:20};
 for(i=1;i<bl;i++){
  jm=breaks[i];jump=jm-jp;
  if(jy<jm)break;
  leapJ+=Math.floor(jump/33)*8+Math.floor((jump%33)/4);jp=jm;
 }
 n=jy-jp;
 leapJ+=Math.floor(n/33)*8+Math.floor(((n%33)+3)/4);
 if(jump%33===4&&jump-n===4)leapJ++;
 let leapG=Math.floor(gy/4)-Math.floor((Math.floor(gy/100)+1)*3/4)-150;
 let march=20+leapJ-leapG;
 if(jump-n<6)n=n-jump+Math.floor((jump+4)/33)*33;
 let leap=((n+1)%33-1)%4;if(leap===-1)leap=4;
 return {leap,march};
}
function gregorianDays(y,m,d){
 const md=[31,((y%4===0&&y%100!==0)||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
 let n=d;for(let i=0;i<m-1;i++)n+=md[i];return n;
}
function isoToday(){
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const o={};p.forEach(x=>o[x.type]=x.value);return `${o.year}-${o.month}-${o.day}`;
}
function isoToJalali(iso){
 if(!iso)return '';
 const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(!m)return String(iso);
 const a=gregorianToJalali(+m[1],+m[2],+m[3]);
 return `${a[0]}/${pad(a[1])}/${pad(a[2])}`.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
}
function jalaliInputToIso(value){
 let s=digits(value).trim().replace(/[-.]/g,'/');
 const m=s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
 if(!m)return null;
 const jy=+m[1],jm=+m[2],jd=+m[3];
 if(jy<1200||jm<1||jm>12||jd<1||jd>(jm<=6?31:jm<=11?30:30))return null;
 const iso=jalaliToGregorian(jy,jm,jd);
 if(isoToJalali(iso)!==`${jy}/${pad(jm)}/${pad(jd)}`)return null;
 return iso;
}
function dateInput(id,value=isoToday()){
 const v=isoToJalali(value);
 return `<input id="${id}" type="text" inputmode="numeric" autocomplete="off" placeholder="۱۴۰۵/۰۸/۲۰" value="${v}" required>`;
}
function msg(id,t){if($(id))$(id).textContent=t||''}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function setStatus(){
 const el=$('netStatus');el.textContent=navigator.onLine?'● آنلاین':'● آفلاین';
 el.className='status '+(navigator.onLine?'online':'');
}
function showApp(){
 $('authView').classList.add('hidden');$('mainView').classList.remove('hidden');
 $('accountInfo').textContent=user?'وارد شده با '+(user.email||'حساب ابری'):'حالت محلی؛ برای همگام‌سازی وارد حساب ابری شو';
 render();
}
function showAuth(){$('mainView').classList.add('hidden');$('authView').classList.remove('hidden')}
function initClient(){
 const c=cfg();if(!c.url||!c.key||!window.supabase)return null;
 return window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}
async function refreshSession(){
 if(!client)return;
 const {data}=await client.auth.getSession();session=data.session;user=session?.user||null;
 if(user){showApp();await syncCloud(false)}
}
async function auth(action){
 const email=$('email').value.trim(),password=$('password').value;
 if(!email||password.length<8){msg('authMsg','ایمیل و رمز عبور حداقل ۸ کاراکتری را وارد کن.');return}
 if(!client){msg('authMsg','ابتدا تنظیمات Supabase را ذخیره کن.');return}
 msg('authMsg','در حال ارتباط...');
 try{
  const res=action==='signup'?await client.auth.signUp({email,password}):await client.auth.signInWithPassword({email,password});
  if(res.error)throw res.error;
  session=res.data.session;user=res.data.user;
  if(!session){msg('authMsg','حساب ساخته شد. ایمیلت را تأیید کن و سپس وارد شو.');return}
  showApp();await syncCloud(true);msg('authMsg','ورود موفق بود.');
 }catch(e){msg('authMsg','خطا: '+e.message)}
}
function go(page){
 document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
 if(page==='parties')renderParties();
 if(page==='stock')renderStock();
 if(page==='transactions')renderTransactions();
 if(page==='reports')renderReports();
}
$('nav').addEventListener('click',e=>{
 const b=e.target.closest('button[data-page]');if(b)go(b.dataset.page);
});

function formHTML(type){
 const cash=['receipt','payment'].includes(type);
 const product=['purchase','sale'].includes(type);
 return `<form class="panel txForm" data-form="${type}">
 <input type="hidden" name="editId">
 <div class="grid">
 <div class="field"><label>تاریخ شمسی</label>${dateInput('date_'+type)}</div>
 <div class="field"><label>طرف حساب</label><input name="party" placeholder="نام شخص" ${type==='expense'?'':'required'}></div>
 ${product?`<div class="field"><label>نوع کالا</label><select name="product"><option>تیزابی ریز</option><option>تیزابی درشت</option><option>آفتابی</option><option>سرکه‌ای A</option><option>سرکه‌ای B</option><option>سرکه‌ای C</option><option>خرمایی</option><option>قنادی</option><option>مویز ایران</option><option>مویز افغان</option><option>سایر</option></select></div>
 <div class="field"><label>وزن هر کارتن (کیلوگرم)</label><input name="pack" type="number" min="0" step=".01" value="10"></div>
 <div class="field"><label>تعداد کارتن</label><input name="cartons" type="number" min="0" step="1" value="0"></div>
 <div class="field"><label>وزن کل (کیلوگرم)</label><input name="kg" type="number" min="0" step=".01" value="0"></div>
 <div class="field"><label>قیمت هر کیلو (ریال)</label><input name="unitPrice" type="number" min="0" value="0"></div>`:''}
 <div class="field"><label>مبلغ کل (ریال)</label><input name="amount" type="number" min="0" value="0" required></div>
 ${cash?'':`<div class="field"><label>مبلغ تسویه‌شده (ریال)</label><input name="settled" type="number" min="0" value="0"></div>`}
 <div class="field"><label>روش پرداخت / دریافت</label><select name="method"><option>نقد</option><option>کارت به کارت</option><option>حواله</option><option>چک</option><option>نسیه</option><option>سایر</option></select></div>
 <div class="field"><label>شماره چک</label><input name="chequeNo" placeholder="شماره چک"></div>
 <div class="field"><label>سررسید چک شمسی</label>${dateInput('due_'+type,'')}</div>
 <div class="field span3"><label>توضیحات</label><textarea name="note"></textarea></div>
 </div><div class="actions"><button class="btn" type="submit">ثبت سند</button><button class="btn secondary" type="reset">پاک کردن فرم</button></div>
 <p class="muted">تاریخ‌ها را به شکل سال/ماه/روز شمسی وارد کن.</p></form>`;
}
function setupForms(){
 $('purchaseForm').innerHTML=formHTML('purchase');
 $('saleForm').innerHTML=formHTML('sale');
 $('expenseForm').innerHTML=formHTML('expense');
 $('cashForm').innerHTML=formHTML('receipt');
 document.querySelectorAll('.txForm').forEach(f=>{
  f.addEventListener('submit',saveForm);
  f.addEventListener('reset',()=>setTimeout(()=>{const d=f.querySelector('input[id^="date_"]');if(d)d.value=isoToJalali(isoToday());f.querySelector('[name="editId"]').value='';},0));
  f.addEventListener('input',e=>{
   if(!['pack','cartons','kg','unitPrice'].includes(e.target.name))return;
   const v=n=>+f.querySelector(`[name="${n}"]`)?.value||0;
   if(['pack','cartons'].includes(e.target.name))f.querySelector('[name="kg"]').value=(v('pack')*v('cartons')).toFixed(2);
   if(['pack','cartons','kg','unitPrice'].includes(e.target.name))f.querySelector('[name="amount"]').value=Math.round(v('kg')*v('unitPrice'));
  });
 });
 document.querySelectorAll('[data-cash]').forEach(b=>b.addEventListener('click',()=>{
  cashType=b.dataset.cash;
  document.querySelectorAll('[data-cash]').forEach(x=>x.classList.toggle('active',x===b));
  $('cashForm').innerHTML=formHTML(cashType);
  setupOneCash();
 }));
}
function setupOneCash(){
 const f=$('cashForm').querySelector('form');f.addEventListener('submit',saveForm);
 f.addEventListener('reset',()=>setTimeout(()=>{f.querySelector('input[id^="date_"]').value=isoToJalali(isoToday())},0));
}
function stockFor(product,excludeId=''){
 return active().filter(x=>x.id!==excludeId&&x.product===product).reduce((s,x)=>s+(x.type==='purchase'?(+x.kg||0):x.type==='sale'?-(+x.kg||0):0),0);
}
function saveForm(e){
 e.preventDefault();const f=e.currentTarget,type=f.dataset.form;
 const get=n=>f.querySelector(`[name="${n}"]`)?.value??'';
 const date=jalaliInputToIso(f.querySelector('input[id^="date_"]').value);
 const dueText=f.querySelector('input[id^="due_"]').value;
 const due=dueText?jalaliInputToIso(dueText):null;
 if(!date){alert('تاریخ شمسی را درست وارد کن؛ نمونه ۱۴۰۵/۰۸/۲۰');return}
 if(dueText&&!due){alert('سررسید چک معتبر نیست.');return}
 const id=get('editId')||crypto.randomUUID(),cash=['receipt','payment'].includes(type);
 const product=['purchase','sale'].includes(type);
 const amount=+get('amount')||0,settled=cash?amount:(+get('settled')||0);
 const kg=product?(+get('kg')||0):0,party=get('party').trim();
 if(!cash&&type!=='expense'&&!party){alert('نام طرف حساب را وارد کن.');return}
 if(settled>amount){alert('تسویه نمی‌تواند از مبلغ کل بیشتر باشد.');return}
 if(product&&kg<=0){alert('وزن کالا باید بیشتر از صفر باشد.');return}
 if(type==='sale'&&stockFor(get('product'),id)<kg){alert('موجودی کافی نیست.');return}
 const old=tx.find(x=>x.id===id)||{};
 const item={...old,id,date,type,party,product:product?get('product'):'',pack_kg:product?(+get('pack')||0):0,cartons:product?(+get('cartons')||0):0,kg,unit_price:product?(+get('unitPrice')||0):0,amount,settled,method:get('method'),cheque_no:get('chequeNo').trim(),cheque_due:due,note:get('note').trim(),updated_at:new Date().toISOString(),deleted_at:null};
 if(user)item.user_id=user.id;
 const i=tx.findIndex(x=>x.id===id);if(i>=0)tx[i]=item;else tx.push(item);
 save();f.reset();render();go('transactions');if(user)syncCloud(false);
}
function editTx(id){
 const x=tx.find(t=>t.id===id);if(!x)return;
 const page=x.type==='purchase'?'purchase':x.type==='sale'?'sale':x.type==='expense'?'expense':'cash';
 go(page);
 if(page==='cash'){
  cashType=x.type;
  document.querySelectorAll('[data-cash]').forEach(b=>b.classList.toggle('active',b.dataset.cash===cashType));
  $('cashForm').innerHTML=formHTML(cashType);setupOneCash();
 }
 const f=document.querySelector(`.txForm[data-form="${x.type}"]`)||$('cashForm').querySelector('form');
 if(!f)return;
 const set=(n,v)=>{const el=f.querySelector(`[name="${n}"]`);if(el)el.value=v??''};
 set('editId',x.id);set('party',x.party);set('product',x.product);set('pack',x.pack_kg);set('cartons',x.cartons);set('kg',x.kg);set('unitPrice',x.unit_price);set('amount',x.amount);set('settled',x.settled);set('method',x.method);set('chequeNo',x.cheque_no);set('note',x.note);
 f.querySelector('input[id^="date_"]').value=isoToJalali(x.date);
 f.querySelector('input[id^="due_"]').value=x.cheque_due?isoToJalali(x.cheque_due):'';
 f.querySelector('button[type="submit"]').textContent='ذخیره ویرایش';
}
function delTx(id){
 if(!confirm('این سند حذف شود؟'))return;
 const x=tx.find(t=>t.id===id);if(x){x.deleted_at=new Date().toISOString();x.updated_at=x.deleted_at;save();render();if(user)syncCloud(false)}
}
function table(rows){
 if(!rows.length)return '<div class="empty">هنوز سندی ثبت نشده است.</div>';
 return '<table><thead><tr><th>تاریخ</th><th>نوع</th><th>طرف حساب</th><th>کالا</th><th>وزن</th><th>مبلغ</th><th>تسویه</th><th>مانده</th><th>عملیات</th></tr></thead><tbody>'+
 rows.map(x=>`<tr><td>${isoToJalali(x.date)}</td><td><span class="tag">${labels[x.type]||x.type}</span></td><td>${esc(x.party||'—')}</td><td>${esc(x.product||'—')}</td><td>${fmt(x.kg)} کیلو</td><td>${money(x.amount)}</td><td>${money(x.settled)}</td><td>${money((+x.amount||0)-(+x.settled||0))}</td><td><button class="btn secondary small" data-edit="${x.id}">ویرایش</button> <button class="btn danger small" data-del="${x.id}">حذف</button></td></tr>`).join('')+'</tbody></table>';
}
function renderTransactions(){
 const q=$('txSearch').value.trim().toLowerCase(),filter=$('txFilter').value;
 let rows=active().slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 if(filter!=='all')rows=rows.filter(x=>x.type===filter);
 if(q)rows=rows.filter(x=>(x.party+' '+x.product+' '+x.note).toLowerCase().includes(q));
 $('txTable').innerHTML=table(rows);
}
function renderStock(){
 const m={};active().filter(x=>['purchase','sale'].includes(x.type)).forEach(x=>{
  const k=x.product+'||'+x.pack_kg;if(!m[k])m[k]={product:x.product,pack:x.pack_kg,in:0,out:0,cin:0,cout:0};
  if(x.type==='purchase'){m[k].in+=+x.kg||0;m[k].cin+=+x.cartons||0}
  else{m[k].out+=+x.kg||0;m[k].cout+=+x.cartons||0}
 });
 const rows=Object.values(m);
 $('stockTable').innerHTML=rows.length?'<table><thead><tr><th>کالا</th><th>وزن کارتن</th><th>ورودی کارتن</th><th>خروجی کارتن</th><th>موجودی کارتن</th><th>موجودی کیلو</th></tr></thead><tbody>'+
 rows.map(x=>`<tr><td>${esc(x.product)}</td><td>${fmt(x.pack)} کیلو</td><td>${fmt(x.cin)}</td><td>${fmt(x.cout)}</td><td>${fmt(x.cin-x.cout)}</td><td>${fmt(x.in-x.out)} کیلو</td></tr>`).join('')+'</tbody></table>':'<div class="empty">هنوز خرید یا فروشی ثبت نشده است.</div>';
}
function partyBalance(name){
 const a=active().filter(x=>x.party===name);let receivable=0,payable=0;
 for(const x of a){const rem=(+x.amount||0)-(+x.settled||0);if(x.type==='sale')receivable+=rem;if(x.type==='receipt')receivable-=+x.amount||0;if(x.type==='purchase')payable+=rem;if(x.type==='payment')payable-=+x.amount||0}
 return {receivable,payable,net:receivable-payable,rows:a};
}
function renderParties(){
 const names=[...new Set(active().map(x=>x.party).filter(Boolean))].sort(),sel=$('partySelect'),old=sel.value;
 sel.innerHTML='<option value="">همه اشخاص</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');
 sel.value=names.includes(old)?old:'';
 const chosen=sel.value,all=chosen?[chosen]:names;
 if(!all.length){$('partySummary').innerHTML='';$('partyTable').innerHTML='<div class="empty">هنوز طرف حسابی ثبت نشده است.</div>';return}
 $('partyTable').innerHTML='<table><thead><tr><th>طرف حساب</th><th>طلب از مشتری</th><th>بدهی به فروشنده</th><th>مانده خالص</th></tr></thead><tbody>'+
 all.map(n=>{const b=partyBalance(n);return `<tr><td>${esc(n)}</td><td>${money(b.receivable)}</td><td>${money(b.payable)}</td><td class="balance ${b.net>=0?'positive':'negative'}">${b.net>=0?'طلب '+money(b.net):'بدهی '+money(-b.net)}</td></tr>`}).join('')+'</tbody></table>';
 $('partySummary').innerHTML=chosen?`<p><b>${esc(chosen)}</b> — مانده: <b>${money(Math.abs(partyBalance(chosen).net))} ${partyBalance(chosen).net>=0?'طلب':'بدهی'}</b></p>`:'';
}
function renderReports(){
 const a=active(),sum=t=>a.filter(x=>x.type===t).reduce((s,x)=>s+(+x.amount||0),0);
 $('rPurchase').textContent=money(sum('purchase'));$('rSale').textContent=money(sum('sale'));
 $('rExpense').textContent=money(sum('expense'));
 $('rCash').textContent=money(sum('receipt')+sum('payment'));
 $('reportTable').innerHTML='<table><thead><tr><th>نوع</th><th>تعداد</th><th>مبلغ</th><th>تسویه</th></tr></thead><tbody>'+
 Object.keys(labels).map(t=>{const r=a.filter(x=>x.type===t);return `<tr><td>${labels[t]}</td><td>${fmt(r.length)}</td><td>${money(r.reduce((s,x)=>s+(+x.amount||0),0))}</td><td>${money(r.reduce((s,x)=>s+(+x.settled||0),0))}</td></tr>`}).join('')+'</tbody></table>';
}
function render(){
 const a=active();$('sCount').textContent=fmt(a.length);
 $('sStock').textContent=fmt(a.filter(x=>x.type==='purchase').reduce((s,x)=>s+(+x.kg||0),0)-a.filter(x=>x.type==='sale').reduce((s,x)=>s+(+x.kg||0),0));
 let r=0,p=0;[...new Set(a.map(x=>x.party).filter(Boolean))].forEach(n=>{const b=partyBalance(n);r+=Math.max(0,b.receivable);p+=Math.max(0,b.payable)});
 $('sReceivable').textContent=money(r);$('sPayable').textContent=money(p);
 $('recent').innerHTML=table(a.slice().sort((x,y)=>(y.date||'').localeCompare(x.date||'')).slice(0,6));
 renderTransactions();renderStock();renderReports();
 $('today').textContent='امروز: '+isoToJalali(isoToday());
}
document.addEventListener('click',e=>{
 const ed=e.target.closest('[data-edit]'),dl=e.target.closest('[data-del]');
 if(ed)editTx(ed.dataset.edit);if(dl)delTx(dl.dataset.del);
});
$('txSearch').addEventListener('input',renderTransactions);
$('txFilter').addEventListener('change',renderTransactions);
$('partySelect').addEventListener('change',renderParties);

function csv(){
 const rows=[['تاریخ شمسی','نوع','طرف حساب','کالا','وزن کارتن','تعداد کارتن','وزن','قیمت واحد','مبلغ','تسویه','روش','شماره چک','سررسید شمسی','توضیحات'],
 ...active().map(x=>[isoToJalali(x.date),labels[x.type]||x.type,x.party,x.product,x.pack_kg,x.cartons,x.kg,x.unit_price,x.amount,x.settled,x.method,x.cheque_no,isoToJalali(x.cheque_due),x.note])];
 const data='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
 download(new Blob([data],{type:'text/csv;charset=utf-8'}),'hasanbeigi-ledger.csv');
}
function download(blob,name){
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
$('csvBtn').onclick=csv;
$('backupBtn').onclick=()=>download(new Blob([JSON.stringify({version:1,exported_at:new Date().toISOString(),transactions:tx},null,2)],{type:'application/json'}),'hasanbeigi-backup.json');
$('restoreFile').onchange=async e=>{
 try{const o=JSON.parse(await e.target.files[0].text());if(!Array.isArray(o.transactions))throw Error('ساختار فایل درست نیست');
 if(!confirm('اطلاعات فایل به اطلاعات فعلی اضافه شود؟'))return;
 const map=new Map(tx.map(x=>[x.id,x]));o.transactions.forEach(x=>map.set(x.id,x));tx=[...map.values()];save();render();alert('بازیابی انجام شد.');
 }catch(err){alert('خطا: '+err.message)}e.target.value='';
};
$('clearBtn').onclick=()=>{
 if(confirm('تمام اطلاعات محلی این دستگاه پاک شود؟')){tx=[];save();render()}
};
$('saveCloud').onclick=()=>{
 const url=$('sbUrl').value.trim().replace(/\/$/,''),key=$('sbKey').value.trim();
 if(!/^https:\/\/.+\.supabase\.co$/.test(url)||!key){msg('cloudMsg','نشانی یا کلید معتبر نیست.');return}
 localStorage.setItem(CFG,JSON.stringify({url,key}));client=initClient();msg('cloudMsg','تنظیمات ذخیره شد.');
};
async function syncCloud(show=true){
 if(!client||!user){if(show)msg('cloudMsg','ابتدا وارد حساب ابری شو.');return}
 if(!navigator.onLine){if(show)msg('cloudMsg','اینترنت وصل نیست؛ اطلاعات محلی محفوظ است.');return}
 if(show)msg('cloudMsg','در حال همگام‌سازی...');
 try{
  const {data:remote,error}=await client.from('transactions').select('*').order('updated_at',{ascending:true});
  if(error)throw error;
  const map=new Map(tx.map(x=>[x.id,x]));
  for(const x of remote||[]){const l=map.get(x.id);if(!l||new Date(x.updated_at)>new Date(l.updated_at||0))map.set(x.id,x)}
  tx=[...map.values()];save();
  const payload=tx.map(x=>({...x,user_id:user.id}));
  if(payload.length){const {error:upErr}=await client.from('transactions').upsert(payload,{onConflict:'id'});if(upErr)throw upErr;tx=tx.map(x=>({...x,user_id:user.id}));save()}
  render();if(show)msg('cloudMsg','همگام‌سازی موفق؛ تعداد اسناد: '+fmt(tx.length));
  $('accountInfo').textContent='حساب ابری: '+(user.email||'فعال')+' · آخرین همگام‌سازی '+new Date().toLocaleString('fa-IR',{timeZone:'Asia/Tehran'});
 }catch(e){if(show)msg('cloudMsg','خطا در همگام‌سازی: '+e.message)}
}
$('cloudLoginBtn').onclick=()=>{client=initClient();showAuth();msg('authMsg','با ایمیل و رمز عبورت وارد شو.')};
$('syncBtn').onclick=()=>syncCloud(true);
$('logoutBtn').onclick=async()=>{if(client)await client.auth.signOut();session=null;user=null;showAuth()};
$('loginBtn').onclick=()=>auth('login');$('signupBtn').onclick=()=>auth('signup');$('offlineBtn').onclick=showApp;
window.addEventListener('online',()=>{setStatus();if(user)syncCloud(false)});
window.addEventListener('offline',setStatus);

setupForms();
setStatus();
$('sbUrl').value=cfg().url||'';$('sbKey').value=cfg().key||'';
client=initClient();
if(client)refreshSession();else showAuth();
$('today').textContent='امروز: '+isoToJalali(isoToday());
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});

})();
