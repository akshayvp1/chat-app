import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Authentication from './components/user/signIn';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route redirects to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Authentication />} />


      </Routes>
    </BrowserRouter>
  );
}

export default App;