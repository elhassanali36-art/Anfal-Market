/* الأنفال ماركت — local store engine (يعمل أونلاين وأوفلاين)
 * - When a real server answers /api/*, it is used untouched.
 * - Without a server (GitHub Pages / Android APK) a COMPLETE local store runs on localStorage:
 *   browsing, cart, checkout (+WhatsApp order message) AND full admin (products, categories, settings, orders).
 * - Admin password (offline mode): anfal2026
 */
(function () {
  var DEMO = null;
  var KEY = 'anfal.local.v1';
  var ADMIN_PASS = 'anfal2026';
  var authed = false;
  var real = window.fetch.bind(window);

  function seed() {
    if (window.__ANFAL_DEMO__) return window.__ANFAL_DEMO__;
    return { settings: {}, products: [], categories: [] };
  }
  function loadDemo() {
    if (window.__ANFAL_DEMO__) return Promise.resolve(window.__ANFAL_DEMO__);
    if (!DEMO) DEMO = real('./demo-data.json').then(function (r) { return r.json(); });
    return DEMO;
  }
  function blankState(seedData) {
    return {
      products: (seedData.products || []).map(function (p) { return Object.assign({}, p); }),
      categories: (seedData.categories || []).map(function (c) { return Object.assign({}, c); }),
      settings: Object.assign({}, seedData.settings || {}),
      orders: [],
      nextProductId: Math.max.apply(null, [100].concat((seedData.products || []).map(function (p) { return Number(p.id) || 0; }))) + 1,
      nextCategoryId: Math.max.apply(null, [9].concat((seedData.categories || []).map(function (c) { return Number(c.id) || 0; }))) + 1,
      nextOrderId: 1001
    };
  }
  var state = null;

  /* ---------- storage: IndexedDB primary (large quota), compact localStorage mirror, seed fallback ---------- */
  var IDB_NAME = 'anfal-store', IDB_STORE = 'kv', IDB_KEY = 'catalog', BACKUP_KEY = 'anfal.local.backup';

  function idb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('no-idb'));
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('idb-open-failed')); };
    });
  }
  function idbGet() {
    return idb().then(function (db) {
      return new Promise(function (resolve) {
        try {
          var tx = db.transaction(IDB_STORE, 'readonly');
          var rq = tx.objectStore(IDB_STORE).get(IDB_KEY);
          rq.onsuccess = function () { resolve(rq.result || null); };
          rq.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    }).catch(function () { return null; });
  }
  function idbSet(obj) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(IDB_STORE, 'readwrite');
          tx.objectStore(IDB_STORE).put(obj, IDB_KEY);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { reject(tx.error || new Error('idb-write-failed')); };
        } catch (e) { reject(e); }
      });
    });
  }
  /* compact copy for the localStorage mirror: drop inline base64 images so the 5MB cap is never hit */
  function compact(obj) {
    var copy = JSON.parse(JSON.stringify(obj));
    (copy.products || []).forEach(function (p) { if (p.image_url && p.image_url.indexOf('data:') === 0) p.image_url = ''; });
    (copy.categories || []).forEach(function (c) { if (c.image_url && c.image_url.indexOf('data:') === 0) c.image_url = ''; });
    (copy.settings || {})['store_logo_url'] = copy.settings && copy.settings.store_logo_url && copy.settings.store_logo_url.indexOf('data:') === 0 ? '' : (copy.settings || {}).store_logo_url;
    return copy;
  }
  function mirror() {
    try {
      localStorage.setItem(KEY, JSON.stringify(compact(state)));
      localStorage.setItem(BACKUP_KEY, JSON.stringify(compact(state)));
      return true;
    } catch (e) {
      // last resort: keep only the essentials so the catalog is never lost
      try {
        localStorage.setItem(KEY, JSON.stringify({
          products: (state.products || []).map(function (p) { return { id: p.id, name: p.name, description: p.description, price: p.price, category_id: p.category_id, unit_label: p.unit_label, stock: p.stock, active: p.active }; }),
          categories: state.categories, settings: state.settings, orders: state.orders,
          nextProductId: state.nextProductId, nextCategoryId: state.nextCategoryId, nextOrderId: state.nextOrderId
        }));
      } catch (e2) {}
      return false;
    }
  }
  function persist() {
    state.savedAt = Date.now();
    var mirrored = mirror();
    idbSet(state).catch(function () {
      alert('تعذر حفظ بيانات المتجر على الجهاز (مساحة ممتلئة). احذف بعض الصور أو استخدم صوراً أصغر.');
    });
    return mirrored;
  }
  function normalize(st2) {
    if (!st2 || !Array.isArray(st2.products) || !Array.isArray(st2.categories)) return null;
    return st2;
  }
  function st() {
    if (state) return state;
    var fromLs = null;
    try { fromLs = normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { fromLs = null; }
    state = fromLs || blankState(seed());
    migrate(seed());
    return state;
  }
  /* load the authoritative copy (IndexedDB) before serving any API call */
  var ready = (function () {
    return idbGet().then(function (stored) {
      var local = null;
      try { local = normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) {}
      stored = normalize(stored);
      if (stored) {
        state = stored;
        // if the browser mirror somehow knows newer data, prefer it
        if (local && (local.savedAt || 0) > (stored.savedAt || 0)) state = local;
      } else if (local) {
        state = local;
        mirror(); idbSet(state).catch(function () {});
      } else {
        state = blankState(seed());
        mirror(); idbSet(state).catch(function () {});
      }
      migrate(seed());
      return state;
    }).catch(function () {
      st();
      return state;
    });
  })();
  window.anfalReady = ready;
  // Upgrade an older stored catalog in place: fill in missing product/category images from the current seed
  function migrate(seedData) {
    var changed = false;
    var sp = {};
    (seedData.products || []).forEach(function (p) { sp[String(p.name).trim()] = p; });
    (state.products || []).forEach(function (p) {
      if (!p.image_url) {
        var m = sp[String(p.name).trim()];
        if (m && m.image_url) { p.image_url = m.image_url; changed = true; }
      }
    });
    var sc = {};
    (seedData.categories || []).forEach(function (c) { sc[String(c.name).trim()] = c; });
    (state.categories || []).forEach(function (c) {
      if (!c.image_url) {
        var m = sc[String(c.name).trim()];
        if (m && m.image_url) { c.image_url = m.image_url; changed = true; }
      }
    });
    if (changed) persist();
  }
  function num(n) { return Math.round(Number(n) || 0); }
  function catName(id) { var c = st().categories.find(function (x) { return x.id === Number(id); }); return c ? c.name : null; }
  function storePayload() {
    var s = st();
    return {
      settings: s.settings,
      categories: s.categories.slice().sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); }),
      products: s.products.filter(function (p) { return p.active !== 0 && p.active !== false; })
        .map(function (p) { return Object.assign({}, p, { category_name: catName(p.category_id) }); })
    };
  }
  function json(obj, status) {
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }
  function banner() {
    if (document.getElementById('anfal-demo-banner')) return;
    var b = document.createElement('div');
    b.id = 'anfal-demo-banner';
    b.style.cssText = 'position:fixed;top:0;right:0;left:0;z-index:99999;background:#16794b;color:#fff;font:600 12px/1.5 system-ui,sans-serif;padding:5px 8px;text-align:center;direction:rtl';
    b.textContent = 'النسخة المحلية v1.8 — الإدارة كاملة في زر «الإدارة» (كلمة المرور anfal2026) والطلبات تصلك على واتساب';
    document.body.appendChild(b);
  }

  function body(init) { try { return JSON.parse((init && init.body) || '{}'); } catch (e) { return {}; } }

  function handleStore() { banner(); return json(storePayload()); }

  function handleOrder(init) {
    var b = body(init), items = b.items || [], s2 = st();
    var subtotal = 0;
    var lines = [];
    items.forEach(function (it) {
      var p = s2.products.find(function (x) { return String(x.id) === String(it.id); });
      if (!p) return;
      var q = Number(it.quantity) || 0;
      subtotal += Number(p.price) * q;
      lines.push({ product_name: p.name, quantity: q, unit_price: Number(p.price) });
      if (Number(p.stock) > 0) p.stock = Math.max(0, Number(p.stock) - q);
    });
    var set = s2.settings, fee = 0;
    if (b.fulfillment === 'delivery') {
      var perKm = Math.max(0, Number(set.price_per_km) || 0);
      var min = Math.max(0, Number(set.min_delivery_fee) || 0);
      var max = Math.max(0, Number(set.max_delivery_fee) || 0);
      fee = (Number(b.distance_km) || 0) * perKm;
      if (min > 0 && fee < min) fee = min;
      if (max > 0 && fee > max) fee = max;
    }
    var orderId = s2.nextOrderId++;
    s2.orders.unshift({
      id: orderId, customer_name: b.customer_name || '', phone: b.phone || '', address: b.address || '',
      fulfillment: b.fulfillment || 'delivery', distance_km: Number(b.distance_km) || 0,
      payment_method: b.payment_method || '', notes: b.notes || '',
      subtotal: num(subtotal), delivery_fee: num(fee), total: num(subtotal + fee),
      status: 'new', created_at: new Date().toISOString().slice(0, 19).replace('T', ' '), items: lines
    });
    persist();
    return json({
      order_id: orderId, subtotal: num(subtotal), delivery_fee: num(fee), total: num(subtotal + fee),
      currency: set.currency || 'SDG', store_name: set.store_name || 'المتجر',
      whatsapp_number: set.whatsapp_number || '', local: true
    });
  }

  function adminProducts() {
    var s2 = st();
    return s2.products.slice().reverse().map(function (p) { return Object.assign({}, p, { category_name: catName(p.category_id) }); });
  }
  function handleProductCreate(init) {
    var b = body(init), s2 = st();
    if (!String(b.name || '').trim()) return json({ error: 'اسم المنتج مطلوب' }, 400);
    if (!Number.isFinite(Number(b.price)) || Number(b.price) < 0) return json({ error: 'سعر المنتج غير صالح' }, 400);
    var cid = b.category_id === null || b.category_id === '' || b.category_id === undefined ? null : Number(b.category_id);
    if (cid !== null && !s2.categories.find(function (c) { return c.id === cid; })) return json({ error: 'الفئة غير موجودة' }, 400);
    var p = {
      id: s2.nextProductId++, name: String(b.name).trim(), description: String(b.description || '').slice(0, 1000),
      price: Number(b.price), category_id: cid, image_url: String(b.image_url || ''),
      unit_label: String(b.unit_label || 'للوحدة').trim(), stock: Number(b.stock) || 0,
      active: b.active === false || b.active === 'false' ? 0 : 1
    };
    s2.products.unshift(p);   // newest first so it is instantly visible in its category
    persist();
    return json({ id: p.id }, 201);
  }
  function handleProductUpdate(id, init) {
    var b = body(init), s2 = st();
    var p = s2.products.find(function (x) { return x.id === Number(id); });
    if (!p) return json({ error: 'المنتج غير موجود' }, 404);
    if (String(b.name || '').trim()) p.name = String(b.name).trim();
    if (b.description !== undefined) p.description = String(b.description).slice(0, 1000);
    if (b.price !== undefined && Number.isFinite(Number(b.price))) p.price = Number(b.price);
    if (b.category_id !== undefined) p.category_id = b.category_id === null || b.category_id === '' ? null : Number(b.category_id);
    if (b.image_url !== undefined) p.image_url = String(b.image_url || '');
    if (b.unit_label !== undefined) p.unit_label = String(b.unit_label || 'للوحدة');
    if (b.stock !== undefined) p.stock = Number(b.stock) || 0;
    if (b.active !== undefined) p.active = b.active === false || b.active === 'false' ? 0 : 1;
    persist();
    return json({ ok: true });
  }
  function handleProductDelete(id) {
    var s2 = st(), i = s2.products.findIndex(function (x) { return x.id === Number(id); });
    if (i < 0) return json({ error: 'المنتج غير موجود' }, 404);
    var used = s2.orders.some(function (o) { return (o.items || []).some(function (it) { return it.product_name === s2.products[i].name; }); });
    if (used) { s2.products[i].active = 0; persist(); return json({ ok: true, archived: true }); }
    s2.products.splice(i, 1);
    persist();
    return json({ ok: true, archived: false });
  }
  function handleCategoryCreate(init) {
    var b = body(init), s2 = st();
    var name = String(b.name || '').trim();
    if (!name || name.length > 80) return json({ error: 'اسم الفئة مطلوب (حتى 80 حرفاً)' }, 400);
    if (s2.categories.some(function (c) { return c.name === name; })) return json({ error: 'الفئة موجودة بالفعل' }, 409);
    var c = {
      id: s2.nextCategoryId++, name: name, image_url: String(b.image_url || ''),
      sort_order: Number.isFinite(Number(b.sort_order)) && String(b.sort_order) !== '' ? Number(b.sort_order) : s2.categories.length
    };
    s2.categories.push(c);
    persist();
    return json({ id: c.id }, 201);
  }
  function handleCategoryUpdate(id, init) {
    var b = body(init), s2 = st();
    var c = s2.categories.find(function (x) { return x.id === Number(id); });
    if (!c) return json({ error: 'الفئة غير موجودة' }, 404);
    var name = String(b.name || '').trim();
    if (!name) return json({ error: 'اسم الفئة مطلوب' }, 400);
    if (s2.categories.some(function (x) { return x.id !== c.id && x.name === name; })) return json({ error: 'يوجد فئة أخرى بالاسم نفسه' }, 409);
    c.name = name;
    if (b.image_url !== undefined) c.image_url = String(b.image_url || '');
    if (b.sort_order !== undefined && Number.isFinite(Number(b.sort_order))) c.sort_order = Number(b.sort_order);
    persist();
    return json({ ok: true });
  }
  function handleCategoryDelete(id) {
    var s2 = st(), c = s2.categories.find(function (x) { return x.id === Number(id); });
    if (!c) return json({ error: 'الفئة غير موجودة' }, 404);
    var used = s2.products.filter(function (p) { return p.category_id === c.id && p.active !== 0; }).length;
    if (used > 0) return json({ error: 'لا يمكن حذف الفئة لأنها مرتبطة بـ ' + used + ' منتج. انقل المنتجات إلى فئة أخرى أولاً.' }, 409);
    s2.categories = s2.categories.filter(function (x) { return x.id !== c.id; });
    persist();
    return json({ ok: true });
  }
  function handleSettings(init) {
    var b = body(init), s2 = st();
    Object.keys(b || {}).forEach(function (k) {
      var v = b[k];
      if (['price_per_km', 'min_delivery_fee', 'max_delivery_fee', 'minimum_order'].indexOf(k) >= 0) s2.settings[k] = Number(v) || 0;
      else s2.settings[k] = v;
    });
    persist();
    return json({ ok: true });
  }

  function route(path, init) {
    var method = ((init && init.method) || 'GET').toUpperCase();
    var m;
    if (/\/api\/store$/.test(path)) return handleStore();
    if (/\/api\/orders$/.test(path) && method === 'POST') return handleOrder(init);

    if (/\/api\/admin\/session$/.test(path)) return json({ authenticated: authed });
    if (/\/api\/admin\/login$/.test(path) && method === 'POST') {
      var pass = String(body(init).password || '');
      if (pass === ADMIN_PASS) { authed = true; return json({ ok: true }); }
      return json({ error: 'كلمة المرور غير صحيحة' }, 401);
    }
    if (/\/api\/admin\/logout$/.test(path)) { authed = false; return json({ ok: true }); }
    if (!/\/api\/admin\//.test(path)) return json({ error: 'هذا الطلب غير متاح بدون خادم.' }, 404);
    if (!authed) return json({ error: 'انتهت الجلسة — سجّل الدخول من جديد' }, 401);

    if (/\/api\/admin\/orders$/.test(path)) return json(st().orders);
    if ((m = path.match(/\/api\/admin\/orders\/(\d+)\/status$/)) && method === 'PATCH') {
      var or = st().orders.find(function (o) { return o.id === Number(m[1]); });
      if (!or) return json({ error: 'الطلب غير موجود' }, 404);
      or.status = body(init).status || or.status; persist(); return json({ ok: true });
    }
    if ((m = path.match(/\/api\/admin\/orders\/(\d+)\/delivery-fee$/)) && method === 'PATCH') {
      var or2 = st().orders.find(function (o) { return o.id === Number(m[1]); });
      if (!or2) return json({ error: 'الطلب غير موجود' }, 404);
      var fee = Number(body(init).delivery_fee) || 0;
      or2.delivery_fee = fee; or2.total = Number(or2.subtotal) + fee; persist(); return json({ ok: true, total: or2.total });
    }
    if (/\/api\/admin\/products$/.test(path)) {
      if (method === 'GET') return json(adminProducts());
      if (method === 'POST') return handleProductCreate(init);
    }
    if ((m = path.match(/\/api\/admin\/products\/(\d+)$/))) {
      if (method === 'PUT' || method === 'PATCH') return handleProductUpdate(m[1], init);
      if (method === 'DELETE') return handleProductDelete(m[1]);
    }
    if (/\/api\/admin\/categories$/.test(path) && method === 'POST') return handleCategoryCreate(init);
    if ((m = path.match(/\/api\/admin\/categories\/(\d+)$/))) {
      if (method === 'PUT' || method === 'PATCH') return handleCategoryUpdate(m[1], init);
      if (method === 'DELETE') return handleCategoryDelete(m[1]);
    }
    if (/\/api\/admin\/settings$/.test(path) && (method === 'PUT' || method === 'POST')) return handleSettings(init);
    return json({ error: 'طلب غير معروف في الوضع المحلي' }, 404);
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path = url.split('?')[0];
    if (!/(^|\/)api\//.test(path)) return real(input, init);
    return real(input, init).then(function (r) {
      var ct = (r.headers.get('content-type') || '');
      if (r.ok && ct.indexOf('json') >= 0) return r;   // real server wins
      return ready.then(function () { return route(path, init); });
    }).catch(function () { return ready.then(function () { return route(path, init); }); });
  };

  // expose a tiny reset for troubleshooting from the browser console
  window.anfalLocalReset = function () { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP_KEY); state = null; idbSet({}).catch(function(){}); location.reload(); };
  // export / import the whole store as a JSON file (safe backup path)
  window.anfalExport = function () {
    var blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'anfal-store-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
  };
})();
