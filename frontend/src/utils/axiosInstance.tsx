import axios from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";

const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  timeout: 10000,
  withCredentials: true, // send/receive httpOnly cookies on every request
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Response Interceptor ──────────────────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest.url || "";

    const skipUrls = [
      "/user/check",
      "/user/refresh-token",
      "/user/login",
      "/user/logout",
    ];

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !skipUrls.some((item) => url.includes(item))
    ) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/user/refresh-token`,
          {},
          { withCredentials: true },
        );

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
export default axiosInstance;
