import axiosInstance from "../../utils/axiosInstance";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

const authService = {

  // Register
  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const { data } = await axiosInstance.post<RegisterResponse>("/user/register", payload);
    return data;
  },

  // Login
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await axiosInstance.post<LoginResponse>("/user/login", payload);
    // Store tokens
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    return data;
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/login";
  },

  // Get current logged-in user
  getMe: async () => {
    const { data } = await axiosInstance.get("/auth/me");
    return data;
  },

};

export default authService;