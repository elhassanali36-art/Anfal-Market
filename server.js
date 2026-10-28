'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const Database = require('better-sqlite3');
const path = require('node:path');
const crypto = require('node:crypto');

const app = express();
const db = new Database(process.env.DB_PATH || path.join(__dirname, 'anfal-market.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expired_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expired_at);
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort_order INTEGER NOT NULL DEFAULT 0, image_url TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT DEFAULT '', price REAL NOT NULL CHECK(price >= 0), category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, image_url TEXT DEFAULT '', unit_label TEXT NOT NULL DEFAULT 'للوحدة', stock INTEGER NOT NULL DEFAULT 100 CHECK(stock >= 0), active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT DEFAULT '', fulfillment TEXT NOT NULL CHECK(fulfillment IN ('delivery','pickup')), distance_km REAL NOT NULL DEFAULT 0, delivery_fee REAL NOT NULL DEFAULT 0, subtotal REAL NOT NULL, total REAL NOT NULL, payment_method TEXT NOT NULL, notes TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER NOT NULL REFERENCES products(id), product_name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL);
`);
// Forward-compatible schema migration for databases created by earlier releases.
const ensureColumn = (table, column, definition) => { const columns = db.prepare(`PRAGMA table_info(${table})`).all(); if (!columns.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); };
ensureColumn('categories', 'image_url', "TEXT DEFAULT ''");
ensureColumn('products', 'unit_label', "TEXT NOT NULL DEFAULT 'للوحدة'");
const defaults = {
 store_name:'الأنفال ماركت', store_tagline:'طلباتك اليومية تصل إليك بسهولة', store_logo_url:'', currency:'SDG', locale:'ar', phone:'', whatsapp_number:'', address:'',
 delivery_enabled:'true', pickup_enabled:'true', price_per_km:'500', min_delivery_fee:'0', max_delivery_fee:'0', minimum_order:'0', primary_color:'#16794b',
 cash_enabled:'true', bankak_enabled:'true', okash_enabled:'false', fawry_enabled:'false', delivery_note:'رسوم التوصيل تحسب حسب المسافة المدخلة وسعر الكيلومتر المحدد من الإدارة.', business_hours:''
};
const putSetting = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
for (const [k,v] of Object.entries(defaults)) db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').run(k,v);
if (db.prepare('SELECT COUNT(*) n FROM categories').get().n === 0) {
 const ins = db.prepare('INSERT INTO categories(name,sort_order) VALUES(?,?)');
 ['خضار','فواكه','بقالة','مستلزمات نظافة'].forEach((x,i)=>ins.run(x,i));
}
if (db.prepare('SELECT COUNT(*) n FROM products').get().n === 0) {
 const cats = Object.fromEntries(db.prepare('SELECT id,name FROM categories').all().map(x=>[x.name,x.id]));
 const ins = db.prepare('INSERT INTO products(name,description,price,category_id,image_url,unit_label,stock) VALUES(?,?,?,?,?,?,?)');
 ins.run('أرز بسمتي 5 كجم','أرز للاستخدام اليومي',14500,cats['بقالة'],'','للكيس',30);
 ins.run('زيت طبخ 1.8 لتر','زيت نباتي',7800,cats['بقالة'],'','للعبوة',40);
 ins.run('مياه معدنية 1.5 لتر','مياه شرب',900,cats['بقالة'],'','للعبوة',100);
}
const readSettings = () => Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(x=>[x.key,x.value]));
const bool = v => String(v).toLowerCase() === 'true';
const { calculateDeliveryFee } = require('./lib/delivery');
// Persistent SQLite-backed sessions survive restarts on a durable disk.
class SQLiteSessionStore extends session.Store {
 get(sid, callback) {
  try { const row=db.prepare('SELECT sess,expired_at FROM sessions WHERE sid=?').get(sid); if(!row||row.expired_at<=Date.now()){db.prepare('DELETE FROM sessions WHERE sid=?').run(sid);return callback(null,null);} callback(null,JSON.parse(row.sess)); }
  catch(err){callback(err);}
 }
 set(sid, sess, callback=()=>{}) {
  try { const expiry=sess.cookie?.expires ? new Date(sess.cookie.expires).getTime() : Date.now()+8*60*60*1000; db.prepare('INSERT INTO sessions(sid,sess,expired_at) VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess,expired_at=excluded.expired_at').run(sid,JSON.stringify(sess),expiry); callback(null); }
  catch(err){callback(err);}
 }
 destroy(sid, callback=()=>{}) { try {db.prepare('DELETE FROM sessions WHERE sid=?').run(sid);callback(null);}catch(err){callback(err);} }
 touch(sid,sess,callback=()=>{}) { this.set(sid,sess,callback); }
}
if(process.env.NODE_ENV==='production' && (!process.env.ADMIN_PASSWORD || String(process.env.ADMIN_PASSWORD).length<14 || !process.env.SESSION_SECRET || String(process.env.SESSION_SECRET).length<32)) {
 throw new Error('Production requires ADMIN_PASSWORD (14+ characters) and SESSION_SECRET (32+ characters).');
}
app.disable('x-powered-by');
// Set TRUST_PROXY=true only when the app is behind a trusted reverse proxy that sets X-Forwarded-* headers.
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],scriptSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','https:'],connectSrc:["'self'"]}}}));
app.use(express.json({limit:'8mb'}));
app.use(session({name:'anfal.sid',store:new SQLiteSessionStore(),secret:process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}}));
const loginAttempts = new Map();
const orderAttempts = new Map();
// Keep in-memory throttles bounded during long-running single-instance deployments.
const pruneThrottleMaps = () => { const now=Date.now(); for (const map of [loginAttempts,orderAttempts]) for (const [key,value] of map) if (now > value.until + 15*60*1000) map.delete(key); try { db.prepare('DELETE FROM sessions WHERE expired_at <= ?').run(now); } catch (err) { console.error('Session cleanup failed:', err.message); } };
setInterval(pruneThrottleMaps, 10*60*1000).unref();
app.use('/api/admin/login',(req,res,next)=>{const key=req.ip||req.socket.remoteAddress||'unknown',now=Date.now(),entry=loginAttempts.get(key)||{count:0,until:now+15*60*1000};if(now>entry.until){entry.count=0;entry.until=now+15*60*1000;}if(entry.count>=10)return res.status(429).json({error:'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجدداً.'});req.loginAttemptKey=key;next();});
// Reject cross-origin browser mutations against the admin session. SameSite cookies remain an additional layer.
app.use('/api/admin', (req,res,next)=>{
 if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
 const fetchSite=String(req.get('sec-fetch-site')||'').toLowerCase();
 if (fetchSite==='cross-site') return res.status(403).json({error:'تم رفض الطلب لأسباب أمنية'});
 const origin=req.get('origin');
 if (origin) {
  try { const parsed=new URL(origin); if (parsed.host!==req.get('host') || parsed.protocol!==`${req.protocol}:`) return res.status(403).json({error:'مصدر الطلب غير مسموح'}); }
  catch { return res.status(403).json({error:'مصدر الطلب غير صالح'}); }
 }
 next();
});
app.use(express.static(path.join(__dirname,'public')));
const requireAdmin = (req,res,next) => req.session && req.session.admin ? next() : res.status(401).json({error:'يلزم تسجيل دخول الإدارة'});
const validImage = image => !image || /^https:\/\//i.test(image) || image.startsWith('/') || /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(image);
const validateImageSize = image => !image || !image.startsWith('data:') || image.length <= 6_000_000;
app.get('/api/health',(req,res)=>res.json({ok:true,service:'anfal-market'}));
app.get('/api/store',(req,res)=>{
 const settings=readSettings();
 const products=db.prepare('SELECT p.id,p.name,p.description,p.price,p.category_id,p.image_url,p.unit_label,p.stock,c.name category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.active=1 ORDER BY p.id DESC').all();
 const categories=db.prepare('SELECT id,name,image_url,sort_order FROM categories ORDER BY sort_order,id').all();
 res.json({settings,products,categories});
});
app.post('/api/admin/login',(req,res)=>{
 const password=String(req.body?.password||'');
 if(password.length>1024) return res.status(400).json({error:'كلمة المرور أطول من المسموح'});
 if(!process.env.ADMIN_PASSWORD) return res.status(503).json({error:'اضبط ADMIN_PASSWORD في ملف البيئة أولاً'});
 const expected=String(process.env.ADMIN_PASSWORD); const supplied=Buffer.from(password); const target=Buffer.from(expected); const match=supplied.length===target.length && crypto.timingSafeEqual(supplied,target);
 if(!match){const key=req.loginAttemptKey||req.ip||'unknown',e=loginAttempts.get(key)||{count:0,until:Date.now()+15*60*1000};e.count+=1;loginAttempts.set(key,e);return res.status(401).json({error:'كلمة المرور غير صحيحة'});}
 loginAttempts.delete(req.loginAttemptKey||req.ip||'unknown'); req.session.regenerate(err=>{if(err)return res.status(500).json({error:'تعذر إنشاء جلسة آمنة'});req.session.admin=true;req.session.save(err2=>err2?res.status(500).json({error:'تعذر حفظ جلسة الإدارة'}):res.json({ok:true}));});
});
app.post('/api/admin/logout',requireAdmin,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/admin/session',(req,res)=>res.json({authenticated:!!req.session?.admin}));
app.get('/api/admin/orders',requireAdmin,(req,res)=>res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all().map(o=>({...o,items:db.prepare('SELECT product_name,quantity,unit_price FROM order_items WHERE order_id=?').all(o.id)}))));
app.patch('/api/admin/orders/:id/status',requireAdmin,(req,res)=>{
 const allowed=['new','confirmed','preparing','out_for_delivery','completed','cancelled'];
 if(!allowed.includes(req.body?.status)) return res.status(400).json({error:'حالة الطلب غير صالحة'});
 const id=Number(req.params.id); if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'رقم الطلب غير صالح'});
 try { const transition=db.transaction(()=>{const order=db.prepare('SELECT id,status FROM orders WHERE id=?').get(id);if(!order)return {missing:true};if(order.status==='cancelled'&&req.body.status!=='cancelled')return {terminal:true};if(order.status===req.body.status)return {ok:true};const transitions={new:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['out_for_delivery','completed','cancelled'],out_for_delivery:['completed'],completed:[],cancelled:[]};if(!transitions[order.status]?.includes(req.body.status))return {invalidTransition:true,from:order.status};if(req.body.status==='cancelled'){const items=db.prepare('SELECT product_id,quantity FROM order_items WHERE order_id=?').all(id);for(const item of items)db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.quantity,item.product_id);}db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,id);return {ok:true};})();
 if(transition.missing)return res.status(404).json({error:'الطلب غير موجود'});if(transition.terminal)return res.status(409).json({error:'الطلب الملغي نهائي ولا يمكن إعادة تفعيله'});if(transition.invalidTransition)return res.status(409).json({error:`لا يمكن تغيير حالة الطلب من ${transition.from} إلى ${req.body.status}`});res.json({ok:true});
 }catch(e){res.status(500).json({error:'تعذر تحديث حالة الطلب'});} 
});
app.patch('/api/admin/orders/:id/delivery-fee',requireAdmin,(req,res)=>{
 const id=Number(req.params.id), fee=Number(req.body?.delivery_fee);
 if(!Number.isSafeInteger(id)||id<1||!Number.isFinite(fee)||fee<0||fee>1000000000) return res.status(400).json({error:'أدخل رسوم توصيل صحيحة'});
 const order=db.prepare('SELECT id,fulfillment,subtotal,status FROM orders WHERE id=?').get(id);
 if(!order) return res.status(404).json({error:'الطلب غير موجود'});
 if(order.status==='cancelled')return res.status(409).json({error:'لا يمكن تعديل رسوم طلب ملغي'});
 if(order.fulfillment!=='delivery') return res.status(400).json({error:'لا يمكن تعديل رسوم طلب الاستلام من المتجر'});
 db.prepare('UPDATE orders SET delivery_fee=?,total=subtotal+? WHERE id=?').run(Math.round(fee),Math.round(fee),id);
 res.json({ok:true,delivery_fee:Math.round(fee),total:Number(order.subtotal)+Math.round(fee)});
});
app.get('/api/admin/products',requireAdmin,(req,res)=>res.json(db.prepare('SELECT p.*,c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC').all()));
app.post('/api/admin/products',requireAdmin,(req,res)=>{
 const {name,description='',price,category_id=null,image_url='',unit_label='للوحدة',stock=100,active=true}=req.body||{};
 if(!String(name||'').trim()||String(name).trim().length>160||!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000000||!Number.isFinite(Number(stock))||Number(stock)<0||Number(stock)>1000000000||Math.round(Number(stock)*1000)!==Number(stock)*1000) return res.status(400).json({error:'تحقق من اسم المنتج والسعر والمخزون'});
 const categoryId=category_id===null||category_id===''?null:Number(category_id);if(categoryId!==null&&(!Number.isSafeInteger(categoryId)||categoryId<1||!db.prepare('SELECT id FROM categories WHERE id=?').get(categoryId)))return res.status(400).json({error:'التصنيف المحدد غير موجود'});
 const image=String(image_url||'').trim();if(!validImage(image)||!validateImageSize(image))return res.status(400).json({error:'الصورة غير صالحة أو حجمها أكبر من 4 ميغابايت'});
 const unit=String(unit_label||'للوحدة').trim();if(!unit||unit.length>40)return res.status(400).json({error:'أدخل وحدة بيع صالحة مثل كيلو أو حبة أو عبوة'});
 const r=db.prepare('INSERT INTO products(name,description,price,category_id,image_url,unit_label,stock,active) VALUES(?,?,?,?,?,?,?,?)').run(String(name).trim(),String(description).slice(0,1000),Number(price),categoryId,image,unit,Number(stock),(active===false||active===0||active==='false')?0:1);
 res.status(201).json({id:r.lastInsertRowid});
});
app.put('/api/admin/products/:id',requireAdmin,(req,res)=>{
 const {name,description='',price,category_id=null,image_url='',unit_label='للوحدة',stock=0,active=true}=req.body||{};
 if(!String(name||'').trim()||String(name).trim().length>160||!Number.isFinite(Number(price))||Number(price)<0||Number(price)>1000000000||!Number.isFinite(Number(stock))||Number(stock)<0||Number(stock)>1000000000||Math.round(Number(stock)*1000)!==Number(stock)*1000) return res.status(400).json({error:'تحقق من اسم المنتج والسعر والمخزون'});
 const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'رقم المنتج غير صالح'});const categoryId=category_id===null||category_id===''?null:Number(category_id);if(categoryId!==null&&(!Number.isSafeInteger(categoryId)||categoryId<1||!db.prepare('SELECT id FROM categories WHERE id=?').get(categoryId)))return res.status(400).json({error:'التصنيف المحدد غير موجود'});const image=String(image_url||'').trim();if(!validImage(image)||!validateImageSize(image))return res.status(400).json({error:'الصورة غير صالحة أو حجمها أكبر من 4 ميغابايت'});const unit=String(unit_label||'للوحدة').trim();if(!unit||unit.length>40)return res.status(400).json({error:'أدخل وحدة بيع صالحة'});
 const r=db.prepare('UPDATE products SET name=?,description=?,price=?,category_id=?,image_url=?,unit_label=?,stock=?,active=? WHERE id=?').run(String(name).trim(),String(description).slice(0,1000),Number(price),categoryId,image,unit,Number(stock),(active===false||active===0||active==='false')?0:1,id);
 if(!r.changes) return res.status(404).json({error:'المنتج غير موجود'});res.json({ok:true});
});
app.delete('/api/admin/products/:id',requireAdmin,(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'رقم المنتج غير صالح'});const exists=db.prepare('SELECT id FROM products WHERE id=?').get(id);if(!exists)return res.status(404).json({error:'المنتج غير موجود'});const used=db.prepare('SELECT 1 FROM order_items WHERE product_id=? LIMIT 1').get(id);if(used)db.prepare('UPDATE products SET active=0 WHERE id=?').run(id);else db.prepare('DELETE FROM products WHERE id=?').run(id);res.json({ok:true,archived:!!used});});
app.post('/api/admin/categories',requireAdmin,(req,res)=>{const name=String(req.body?.name||'').trim(),image=String(req.body?.image_url||'').trim(),sortOrder=Number(req.body?.sort_order??(db.prepare('SELECT COALESCE(MAX(sort_order),-1)+1 n FROM categories').get().n));if(!name||name.length>80||!Number.isSafeInteger(sortOrder)||sortOrder<0||sortOrder>100000)return res.status(400).json({error:'تحقق من اسم التصنيف وترتيبه'});if(!validImage(image)||!validateImageSize(image))return res.status(400).json({error:'صورة التصنيف غير صالحة أو أكبر من 4 ميغابايت'});try{const r=db.prepare('INSERT INTO categories(name,image_url,sort_order) VALUES(?,?,?)').run(name,image,sortOrder);res.status(201).json({id:r.lastInsertRowid});}catch{res.status(409).json({error:'التصنيف موجود بالفعل'});}});
app.put('/api/admin/categories/:id',requireAdmin,(req,res)=>{const id=Number(req.params.id),name=String(req.body?.name||'').trim();if(!Number.isSafeInteger(id)||id<1||!name||name.length>80)return res.status(400).json({error:'رقم التصنيف أو اسمه غير صالح'});const existing=db.prepare('SELECT image_url,sort_order FROM categories WHERE id=?').get(id);if(!existing)return res.status(404).json({error:'التصنيف غير موجود'});const image=Object.prototype.hasOwnProperty.call(req.body||{},'image_url')?String(req.body.image_url||'').trim():existing.image_url||'',sortOrder=Number(req.body?.sort_order??existing.sort_order);if(!Number.isSafeInteger(sortOrder)||sortOrder<0||sortOrder>100000)return res.status(400).json({error:'ترتيب التصنيف غير صالح'});if(!validImage(image)||!validateImageSize(image))return res.status(400).json({error:'صورة التصنيف غير صالحة أو أكبر من 4 ميغابايت'});try{db.prepare('UPDATE categories SET name=?,image_url=?,sort_order=? WHERE id=?').run(name,image,sortOrder,id);res.json({ok:true});}catch{res.status(409).json({error:'يوجد تصنيف آخر بالاسم نفسه'});}});
app.delete('/api/admin/categories/:id',requireAdmin,(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'رقم التصنيف غير صالح'});const exists=db.prepare('SELECT id FROM categories WHERE id=?').get(id);if(!exists)return res.status(404).json({error:'التصنيف غير موجود'});const used=db.prepare('SELECT COUNT(*) n FROM products WHERE category_id=?').get(id).n;if(used>0)return res.status(409).json({error:`لا يمكن حذف الفئة لأنها مرتبطة بـ ${used} منتج. انقل المنتجات إلى فئة أخرى أولاً.`});db.prepare('DELETE FROM categories WHERE id=?').run(id);res.json({ok:true});});
app.put('/api/admin/settings',requireAdmin,(req,res)=>{
 const allowed=new Set(Object.keys(defaults)); const numeric=new Set(['price_per_km','min_delivery_fee','max_delivery_fee','minimum_order']);
 const updates={};
 for(const [k,raw] of Object.entries(req.body||{})){
  if(!allowed.has(k))continue;
  let v=String(raw).slice(0, k==='store_logo_url' ? 6_000_000 : 500);
  if(numeric.has(k)){const n=Number(v);if(!Number.isFinite(n)||n<0||n>1000000000)return res.status(400).json({error:`قيمة غير صالحة: ${k}`});v=String(n);}
  if(['delivery_enabled','pickup_enabled','cash_enabled','bankak_enabled','okash_enabled','fawry_enabled'].includes(k)&&!['true','false'].includes(v))return res.status(400).json({error:`قيمة غير صالحة: ${k}`});
  if(k==='primary_color'&&v&&!/^#[0-9a-fA-F]{6}$/.test(v))return res.status(400).json({error:'اللون الأساسي يجب أن يكون بصيغة HEX مثل #16794b'});
  if(k==='store_logo_url'&&(!validImage(v)||!validateImageSize(v)))return res.status(400).json({error:'شعار المتجر غير صالح أو حجمه أكبر من 4 ميغابايت'});
  updates[k]=v;
 }
 const candidate={...readSettings(),...updates};
 if(!String(candidate.store_name||'').trim()||String(candidate.store_name).length>120||!String(candidate.currency||'').trim()||String(candidate.currency).length>8)return res.status(400).json({error:'اسم المتجر ورمز العملة مطلوبان وبطول صالح'});
 const maxLengths={store_tagline:200,phone:40,whatsapp_number:40,address:300,delivery_note:500,business_hours:300};
 for(const [key,max] of Object.entries(maxLengths)) if(String(candidate[key]||'').length>max)return res.status(400).json({error:`القيمة أطول من المسموح: ${key}`});
 if(!['cash_enabled','bankak_enabled','okash_enabled','fawry_enabled'].some(k=>bool(candidate[k])))return res.status(400).json({error:'يجب تفعيل طريقة دفع واحدة على الأقل'});
 if(!bool(candidate.delivery_enabled)&&!bool(candidate.pickup_enabled))return res.status(400).json({error:'يجب تفعيل التوصيل أو الاستلام من المتجر على الأقل'});
 if(Number(candidate.max_delivery_fee)>0&&Number(candidate.min_delivery_fee)>Number(candidate.max_delivery_fee))return res.status(400).json({error:'الحد الأدنى لرسوم التوصيل لا يمكن أن يتجاوز الحد الأقصى'});
 const save=db.transaction(()=>{for(const [k,v] of Object.entries(updates))putSetting.run(k,v);});save();
 res.json({settings:readSettings()});
});
app.post('/api/orders',(req,res)=>{
 const key=req.ip||req.socket.remoteAddress||'unknown',now=Date.now(),limit=orderAttempts.get(key)||{count:0,until:now+10*60*1000};if(now>limit.until){limit.count=0;limit.until=now+10*60*1000;}if(limit.count>=20)return res.status(429).json({error:'تم إرسال طلبات كثيرة من هذا الاتصال. انتظر قليلاً ثم حاول مجدداً.'});limit.count+=1;orderAttempts.set(key,limit);
 const b=req.body||{}; const name=String(b.customer_name||'').trim(), phone=String(b.phone||'').trim();
 if(!['delivery','pickup'].includes(b.fulfillment)) return res.status(400).json({error:'اختر طريقة استلام صحيحة'});
 const fulfillment=b.fulfillment;
 if(name.length<2||name.length>160||phone.length<6||phone.length>40)return res.status(400).json({error:'أدخل الاسم ورقم هاتف صحيحاً'});
 if(fulfillment==='delivery'&&String(b.address||'').trim().length<4)return res.status(400).json({error:'أدخل عنوان التوصيل بالتفصيل'});
 const settings=readSettings(); if(fulfillment==='delivery'&&!bool(settings.delivery_enabled))return res.status(400).json({error:'التوصيل غير متاح حالياً'});if(fulfillment==='pickup'&&!bool(settings.pickup_enabled))return res.status(400).json({error:'الاستلام من المتجر غير متاح حالياً'});
 const items=Array.isArray(b.items)?b.items:[];if(!items.length||items.length>100)return res.status(400).json({error:'السلة فارغة أو تحتوي على عدد غير صالح من الأصناف'});
 const clean=[];let subtotal=0;
 for(const item of items){const id=Number(item.id),qty=Number(item.quantity);if(!Number.isSafeInteger(id)||!Number.isFinite(qty)||qty<=0||qty>99||Math.round(qty*1000)!==qty*1000)return res.status(400).json({error:'كمية أو منتج غير صالح'});const p=db.prepare('SELECT id,name,price,stock,unit_label FROM products WHERE id=? AND active=1').get(id);if(!p)return res.status(400).json({error:'أحد المنتجات لم يعد متاحاً'});const step=/كيلو|كجم|kg/i.test(p.unit_label||'')?0.5:1;if(Math.abs(qty/step-Math.round(qty/step))>1e-8)return res.status(400).json({error:`الكمية يجب أن تكون بمضاعفات ${step} ${p.unit_label}`});if(p.stock+1e-8<qty)return res.status(400).json({error:`المخزون غير كافٍ للمنتج: ${p.name}`});clean.push({...p,quantity:qty});subtotal+=p.price*qty;}
 if(subtotal<Number(settings.minimum_order||0))return res.status(400).json({error:`الحد الأدنى للطلب ${settings.minimum_order} ${settings.currency}`});
 let distance=0,fee=0;try{if(fulfillment==='delivery'){distance=Number(b.distance_km);if(!Number.isFinite(distance)||distance<0||distance>300)return res.status(400).json({error:'أدخل مسافة توصيل صحيحة بالكيلومتر (0 إلى 300)'});fee=calculateDeliveryFee(distance,settings);}}catch(e){return res.status(400).json({error:e.message});}
 const payment=String(b.payment_method||'cash');if(!['cash','bankak','okash','fawry'].includes(payment))return res.status(400).json({error:'طريقة الدفع غير معروفة'});const enabled={cash:bool(settings.cash_enabled),bankak:bool(settings.bankak_enabled),okash:bool(settings.okash_enabled),fawry:bool(settings.fawry_enabled)};if(!enabled[payment])return res.status(400).json({error:'طريقة الدفع غير متاحة'});
 const create=db.transaction(()=>{for(const p of clean){const r=db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').run(p.quantity,p.id,p.quantity);if(!r.changes)throw new Error('تغير المخزون أثناء تنفيذ الطلب؛ حاول مجدداً');}const r=db.prepare('INSERT INTO orders(customer_name,phone,address,fulfillment,distance_km,delivery_fee,subtotal,total,payment_method,notes) VALUES(?,?,?,?,?,?,?,?,?,?)').run(name,phone,String(b.address||'').slice(0,500),fulfillment,distance,fee,subtotal,subtotal+fee,payment,String(b.notes||'').slice(0,1000));const id=r.lastInsertRowid;const ins=db.prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price) VALUES(?,?,?,?,?)');for(const p of clean)ins.run(id,p.id,p.name,p.quantity,p.price);return id;});
 try{const id=create();res.status(201).json({ok:true,order_id:id,subtotal,delivery_fee:fee,total:subtotal+fee,currency:settings.currency,store_name:settings.store_name,whatsapp_number:settings.whatsapp_number});}catch(e){res.status(409).json({error:e.message||'تعذر إنشاء الطلب'});}
});
app.use((err,req,res,next)=>{ if(res.headersSent)return next(err); if(err?.type==='entity.too.large')return res.status(413).json({error:'حجم الطلب أكبر من المسموح'}); if(err instanceof SyntaxError && 'body' in err)return res.status(400).json({error:'صيغة JSON غير صالحة'}); console.error('Unhandled request error:',err?.message||err); return res.status(500).json({error:'حدث خطأ داخلي. حاول مرة أخرى.'}); });
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
const port=Number(process.env.PORT||3000);if(require.main===module)app.listen(port,'0.0.0.0',()=>console.log(`Anfal Market running on port ${port}`));
module.exports={app,db,calculateDeliveryFee};
