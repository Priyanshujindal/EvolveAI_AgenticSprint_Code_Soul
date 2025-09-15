import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DailyCheckin from './pages/DailyCheckin';
import UploadReport from './pages/UploadReport';
import ChatbotPage from './pages/ChatbotPage';
import Footer from './components/Footer';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/daily-checkin" element={<ProtectedRoute><DailyCheckin /></ProtectedRoute>} />
          <Route path="/upload-report" element={<ProtectedRoute><UploadReport /></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><ChatbotPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}


