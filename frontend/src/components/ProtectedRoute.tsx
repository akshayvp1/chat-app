import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useAppDispatch } from "../redux/hooks";
import { setUser } from "../redux/slices/authSlice";
import type { User } from "../types/types";

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
        const res = await axiosInstance.get<{ success: boolean; user: User }>(
          "/user/check"
        );
        const user = res.data.user;
        // Normalize: backend may return userId instead of _id
        dispatch(setUser({ ...user, _id: user._id ?? (user as any).userId }));
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