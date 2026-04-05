/**
 * api.js — Axios instance with JWT auth, token refresh, and interceptors.
 * Logic rebuilt to handle immediate header sync and prevent MFA refresh loops.
 */

import axios from "axios";

// ─── In-memory token store ────────────────────────────────────────────────────
let accessToken = localStorage.getItem('token');

export const setAccessToken = (token) => { 
  accessToken = token; 
  localStorage.setItem('token', token); 
  // LOGIC FIX: Sync the axios default header immediately upon setting
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

export const getAccessToken = () => accessToken;

export const clearAccessToken = () => { 
  accessToken = null; 
  localStorage.removeItem('token'); 
  // LOGIC FIX: Remove the header on logout
  delete api.defaults.headers.common['Authorization'];
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  timeout: 0,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Priority check: use the in-memory token if available
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — auto-refresh logic ──────────────────────────────
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

    // 1. Endpoints that should NEVER trigger a token refresh loop.
    // We add mfa/verify here so that a wrong code doesn't wipe the session.
    const isAuthEndpoint =
      originalRequest.url?.includes("/api/auth/login") ||
      originalRequest.url?.includes("/api/auth/register") ||
      originalRequest.url?.includes("/api/auth/refresh") ||
      originalRequest.url?.includes("/api/auth/mfa/verify") || 
      originalRequest.url?.includes("/api/auth/mfa/disable");

    // 2. Only attempt refresh if it's a 401 and NOT an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      
      // If the backend says credentials specifically failed, don't refresh
      if (
        error.response.data?.code === "INVALID_PASSWORD" || 
        error.response.data?.code === "INVALID_MFA" ||
        error.response.data?.code === "MFA_REQUIRED"
      ) {
        return Promise.reject(error);
      }

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
        
        // Refresh failed (refresh token expired) -> Hard Logout
        clearAccessToken();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API Helpers ────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get("/api/auth/me"),
  refresh: () => api.post("/api/auth/refresh"),
  mfaSetup: () => api.post("/api/auth/mfa/setup"),
  mfaVerify: (token) => api.post("/api/auth/mfa/verify", { token }), 
  mfaDisable: (password) => api.post("/api/auth/mfa/disable", { password }),
};

// ─── Files API Helpers ───────────────────────────────────────────────────────
export const filesAPI = {
  list: () => api.get("/api/files/"),
  download: (id) =>
    api.get(`/api/files/download/${id}`, { responseType: "blob" }),

  delete: (id) => {
    if (!id) return Promise.reject("No ID provided");
    return api.delete(`/api/files/delete/${id}`); 
  },

  extendSession: () => api.post("/api/files/upload/extend-session"),

  upload: (formData, onProgress) => {
    const isInstant = formData.get("instant_encrypt") === "true";
    return api.post("/api/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: isInstant ? "blob" : "json", 
      timeout: 0,
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
  },

  share: (id, expiresInHours = 24) =>
    api.post(`/api/files/share/${id}`, { expires_in_hours: expiresInHours }),

  getShared: (token) => api.get(`/api/files/shared/${token}`),

  getFile: (id) => api.get(`/api/files/${id}`),
};

export default api;