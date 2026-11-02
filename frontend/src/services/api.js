// frontend/src/services/api.js

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('w4eh_token');
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        localStorage.removeItem('w4eh_token');
        localStorage.removeItem('w4eh_user');
      }
      const error = new Error(data.message || 'Request failed');
      error.status = response.status;
      error.errors = data.errors;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  sendOtp: () => request('/auth/send-otp', { method: 'POST' }),
  verifyOtp: (otp_code) => request('/auth/verify-otp', { method: 'POST', body: { otp_code } }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Products
  getProducts: (all = false) => request(`/products${all ? '?all=1' : ''}`),
  getProduct: (id) => request(`/products/${id}`),
  getCategories: () => request('/categories'),
  createProduct: (data) => request('/admin/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/admin/products/${id}`, { method: 'PUT', body: data }),
  toggleProduct: (id) => request(`/admin/products/${id}/toggle`, { method: 'POST' }),

  // Addresses
  getAddresses: () => request('/addresses'),
  createAddress: (data) => request('/addresses', { method: 'POST', body: data }),
  getServiceAreas: () => request('/service-areas'),
  getAdminAddresses: (status = '') => request(`/admin/addresses${status ? `?status=${status}` : ''}`),
  approveAddress: (id) => request(`/admin/addresses/${id}/approve`, { method: 'POST' }),
  rejectAddress: (id, reason) => request(`/admin/addresses/${id}/reject`, { method: 'POST', body: { reason } }),

  // Orders
  createOrder: (orderData) => request('/orders', { method: 'POST', body: orderData }),
  getMyOrders: () => request('/orders'),
  getOrder: (id) => request(`/orders/${id}`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  getAdminOrders: (params = '') => request(`/admin/orders${params ? `?${params}` : ''}`),
  confirmOrder: (id) => request(`/admin/orders/${id}/confirm`, { method: 'POST' }),
  assignDelivery: (orderId, staff_user_id) => request(`/admin/orders/${orderId}/assign`, { method: 'POST', body: { staff_user_id } }),

  // Deliveries
  getMyDeliveries: (status = '') => request(`/staff/deliveries${status ? `?status=${status}` : ''}`),
  getDelivery: (id) => request(`/staff/deliveries/${id}`),
  updateDeliveryStatus: (id, data) => request(`/staff/deliveries/${id}/status`, { method: 'POST', body: data }),

  // Production & Quality
  getWaterSources: () => request('/production/sources'),
  getProductionBatches: () => request('/production/batches'),
  getProductionBatch: (id) => request(`/production/batches/${id}`),
  createProductionBatch: (data) => request('/production/batches', { method: 'POST', body: data }),
  getQualityTests: () => request('/quality/tests'),
  recordQualityTest: (batchId, testData) => request(`/production/batches/${batchId}/tests`, { method: 'POST', body: testData }),
  approveBatch: (id) => request(`/production/batches/${id}/approve`, { method: 'POST' }),
  rejectBatch: (id, reason) => request(`/production/batches/${id}/reject`, { method: 'POST', body: { rejection_reason: reason } }),

  // Bottles
  getBottles: (params = '') => request(`/bottles${params ? `?${params}` : ''}`),
  scanBottle: (code) => request(`/bottles/scan/${encodeURIComponent(code)}`),
  createBottle: (data) => request('/admin/bottles', { method: 'POST', body: data }),
  updateBottleStatus: (id, data) => request(`/bottles/${id}/status`, { method: 'POST', body: data }),
  inspectBottle: (id, data) => request(`/bottles/${id}/inspect`, { method: 'POST', body: data }),

  // Inventory
  getInventory: () => request('/inventory'),
  getInventoryMovements: (productId = null) => request(`/inventory/movements${productId ? `?product_id=${productId}` : ''}`),
  adjustInventory: (data) => request('/inventory/adjust', { method: 'POST', body: data }),

  // Subscriptions
  getSubscriptions: () => request('/subscriptions'),
  createSubscription: (data) => request('/subscriptions', { method: 'POST', body: data }),
  pauseSubscription: (id) => request(`/subscriptions/${id}/pause`, { method: 'POST' }),
  resumeSubscription: (id) => request(`/subscriptions/${id}/resume`, { method: 'POST' }),
  cancelSubscription: (id) => request(`/subscriptions/${id}/cancel`, { method: 'POST' }),
  generateSubscriptionOrder: (id) => request(`/admin/subscriptions/${id}/generate-order`, { method: 'POST' }),

  // Events
  getEvents: () => request('/events'),
  createEvent: (data) => request('/events', { method: 'POST', body: data }),
  quoteEvent: (id, data) => request(`/admin/events/${id}/quote`, { method: 'POST', body: data }),
  acceptEventQuote: (id) => request(`/events/${id}/accept`, { method: 'POST' }),
  convertEventOrder: (id) => request(`/admin/events/${id}/convert-order`, { method: 'POST' }),

  // Payments & Deposits
  getPayments: () => request('/payments'),
  confirmCodPayment: (id) => request(`/payments/confirm-cod/${id}`, { method: 'POST' }),
  demoOnlinePayment: (order_id) => request('/payments/demo-complete', { method: 'POST', body: { order_id } }),
  getDeposits: () => request('/deposits'),
  refundDeposit: (data) => request('/deposits/refund', { method: 'POST', body: data }),

  // Reports & Staff
  getDashboardReports: () => request('/reports/dashboard'),
  getStaff: (role = '') => request(`/staff${role ? `?role=${role}` : ''}`),
  getStaffRoles: () => request('/staff/roles'),
  createStaff: (data) => request('/staff', { method: 'POST', body: data }),
  getNotifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/mark-read', { method: 'POST' }),
  getAuditLogs: () => request('/audit-logs')
};
