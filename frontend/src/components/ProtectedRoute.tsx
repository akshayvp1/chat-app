import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

type Props = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axiosInstance.get("/user/check");
        setAuthenticated(true);
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;