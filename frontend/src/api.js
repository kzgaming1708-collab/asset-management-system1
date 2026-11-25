import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export function clearSession() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// Gắn access token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gặp 401 -> thử làm mới token một lần rồi gọi lại request cũ
let refreshing = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const url = original?.url || "";
    const isAuthCall =
      url.includes("/auth/login") || url.includes("/auth/refresh") || url.includes("/auth/google");

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isAuthCall &&
      localStorage.getItem("refresh")
    ) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios
            .post(`${api.defaults.baseURL}/auth/refresh/`, {
              refresh: localStorage.getItem("refresh"),
            })
            .finally(() => {
              refreshing = null;
            });
        }
        const { data } = await refreshing;
        localStorage.setItem("access", data.access);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (refreshError) {
        clearSession();
        window.location.assign("/login");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// --- Xử lý lỗi từ DRF -------------------------------------------------------

// Lỗi theo từng ô nhập: { code: "Mã này đã tồn tại.", ... }
export function fieldErrors(err) {
  const data = err?.response?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const result = {};
  Object.entries(data).forEach(([field, message]) => {
    if (field === "detail" || field === "non_field_errors") return;
    result[field] = Array.isArray(message) ? message.join(" ") : String(message);
  });
  return result;
}

// Một câu mô tả lỗi để hiện trong toast hoặc đầu form
export function errorMessage(err) {
  if (!err?.response) return "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.";
  const { status, data } = err.response;
  if (status >= 500) return "Máy chủ gặp lỗi. Thử lại sau ít phút.";
  if (typeof data === "string") return data.slice(0, 200);
  if (data?.detail) return data.detail;
  if (Array.isArray(data?.non_field_errors)) return data.non_field_errors.join(" ");
  const fields = fieldErrors(err);
  const first = Object.values(fields)[0];
  return first || "Yêu cầu không hợp lệ.";
}

// Lỗi không gắn với ô nào (để hiện đầu form). Rỗng nếu lỗi đã hiện ở từng ô.
export function formError(err) {
  if (Object.keys(fieldErrors(err)).length > 0 && err.response?.status < 500) {
    const data = err.response.data;
    if (!data?.detail && !data?.non_field_errors) return "";
  }
  return errorMessage(err);
}

export default api;
