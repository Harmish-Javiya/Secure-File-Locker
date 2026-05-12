import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

// ==========================================
// 1. IN-MEMORY TOKEN STORAGE 
// ==========================================
let accessToken = null;
let refreshToken = null;

// 👇 THIS IS THE EXACT LINE YOUR APP WAS LOOKING FOR! 👇
export const setTokens = (access, refresh) => {
  accessToken = access;
  refreshToken = refresh;
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};

// ==========================================
// 2. AXIOS INSTANCE SETUP
// ==========================================
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==========================================
// 3. REQUEST INTERCEPTOR
// ==========================================
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// 4. RESPONSE INTERCEPTOR
// ==========================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, null, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });

        const newAccessToken = res.data.data.access_token;
        accessToken = newAccessToken; 

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ==========================================
// 5. AUTHENTICATION API METHODS
// ==========================================
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  mfaSetup: () => api.post("/auth/mfa/setup"),
  mfaVerify: (token) => api.post("/auth/mfa/verify", { token }),
  mfaDisable: (token) => api.post("/auth/mfa/disable", { token }),
};

// ==========================================
// 6. FILE VAULT API METHODS
// ==========================================
export const filesAPI = {
  upload: (formData) => api.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  list: () => api.get("/files/"),
  download: (id) => api.get(`/files/download/${id}`, { responseType: "blob" }),
  delete: (id) => api.delete(`/files/delete/${id}`),
  share: (id, hours) => api.post(`/files/share/${id}`, { expires_in_hours: hours }),
  getShared: (token) => api.get(`/files/shared/${token}`),
};

export default api;