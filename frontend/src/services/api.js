import axios from 'axios';

// In-memory fallback store so authentication works seamlessly even inside
// strict third-party iframe previews where localStorage/sessionStorage may be blocked.
const memoryStore = new Map();

export const safeStorage = {
  getItem(key) {
    if (memoryStore.has(key)) {
      return memoryStore.get(key);
    }
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null && val !== undefined) {
        memoryStore.set(key, val);
        return val;
      }
    } catch {
      // localStorage blocked by browser iframe privacy policy
    }
    try {
      const sVal = window.sessionStorage.getItem(key);
      if (sVal !== null && sVal !== undefined) {
        memoryStore.set(key, sVal);
        return sVal;
      }
    } catch {
      // sessionStorage blocked
    }
    return null;
  },

  setItem(key, value) {
    const str = String(value);
    memoryStore.set(key, str);
    try {
      window.localStorage.setItem(key, str);
    } catch {
      // ignore SecurityError / QuotaExceededError
    }
    try {
      window.sessionStorage.setItem(key, str);
    } catch {
      // ignore SecurityError
    }
  },

  removeItem(key) {
    memoryStore.delete(key);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
};

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAuthPublic = url.includes('/auth/login') || url.includes('/auth/register');
  if (!isAuthPublic) {
    const token = safeStorage.getItem('eventease_token');
    if (token) {
      // Send both standard Authorization and X-Auth-Token so preview reverse proxies
      // that strip or overwrite Authorization still pass the JWT cleanly to Spring Boot.
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Auth-Token'] = token;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
      safeStorage.removeItem('eventease_token');
      safeStorage.removeItem('eventease_user');
      window.dispatchEvent(new CustomEvent('eventease:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (typeof error?.response?.data === 'string' && error.response.data.trim()) {
    return error.response.data;
  }
  if (error?.message) {
    return error.message;
  }
  return fallback;
}

export default api;
