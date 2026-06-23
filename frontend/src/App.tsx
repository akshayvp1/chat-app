import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Authentication from './components/user/signIn';
import "./index.css";
import Otp from './components/user/otp';
import Forgot from './components/user/forgotPassword';
import ResetPassword from './components/user/resetPassword';
import Chat from './components/user/chat';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Default route redirects to /login */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Authentication />
            </PublicRoute>
          }
        />
        <Route path="/verify-otp" element={<Otp />} />
        <Route path="/forgot-password" element={<Forgot />}/>
        <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />

        


      </Routes>
    </BrowserRouter>
  );
}

export default App;