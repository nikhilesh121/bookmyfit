import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { router } from 'expo-router';

export const API_BASE = (Constants.expoConfig?.extra?.apiUrl as string) || 'http://localhost:3003';

// ── Token helpers ───────────────────────────────────────────
export const getToken = () => SecureStore.getItemAsync('bmf_token');
export const getRefreshToken = () => SecureStore.getItemAsync('bmf_refresh');
export const setTokens = (access: string, refresh: string) =>
  Promise.all([
    SecureStore.setItemAsync('bmf_token', access),
    SecureStore.setItemAsync('bmf_refresh', refresh),
  ]);
export const clearTokens = () =>
  Promise.all([
    SecureStore.deleteItemAsync('bmf_token'),
    SecureStore.deleteItemAsync('bmf_refresh'),
  ]);
export const setUser = (user: any) =>
  SecureStore.setItemAsync('bmf_user', JSON.stringify(user));
export const getUser = async () => {
  const s = await SecureStore.getItemAsync('bmf_user');
  return s ? JSON.parse(s) : null;
};
export const logout = async () => {
  await clearTokens();
  await SecureStore.deleteItemAsync('bmf_user');
  router.replace('/login');
};

// ── Core fetch ──────────────────────────────────────────────
async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  if (res.status === 401) {
    await clearTokens();
    router.replace('/login');
    throw new Error('Session expired');
  }

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) throw new Error(data?.message || data || `HTTP ${res.status}`);
  return data as T;
}

// ── Typed API ────────────────────────────────────────────────
export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ── Domain-specific helpers ──────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string, deviceId: string, name?: string) =>
    api.post('/auth/otp/verify', { phone, code, deviceId, name }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/users/me'),
};

export const gymsApi = {
  list: (params?: { city?: string; tier?: string; search?: string; page?: number; limit?: number; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.city) q.set('city', params.city);
    if (params?.tier) q.set('tier', params.tier);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.category) q.set('category', params.category);
    return api.get(`/gyms?${q.toString()}`);
  },
  getById: (id: string) => api.get(`/gyms/${id}`),
  categories: () => api.get('/master/categories'),
  recommended: () => api.get('/gyms/recommended'),
};

export const subscriptionsApi = {
  plans: () => api.get('/subscriptions/plans'),
  mySubscriptions: () => api.get('/subscriptions'),
  /** Purchase a subscription — creates DB record + Cashfree order */
  purchase: (body: {
    planType: 'multigym_elite' | 'multigym_max' | 'gym_specific';
    gymId?: string;
    gymPlanId?: string;
    durationMonths: number;
    amountOverride?: number;
    isDayPass?: boolean;
    ptAddon?: boolean;
    couponCode?: string;
  }) => api.post('/subscriptions/purchase', body),
  /** Legacy alias used in order.tsx - maps planId to planType */
  createOrder: (body: { planId: string; gymId?: string; durationMonths: number; couponCode?: string; ptAddon?: boolean; totalAmount?: number; isDayPass?: boolean }) => {
    const planTypeMap: Record<string, string> = {
      multigym_elite: 'multigym_elite',
      multigym_max: 'multigym_max',
    };
    const planType = planTypeMap[body.planId] || 'gym_specific';
    return api.post('/subscriptions/purchase', {
      planType,
      gymId: planType === 'gym_specific' ? body.gymId : undefined,
      durationMonths: body.durationMonths,
      amountOverride: planType === 'gym_specific' ? body.totalAmount : undefined,
      isDayPass: body.isDayPass || body.durationMonths === 0,
      couponCode: body.couponCode,
      ptAddon: body.ptAddon,
    });
  },
  verifyPayment: (body: { orderId: string; paymentId: string; signature: string }) =>
    api.post('/payments/webhook', body),
  verify: (subId: string) => api.post(`/subscriptions/${subId}/verify`, {}),
  invoice: (id: string) => api.get(`/subscriptions/${id}/invoice`),
};

export const gymPlansApi = {
  forGym: (gymId: string) => api.get(`/gym-plans/by-gym/${gymId}`),
};

export const qrApi = {
  generate: (subscriptionId: string) =>
    api.post('/qr/generate', { subscriptionId }),
  validate: (qrToken: string, gymId: string) =>
    api.post('/qr/validate', { qrToken, gymId }),
};

export const checkinApi = {
  history: (limit = 50) => api.get(`/checkins/my-history?limit=${limit}`),
};

export const storeApi = {
  products: (category?: string) =>
    api.get(`/store/products${category ? `?category=${category}` : ''}`),
  createOrder: (items: { productId: string; quantity: number }[]) =>
    api.post('/store/orders', { items }),
  myOrders: () => api.get('/store/orders/my'),
};

export const gymStaffApi = {
  myGym: () => api.get('/gyms/my-gym'),
  myMembers: () => api.get('/gyms/my-members'),
  myCheckins: (page = 1, limit = 20) => api.get(`/gyms/my-checkins?page=${page}&limit=${limit}`),
  todayStats: () => api.get('/checkins/today'),
  // Uses the enforced scan endpoint: validates subscription, 1-per-day limit, records attendance
  validateQr: (qrToken: string, gymId: string, userId?: string) =>
    api.post('/checkins/scan', { qrToken, gymId, userId }),
  settlements: () => api.get('/settlements/my-gym'),
};

export const miscApi = {
  notifications: () => api.get('/notifications'),
  videos: () => api.get('/videos'),
  submitReview: (body: { gymId?: string; trainerId?: string; rating: number; text?: string }) =>
    api.post('/ratings', body),
};

export const usersApi = {
  me: () => api.get('/users/me'),
  update: (body: { name?: string; email?: string }) => api.put('/users/me', body),
};

export const couponsApi = {
  validate: (code: string, planId?: string) =>
    api.post('/coupons/validate', { code, planId }),
};

export const trainersApi = {
  listByGym: (gymId: string) => api.get(`/trainers?gymId=${gymId}`),
  get: (id: string) => api.get(`/trainers/${id}`),
  book: (trainerId: string, body: { userId: string; sessions: number; sessionDate: string; phone: string }) =>
    api.post(`/trainers/${trainerId}/book`, body),
};

export const wellnessApi = {
  list: (params?: { city?: string; serviceType?: string }) => {
    const q = params ? '?' + Object.entries(params).filter(([,v]) => v).map(([k, v]) => `${k}=${v}`).join('&') : '';
    return api.get(`/wellness${q}`);
  },
  services: (partnerId: string) => api.get(`/wellness/${partnerId}/services`),
  book: (body: { userId: string; serviceId: string; bookingDate: string; phone: string }) =>
    api.post('/wellness/book', body),
};

export const slotsApi = {
  list: (gymId: string, date: string) => api.get(`/slots?gymId=${gymId}&date=${date}`),
  book: (slotId: string) => api.post(`/slots/${slotId}/book`),
  cancel: (slotId: string) => api.del(`/slots/${slotId}/book`),
  myBookings: () => api.get('/slots/my-bookings'),
};
