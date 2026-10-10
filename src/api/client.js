const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('voltaic_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

// Stations API
export const stationsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.city && params.city !== 'All Cities') query.set('city', params.city);
    if (params.operator && params.operator !== 'All Operators') query.set('operator', params.operator);
    if (params.status && params.status !== 'All') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    const qs = query.toString();
    return request(`/stations${qs ? `?${qs}` : ''}`);
  },
  getById: (id) => request(`/stations/${id}`),
  reportIssue: (id, payload) =>
    request(`/stations/${id}/report`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// Bookings API
export const bookingsApi = {
  getAll: (userId) => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return request(`/bookings${qs}`);
  },
  getById: (id) => request(`/bookings/${id}`),
  create: (bookingData) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),
  cancel: (id) =>
    request(`/bookings/${id}/cancel`, {
      method: 'PATCH',
    }),
};

// Auth API
export const authApi = {
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  google: (payload) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendPhoneOtp: (phone) =>
    request('/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyPhoneOtp: (payload) =>
    request('/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) =>
    request('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
};

// Alerts API
export const alertsApi = {
  getAll: () => request('/alerts'),
  create: (alertData) =>
    request('/alerts', {
      method: 'POST',
      body: JSON.stringify(alertData),
    }),
  resolve: (id) =>
    request(`/alerts/${id}/resolve`, {
      method: 'PATCH',
    }),
  dismiss: (id) =>
    request(`/alerts/${id}`, {
      method: 'DELETE',
    }),
};

// Analytics API
export const analyticsApi = {
  get: () => request('/analytics'),
};
