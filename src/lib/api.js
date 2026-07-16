/**
 * src/lib/api.js
 *
 * Axios instance pre-configured with:
 *  - Base URL from VITE_API_URL
 *  - Request interceptor: attaches Supabase JWT Bearer token automatically
 *  - Response interceptor: normalises errors into { error: string }
 *
 * Usage:
 *   import api from '@/lib/api';
 *   const items = await api.get('/menu/items?category=coffee');
 *   const order = await api.post('/orders', { items, pickup_time });
 */

import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach fresh JWT ────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Session read failed — proceed without auth header
  }
  return config;
}, (error) => Promise.reject(error));

// ── Response interceptor — normalise errors ───────────────────────────────
api.interceptors.response.use(
  (response) => response.data,   // unwrap .data so callers get the payload directly
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;

// ── Typed helper functions ────────────────────────────────────────────────

/** Fetch all active menu items, optionally filtered */
export const getMenuItems = (params = {}) => api.get('/menu/items', { params });

/** Fetch menu categories */
export const getCategories = () => api.get('/menu/categories');

/** Place a new order */
export const createOrder = (body) => api.post('/orders', body);

/** Get a single order by ID */
export const getOrder = (id) => api.get(`/orders/${id}`);

/** Get all orders (staff: all, customer: own) */
export const getOrders = (params = {}) => api.get('/orders', { params });

/** Advance order status (staff only) */
export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/${id}/status`, { status });

/** Create Razorpay payment order */
export const createPaymentOrder = (order_id) =>
  api.post('/payments/create-order', { order_id });

/** Verify Razorpay payment signature */
export const verifyPayment = (body) => api.post('/payments/verify', body);

/** Submit a table reservation */
export const createReservation = (body) => api.post('/reservations', body);

/** Get reservations (staff only) */
export const getReservations = (params = {}) => api.get('/reservations', { params });

/** Update reservation status (staff only) */
export const updateReservationStatus = (id, status) =>
  api.patch(`/reservations/${id}/status`, { status });

/** Get loyalty status for current user */
export const getLoyaltyStatus = () => api.get('/loyalty/status');

/** Get admin dashboard stats */
export const getAdminStats = async () => {
  const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  return api.get(`/admin/stats?date=${localDate}`);
};

/** Get all users (owner only) */
export const getAdminUsers = () => api.get('/admin/users');

/** Update a user's role (owner only) */
export const updateUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });

/** Get all promo codes (owner only) */
export const getPromoCodes = () => api.get('/admin/promo-codes');

/** Create a promo code (owner only) */
export const createPromoCode = (body) => api.post('/admin/promo-codes', body);
