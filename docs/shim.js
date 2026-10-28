/* الأنفال ماركت — وضع العرض المستقل (Standalone demo mode)
 * Activates ONLY when the real API is unreachable (e.g. hosted on GitHub Pages or bundled in the APK).
 * Browsing/cart/checkout work fully; the order is returned with totals and a WhatsApp deep link so the
 * merchant still receives real orders over WhatsApp. Admin endpoints are disabled in this mode. */
(function () {
  var DEMO = null, orderSeq = Number(localStorage.getItem('anfal.demo.orderSeq') || 1000);
  var real = window.fetch.bind(window);
  function loadDemo() {
    if (window.__ANFAL_DEMO__) return Promise.resolve(window.__ANFAL_DEMO__);
    if (!DEMO) DEMO = real('./demo-data.json').then(function (r) { return r.json(); });
    return DEMO;
  }
  function jsonResponse(obj, status) {
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  }
  function fmtMoney(n) { return Math.round(Number(n) || 0); }
  function banner() {
    if (document.getElementById('anfal-demo-banner')) return;
    var b = document.createElement('div');
    b.id = 'anfal-demo-banner';
    b.style.cssText = 'position:fixed;top:0;right:0;left:0;z-index:99999;background:#16794b;color:#fff;font:600 13px/1.6 system-ui,sans-serif;padding:6px 10px;text-align:center;direction:rtl';
    b.textContent = 'وضع العرض: التصفح والطلب عبر واتساب يعملان — لتشغيل الطلبات الآلية والإدارة اربط خادم المتجر';
    document.body.appendChild(b);
    window.scrollTo && setTimeout(function () { try { window.scrollBy(0, 0); } catch (e) {} }, 100);
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var path = url.split('?')[0];
    var isApi = /(^|\/)api\//.test(path);
    if (!isApi) return real(input, init);
    return real(input, init).then(function (r) {
      // a real server answered correctly -> never interfere
      var ct = (r.headers.get('content-type') || '');
      if (r.ok && ct.indexOf('json') >= 0) return r;
      return demoRoute(path, init);
    }).catch(function () { return demoRoute(path, init); });
  };
  function demoRoute(path, init) {
    var method = ((init && init.method) || 'GET').toUpperCase();
    if (/\/api\/store$/.test(path)) {
      return loadDemo().then(function (d) { banner(); return jsonResponse(d); });
    }
    if (/\/api\/orders$/.test(path) && method === 'POST') {
      return loadDemo().then(function (d) {
        var body = {};
        try { body = JSON.parse((init && init.body) || '{}'); } catch (e) {}
        var items = body.items || [];
        var subtotal = 0;
        items.forEach(function (it) {
          var p = (d.products || []).find(function (x) { return String(x.id) === String(it.id); });
          if (p) subtotal += Number(p.price) * Number(it.quantity || 0);
        });
        var s = d.settings || {}, fee = 0;
        if (body.fulfillment === 'delivery') {
          var perKm = Math.max(0, Number(s.price_per_km) || 0);
          var min = Math.max(0, Number(s.min_delivery_fee) || 0);
          var max = Math.max(0, Number(s.max_delivery_fee) || 0);
          fee = (Number(body.distance_km) || 0) * perKm;
          if (min > 0 && fee < min) fee = min;
          if (max > 0 && fee > max) fee = max;
        }
        orderSeq += 1;
        try { localStorage.setItem('anfal.demo.orderSeq', String(orderSeq)); } catch (e) {}
        return jsonResponse({
          order_id: orderSeq, subtotal: fmtMoney(subtotal), delivery_fee: fmtMoney(fee),
          total: fmtMoney(subtotal + fee), currency: s.currency || 'SDG',
          store_name: s.store_name || 'المتجر', whatsapp_number: s.whatsapp_number || '',
          demo: true
        });
      });
    }
    if (/\/api\/admin(\/|$)/.test(path)) {
      if (/session$/.test(path)) return Promise.resolve(jsonResponse({ authenticated: false }));
      return Promise.resolve(jsonResponse({ error: 'وضع العرض لا يدعم لوحة الإدارة — شغّل الخادم لتفعيلها.' }, 403));
    }
    return Promise.resolve(jsonResponse({ error: 'وضع العرض: هذا الطلب غير متاح دون خادم.' }, 404));
  }
})();
