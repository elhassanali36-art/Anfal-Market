import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getApiBaseUrl() {
  const override = await AsyncStorage.getItem('anfal.apiBaseUrl');
  const configured = override || Constants.expoConfig?.extra?.apiBaseUrl || '';
  return configured.replace(/\/+$/, '');
}

export async function api(path, options = {}) {
  const base = await getApiBaseUrl();
  if (!base || base.includes('YOUR-ANFAL-API-DOMAIN') || base.includes('example')) {
    throw new Error('يرجى ضبط رابط خادم المتجر أولاً من زر الإعدادات.');
  }
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new Error('تعذر الاتصال بالمتجر. تحقق من الإنترنت ورابط الخادم.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `فشل الطلب (${response.status})`);
  return data;
}
