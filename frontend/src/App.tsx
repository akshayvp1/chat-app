import "./index.css";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute"; // adjust path as needed
import Chat from "./components/user/chat";
import Login from "./components/user/signIn";
import Otp from "./components/user/otp";
import ResetPassword from "./components/user/resetPassword";
import Forgot from "./components/user/forgotPassword";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/verify-otp" element={<Otp />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/forgot-password" element={<Forgot />} />


        <Route path="/login" element={<Login />} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
