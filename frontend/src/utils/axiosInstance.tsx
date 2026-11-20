import axios from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export function resolveFileUrl(url?: string): string {
  if (!url) return "";

  const trimmed = url.trim();

  if (!trimmed) return "";
  if (/^(blob:|data:|https?:\/\/)/i.test(trimmed)) return trimmed;

  const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  if (trimmed.startsWith("/")) return `${apiOrigin}${trimmed}`;

  return `${apiOrigin}/${trimmed}`;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // IMPORTANT for cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── RESPONSE INTERCEPTOR ─────────────────────────────
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";

    const skipUrls = ["/user/login", "/user/logout", "/user/refresh-token"];

    const isSkipUrl = skipUrls.some((item) => url.includes(item));

    // ❗ only handle 401 for non-skip requests
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isSkipUrl
    ) {
      originalRequest._retry = true;

      try {
        // ✅ refresh token call (IMPORTANT: same instance)
        await axiosInstance.post("/user/refresh-token");

        // retry original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // refresh failed → logout user
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
