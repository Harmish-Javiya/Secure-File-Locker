/**
 * api.js — Axios instance with JWT auth, token refresh, and interceptors.
 * JWT is stored in memory (never localStorage/sessionStorage) for XSS safety.
 */

import axios from "axios";

// ─── In-memory token store ────────────────────────────────────────────────────
let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — auto-refresh on 401 ──────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh for auth endpoints to avoid loops
    const isAuthEndpoint =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register") ||
      originalRequest.url?.includes("/api/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          "http://localhost:5000/api/auth/refresh",
          {},
          { withCredentials: true }
        );
        const newToken = data.data?.access_token;
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAccessToken();
        // Dispatch event so App.js can redirect to login
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get("/api/auth/me"),
  refresh: () => api.post("/api/auth/refresh"),
  mfaSetup: () => api.post("/api/auth/mfa/setup"),
  mfaVerify: (token) => api.post("/api/auth/mfa/verify", { token }),
  mfaDisable: (token) => api.post("/api/auth/mfa/disable", { token }),
};

// ─── Files API ────────────────────────────────────────────────────────────────
export const filesAPI = {
  upload: (formData, onProgress) =>
    api.post("/api/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }),
  list: () => api.get("/api/files/"),
  download: (id) =>
    api.get(`/api/files/download/${id}`, { responseType: "blob" }),
  delete: (id) => api.delete(`/api/files/delete/${id}`),
  share: (id, expiresInHours = 24) =>
    api.post(`/api/files/share/${id}`, { expires_in_hours: expiresInHours }),
  getShared: (token) => api.get(`/api/files/shared/${token}`),
  getFile: (id) => api.get(`/api/files/${id}`),
};

export default api;
