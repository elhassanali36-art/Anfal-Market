import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { api, getApiBaseUrl } from './src/api';

const GREEN = '#16794b';
const money = (value, currency = 'SDG') => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
const asBool = value => String(value).toLowerCase() === 'true';

export default function App() {
  const [store, setStore] = useState({ settings: {}, products: [], categories: [] });
  const [cart, setCart] = useState({});
  const [tab, setTab] = useState('shop');
  const [categoryId, setCategoryId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', distance: '5', notes: '', fulfillment: 'delivery', payment: 'cash' });
  const [lastOrder, setLastOrder] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await api('/api/store');
      setStore(data);
      const s = data.settings || {};
      setCustomer(prev => ({ ...prev, fulfillment: !asBool(s.delivery_enabled) && asBool(s.pickup_enabled) ? 'pickup' : prev.fulfillment, payment: !asBool(s.cash_enabled) && asBool(s.bankak_enabled) ? 'bankak' : !asBool(s.cash_enabled) && !asBool(s.bankak_enabled) && asBool(s.okash_enabled) ? 'okash' : !asBool(s.cash_enabled) && !asBool(s.bankak_enabled) && !asBool(s.okash_enabled) && asBool(s.fawry_enabled) ? 'fawry' : prev.payment }));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); getApiBaseUrl().then(setApiUrl); }, [load]);

  const products = useMemo(() => store.products.filter(p =>
    (!categoryId || Number(p.category_id) === Number(categoryId)) &&
    (!query.trim() || `${p.name} ${p.description || ''} ${p.category_name || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  ), [store.products, categoryId, query]);
  const cartItems = useMemo(() => Object.entries(cart).map(([id, quantity]) => ({
    product: store.products.find(p => String(p.id) === id), quantity,
  })).filter(x => x.product && x.quantity > 0), [cart, store.products]);
  const subtotal = cartItems.reduce((sum, x) => sum + Number(x.product.price) * x.quantity, 0);
  const settings = store.settings || {};
  const currency = settings.currency || 'SDG';
  const deliveryFee = customer.fulfillment === 'delivery'
    ? Math.min(Number(settings.max_delivery_fee || 0) > 0 ? Number(settings.max_delivery_fee) : Infinity,
        Math.max(Number(settings.min_delivery_fee || 0), Math.max(0, Number(customer.distance || 0)) * Number(settings.price_per_km || 0)) )
    : 0;

  const updateQty = (product, delta) => setCart(prev => {
    const id = String(product.id), step = /كيلو|كجم|kg/i.test(product.unit_label || '') ? 0.5 : 1;
    const next = Math.round(((prev[id] || 0) + delta * step) * 1000) / 1000;
    if (next <= 0) { const clone = { ...prev }; delete clone[id]; return clone; }
    if (next > Number(product.stock)) { Alert.alert('المخزون', 'الكمية المطلوبة أكبر من المخزون المتاح.'); return prev; }
    return { ...prev, [id]: next };
  });

  const submitOrder = async () => {
    try {
      if (cartItems.length === 0) throw new Error('أضف منتجات إلى السلة أولاً.');
      const payload = {
        customer_name: customer.name.trim(), phone: customer.phone.trim(), address: customer.address.trim(),
        fulfillment: customer.fulfillment, distance_km: customer.fulfillment === 'delivery' ? Number(customer.distance) : 0,
        payment_method: customer.payment, notes: customer.notes.trim(),
        items: cartItems.map(x => ({ id: x.product.id, quantity: x.quantity })),
      };
      const result = await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      setCart({}); setCheckoutOpen(false); setLastOrder(result); setTab('shop');
      Alert.alert('تم استلام طلبك', `رقم الطلب: ${result.order_id}\nالإجمالي: ${money(result.total, result.currency || currency)}\nسيتواصل المتجر معك لتأكيد الطلب.`);
    } catch (e) { Alert.alert('تعذر إرسال الطلب', e.message); }
  };

  const saveApiUrl = async () => {
    const clean = apiUrl.trim().replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(clean)) { Alert.alert('رابط غير صالح', 'أدخل رابطاً يبدأ بـ https:// أو http://'); return; }
    await AsyncStorage.setItem('anfal.apiBaseUrl', clean);
    setSettingsOpen(false); await load();
  };

  const renderProduct = ({ item }) => {
    const quantity = cart[String(item.id)] || 0;
    return <View style={styles.productCard}>
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" /> : <View style={[styles.productImage, styles.imagePlaceholder]}><Text style={styles.placeholderIcon}>🛒</Text></View>}
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>{money(item.price, currency)}</Text>
      <Text style={styles.unitText}>{item.unit_label || 'للوحدة'}</Text>
      <Text style={styles.stockText}>{Number(item.stock) > 0 ? `متوفر: ${item.stock}` : 'غير متوفر'}</Text>
      {quantity > 0 ? <View style={styles.quantityRow}>
        <Pressable accessibilityLabel="زيادة الكمية" style={styles.qtyButton} onPress={() => updateQty(item, 1)}><Text style={styles.qtyText}>+</Text></Pressable>
        <Text style={styles.qtyValue}>{quantity}</Text>
        <Pressable accessibilityLabel="تقليل الكمية" style={styles.qtyButton} onPress={() => updateQty(item, -1)}><Text style={styles.qtyText}>−</Text></Pressable>
      </View> : <Pressable disabled={Number(item.stock) <= 0} style={[styles.addButton, Number(item.stock) <= 0 && styles.disabled]} onPress={() => updateQty(item, 1)}><Text style={styles.addButtonText}>أضف للسلة</Text></Pressable>}
    </View>;
  };

  return <SafeAreaView style={styles.safe}>
    <ExpoStatusBar style="light" backgroundColor={GREEN} />
    <StatusBar barStyle="light-content" backgroundColor={GREEN} />
    <View style={[styles.header, { backgroundColor: settings.primary_color || GREEN }]}>
      <View style={{ flex: 1 }}><Text style={styles.storeName}>{settings.store_name || 'الأنفال ماركت'}</Text><Text style={styles.tagline}>{settings.store_tagline || 'طلباتك اليومية تصل إليك بسهولة'}</Text></View>
      {settings.store_logo_url ? <Image source={{ uri: settings.store_logo_url }} style={styles.storeLogo} resizeMode="contain" /> : <View style={styles.storeLogoFallback}><Text style={{ color: settings.primary_color || GREEN, fontWeight: '900', fontSize: 22 }}>أ</Text></View>}
      <Pressable style={styles.settingsButton} onPress={() => { getApiBaseUrl().then(setApiUrl); setSettingsOpen(true); }}><Text style={styles.settingsButtonText}>⚙</Text></Pressable>
    </View>
    <View style={styles.nav}>
      <Pressable onPress={() => setTab('shop')} style={[styles.navItem, tab === 'shop' && styles.navActive]}><Text style={[styles.navText, tab === 'shop' && styles.navTextActive]}>المتجر</Text></Pressable>
      <Pressable onPress={() => setTab('cart')} style={[styles.navItem, tab === 'cart' && styles.navActive]}><Text style={[styles.navText, tab === 'cart' && styles.navTextActive]}>السلة ({cartItems.length})</Text></Pressable>
    </View>

    {loading && store.products.length === 0 ? <View style={styles.center}><ActivityIndicator size="large" color={GREEN} /><Text style={styles.muted}>جارٍ تحميل المتجر...</Text></View> : error && store.products.length === 0 ? <View style={styles.errorBox}><Text style={styles.errorTitle}>لم يتم الاتصال بالمتجر</Text><Text style={styles.errorText}>{error}</Text><Pressable style={styles.primaryButton} onPress={() => load()}><Text style={styles.primaryButtonText}>إعادة المحاولة</Text></Pressable><Pressable style={styles.outlineButton} onPress={() => setSettingsOpen(true)}><Text style={styles.outlineButtonText}>ضبط رابط الخادم</Text></Pressable></View> : tab === 'shop' ? <>
      <TextInput value={query} onChangeText={setQuery} placeholder="ابحث عن منتج..." placeholderTextColor="#7a8580" style={styles.search} textAlign="right" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <Pressable onPress={() => setCategoryId(null)} style={[styles.categoryPill, categoryId === null && styles.categorySelected]}><Text style={[styles.categoryText, categoryId === null && styles.categoryTextSelected]}>الكل ({store.products.length})</Text></Pressable>
        {store.categories.map(c => <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={[styles.categoryPill, Number(categoryId) === Number(c.id) && styles.categorySelected]}><Text style={[styles.categoryText, Number(categoryId) === Number(c.id) && styles.categoryTextSelected]}>{c.name} ({store.products.filter(p => Number(p.category_id) === Number(c.id)).length})</Text></Pressable>)}
      </ScrollView>
      <FlatList data={products} keyExtractor={item => String(item.id)} renderItem={renderProduct} numColumns={2} columnWrapperStyle={styles.productRow} contentContainerStyle={styles.productList} refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>لا توجد منتجات في هذا التصنيف حالياً.</Text></View>} />
    </> : <ScrollView contentContainerStyle={styles.cartContent}>
      <Text style={styles.sectionTitle}>سلة المشتريات</Text>
      {cartItems.length === 0 ? <View style={styles.center}><Text style={styles.muted}>السلة فارغة. اختر منتجاتك من المتجر.</Text><Pressable style={styles.primaryButton} onPress={() => setTab('shop')}><Text style={styles.primaryButtonText}>تصفح المنتجات</Text></Pressable></View> : <>
        {cartItems.map(({ product, quantity }) => <View key={product.id} style={styles.cartLine}><View style={{ flex: 1 }}><Text style={styles.cartProduct}>{product.name}</Text><Text style={styles.muted}>{money(product.price, currency)} · {product.unit_label}</Text></View><View style={styles.quantityRow}><Pressable style={styles.qtyButton} onPress={() => updateQty(product, 1)}><Text style={styles.qtyText}>+</Text></Pressable><Text style={styles.qtyValue}>{quantity}</Text><Pressable style={styles.qtyButton} onPress={() => updateQty(product, -1)}><Text style={styles.qtyText}>−</Text></Pressable></View><Text style={styles.lineTotal}>{money(Number(product.price) * quantity, currency)}</Text></View>)}
        <View style={styles.summary}><View style={styles.summaryRow}><Text style={styles.muted}>قيمة المنتجات</Text><Text style={styles.summaryValue}>{money(subtotal, currency)}</Text></View><View style={styles.summaryRow}><Text style={styles.muted}>التوصيل (تقديري)</Text><Text style={styles.summaryValue}>{money(deliveryFee, currency)}</Text></View><View style={styles.summaryRow}><Text style={styles.totalLabel}>الإجمالي التقديري</Text><Text style={styles.totalValue}>{money(subtotal + deliveryFee, currency)}</Text></View></View>
        <Pressable style={styles.primaryButton} onPress={() => setCheckoutOpen(true)}><Text style={styles.primaryButtonText}>إتمام الطلب</Text></Pressable>
      </>}
    </ScrollView>}

    <Modal visible={settingsOpen} animationType="slide" transparent onRequestClose={() => setSettingsOpen(false)}><View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}><ScrollView keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>إعداد اتصال المتجر</Text><Text style={styles.fieldLabel}>رابط API المنشور (بدون / في النهاية)</Text><TextInput value={apiUrl} onChangeText={setApiUrl} placeholder="https://shop.example.com" autoCapitalize="none" keyboardType="url" style={styles.input} textAlign="left"/><Text style={styles.helpText}>يجب نشر خادم الأنفال أولاً عبر HTTPS. لا تستخدم localhost على هاتفك؛ أدخل عنوان الخادم الذي يمكن للهاتف الوصول إليه.</Text><Pressable style={styles.primaryButton} onPress={saveApiUrl}><Text style={styles.primaryButtonText}>حفظ والاتصال</Text></Pressable><Pressable style={styles.outlineButton} onPress={() => setSettingsOpen(false)}><Text style={styles.outlineButtonText}>إغلاق</Text></Pressable></ScrollView></KeyboardAvoidingView></View></Modal>

    <Modal visible={checkoutOpen} animationType="slide" transparent onRequestClose={() => setCheckoutOpen(false)}><View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalCard}><ScrollView keyboardShouldPersistTaps="handled"><Text style={styles.modalTitle}>بيانات إتمام الطلب</Text>
      <Text style={styles.fieldLabel}>الاسم *</Text><TextInput value={customer.name} onChangeText={v => setCustomer(p => ({ ...p, name: v }))} style={styles.input} textAlign="right" placeholder="الاسم الكامل" />
      <Text style={styles.fieldLabel}>رقم الهاتف *</Text><TextInput value={customer.phone} onChangeText={v => setCustomer(p => ({ ...p, phone: v }))} style={styles.input} keyboardType="phone-pad" textAlign="right" placeholder="رقم للتواصل" />
      <Text style={styles.fieldLabel}>طريقة الاستلام</Text><View style={styles.choiceRow}>{asBool(settings.delivery_enabled) && <Pressable onPress={() => setCustomer(p => ({ ...p, fulfillment: 'delivery' }))} style={[styles.choice, customer.fulfillment === 'delivery' && styles.choiceSelected]}><Text style={styles.choiceText}>توصيل للمنزل</Text></Pressable>}{asBool(settings.pickup_enabled) && <Pressable onPress={() => setCustomer(p => ({ ...p, fulfillment: 'pickup' }))} style={[styles.choice, customer.fulfillment === 'pickup' && styles.choiceSelected]}><Text style={styles.choiceText}>استلام من المتجر</Text></Pressable>}</View>
      {customer.fulfillment === 'delivery' && <><Text style={styles.fieldLabel}>عنوان التوصيل *</Text><TextInput value={customer.address} onChangeText={v => setCustomer(p => ({ ...p, address: v }))} style={styles.input} textAlign="right" placeholder="الحي، الشارع، أقرب علامة مميزة"/><Text style={styles.fieldLabel}>المسافة بالكيلومتر (تقديرية) *</Text><TextInput value={customer.distance} onChangeText={v => setCustomer(p => ({ ...p, distance: v }))} style={styles.input} keyboardType="decimal-pad" textAlign="right"/><Text style={styles.helpText}>رسوم التوصيل تقديرية وفق إعدادات المتجر؛ لا يتم تحديد المسافة آلياً عبر GPS في هذه النسخة.</Text></>}
      <Text style={styles.fieldLabel}>طريقة الدفع</Text><View style={styles.choiceRow}>{[['cash','نقداً','cash_enabled'],['bankak','بنكك','bankak_enabled'],['okash','أوكاش','okash_enabled'],['fawry','فوري','fawry_enabled']].filter(x => asBool(settings[x[2]])).map(x => <Pressable key={x[0]} onPress={() => setCustomer(p => ({ ...p, payment: x[0] }))} style={[styles.choice, customer.payment === x[0] && styles.choiceSelected]}><Text style={styles.choiceText}>{x[1]}</Text></Pressable>)}</View>
      <Text style={styles.fieldLabel}>ملاحظات (اختياري)</Text><TextInput value={customer.notes} onChangeText={v => setCustomer(p => ({ ...p, notes: v }))} style={[styles.input, { minHeight: 64 }]} multiline textAlign="right" placeholder="أي تفاصيل إضافية للطلب"/>
      <View style={styles.summary}><View style={styles.summaryRow}><Text style={styles.muted}>قيمة المنتجات</Text><Text style={styles.summaryValue}>{money(subtotal, currency)}</Text></View><View style={styles.summaryRow}><Text style={styles.muted}>التوصيل التقديري</Text><Text style={styles.summaryValue}>{money(deliveryFee, currency)}</Text></View><View style={styles.summaryRow}><Text style={styles.totalLabel}>الإجمالي التقديري</Text><Text style={styles.totalValue}>{money(subtotal + deliveryFee, currency)}</Text></View></View>
      <Pressable style={styles.primaryButton} onPress={submitOrder}><Text style={styles.primaryButtonText}>تأكيد وإرسال الطلب</Text></Pressable><Pressable style={styles.outlineButton} onPress={() => setCheckoutOpen(false)}><Text style={styles.outlineButtonText}>رجوع للسلة</Text></Pressable>
    </ScrollView></KeyboardAvoidingView></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7f5' }, header: { backgroundColor: GREEN, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeLogo: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#fff' }, storeLogoFallback: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, storeName: { color: '#fff', fontSize: 23, fontWeight: '800', textAlign: 'right' }, tagline: { color: '#e0f0e6', textAlign: 'right', marginTop: 4, fontSize: 12 }, settingsButton: { backgroundColor: '#ffffff24', width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, settingsButtonText: { color: '#fff', fontSize: 24 },
  nav: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e9e4' }, navItem: { flex: 1, alignItems: 'center', padding: 13 }, navActive: { borderBottomWidth: 3, borderBottomColor: GREEN }, navText: { color: '#68736d', fontWeight: '600' }, navTextActive: { color: GREEN }, search: { backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e0e7e2', color: '#15241b' },
  categories: { paddingHorizontal: 10, paddingBottom: 10, gap: 8, alignItems: 'center' }, categoryPill: { borderWidth: 1, borderColor: '#d7e2da', backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 9 }, categorySelected: { backgroundColor: GREEN, borderColor: GREEN }, categoryText: { color: '#3d4c43', fontSize: 12, fontWeight: '600' }, categoryTextSelected: { color: '#fff' },
  productList: { paddingHorizontal: 8, paddingBottom: 24 }, productRow: { gap: 8, justifyContent: 'space-between', marginBottom: 8 }, productCard: { width: '49%', backgroundColor: '#fff', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: '#e7ece8', overflow: 'hidden' }, productImage: { width: '100%', height: 112, borderRadius: 10, backgroundColor: '#edf3ee' }, imagePlaceholder: { alignItems: 'center', justifyContent: 'center' }, placeholderIcon: { fontSize: 38 }, productName: { color: '#18241c', fontSize: 14, fontWeight: '700', textAlign: 'right', marginTop: 9, minHeight: 38 }, productPrice: { color: GREEN, fontWeight: '800', fontSize: 15, textAlign: 'right', marginTop: 5 }, unitText: { textAlign: 'right', color: '#68736d', fontSize: 11, marginTop: 2 }, stockText: { textAlign: 'right', color: '#68736d', fontSize: 10, marginTop: 3 }, addButton: { backgroundColor: GREEN, paddingVertical: 9, borderRadius: 9, alignItems: 'center', marginTop: 9 }, addButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 }, disabled: { opacity: 0.4 }, quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 8 }, qtyButton: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#e7f3eb', alignItems: 'center', justifyContent: 'center' }, qtyText: { color: GREEN, fontWeight: '800', fontSize: 19, lineHeight: 22 }, qtyValue: { color: '#18241c', fontWeight: '800', minWidth: 24, textAlign: 'center' },
  center: { flex: 1, minHeight: 180, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 }, muted: { color: '#68736d', textAlign: 'right' }, errorBox: { margin: 20, padding: 20, borderRadius: 16, backgroundColor: '#fff', alignItems: 'stretch', gap: 12 }, errorTitle: { color: '#9d2c2c', fontSize: 18, fontWeight: '800', textAlign: 'right' }, errorText: { color: '#5e6962', textAlign: 'right', lineHeight: 22 }, primaryButton: { backgroundColor: GREEN, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 }, primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 15 }, outlineButton: { borderWidth: 1, borderColor: GREEN, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 8 }, outlineButtonText: { color: GREEN, fontWeight: '700' },
  cartContent: { padding: 16, paddingBottom: 40 }, sectionTitle: { color: '#17241b', fontWeight: '800', fontSize: 21, textAlign: 'right', marginBottom: 12 }, cartLine: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5ebe7' }, cartProduct: { textAlign: 'right', color: '#17241b', fontWeight: '700', marginBottom: 4 }, lineTotal: { color: GREEN, fontWeight: '800', fontSize: 12 }, summary: { backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e9e4', marginTop: 14, marginBottom: 12, gap: 10 }, summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, summaryValue: { color: '#28352d', fontWeight: '600' }, totalLabel: { color: '#18241c', fontWeight: '800', fontSize: 15 }, totalValue: { color: GREEN, fontWeight: '900', fontSize: 17 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0007' }, modalCard: { maxHeight: '92%', backgroundColor: '#f8faf8', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 }, modalTitle: { textAlign: 'right', fontSize: 21, color: '#17241b', fontWeight: '800', marginBottom: 16 }, fieldLabel: { textAlign: 'right', color: '#34433a', fontWeight: '700', marginTop: 12, marginBottom: 6 }, input: { backgroundColor: '#fff', borderColor: '#dce5de', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: '#18241c' }, helpText: { color: '#68736d', fontSize: 12, lineHeight: 19, textAlign: 'right', marginTop: 7 }, choiceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7, marginTop: 4 }, choice: { borderWidth: 1, borderColor: '#d6e1d9', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }, choiceSelected: { borderColor: GREEN, backgroundColor: '#e7f3eb' }, choiceText: { color: '#24352a', fontWeight: '600' }
});
