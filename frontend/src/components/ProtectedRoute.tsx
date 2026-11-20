import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useAppDispatch } from "../redux/hooks";
import { setUser } from "../redux/slices/authSlice";
import type { User } from "../types/types";
import { normalizeText } from "../utils/validation";

type AuthCheckUser = Partial<User> & { userId?: string };

type AuthCheckResponse = {
  success: boolean;
  user?: AuthCheckUser | null;
};

type Props = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axiosInstance.get<AuthCheckResponse>("/user/check");
        const checkedUser = res.data.user ?? {};
        const id = normalizeText(checkedUser._id ?? checkedUser.userId ?? "");

        if (!res.data.success || !id) {
          throw new Error("Unauthorized");
        }

        const user: User = {
          ...checkedUser,
          _id: id,
          name: normalizeText(checkedUser.name ?? ""),
          email: normalizeText(checkedUser.email ?? ""),
          phone: normalizeText(checkedUser.phone ?? ""),
        };

        dispatch(setUser(user));
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [dispatch]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;